import { CARDS } from "../../tarot/deck";
import { Xoshiro128 } from "../../tarot/rng";
import { composeFollowUpAnswer, composeInterpretation } from "../fallback";
import { ProviderError, type GenerateRequest, type GenerateResult, type LLMProvider } from "../types";

/** Per-attempt probabilities of each failure mode (they are mutually exclusive per attempt). */
export interface FaultProfile {
  invalidJson: number;
  schemaViolation: number;
  wrongReference: number;
  hallucinatedCard: number;
  policyViolation: number;
  transientError: number;
  /**
   * Multiplier applied to all failure probabilities when the request carries
   * validation feedback (a repair attempt). 1 = feedback does not help;
   * 0.5 = the model fixes half of what it would otherwise get wrong.
   */
  repairFactor: number;
  latencyMs: [number, number];
}

export type FaultMode = Exclude<keyof FaultProfile, "repairFactor" | "latencyMs">;
export const FAULT_MODES: FaultMode[] = [
  "invalidJson",
  "schemaViolation",
  "wrongReference",
  "hallucinatedCard",
  "policyViolation",
  "transientError",
];

export const FAULT_PROFILES = {
  clean: { invalidJson: 0, schemaViolation: 0, wrongReference: 0, hallucinatedCard: 0, policyViolation: 0, transientError: 0, repairFactor: 1, latencyMs: [0, 0] },
  /** Failure mix used for the demo engine and the default simulation (≈ 35% of attempts fail). */
  flaky: { invalidJson: 0.08, schemaViolation: 0.06, wrongReference: 0.08, hallucinatedCard: 0.07, policyViolation: 0.03, transientError: 0.03, repairFactor: 0.6, latencyMs: [350, 900] },
  harsh: { invalidJson: 0.15, schemaViolation: 0.12, wrongReference: 0.12, hallucinatedCard: 0.12, policyViolation: 0.05, transientError: 0.04, repairFactor: 1, latencyMs: [0, 0] },
} satisfies Record<string, FaultProfile>;

const isRepairAttempt = (request: GenerateRequest) =>
  request.messages.at(-1)?.content.startsWith("Your previous reply was rejected") ?? false;

/**
 * A simulated LLM for tests, local development, the reliability simulator and the
 * demo engine. It writes a correct answer from the request's structured hints and
 * then corrupts it the way real models fail — truncated JSON, missing fields,
 * swapped card references, invented cards, overconfident claims — at configurable
 * rates, deterministically for a given seed.
 */
export class FaultInjectionProvider implements LLMProvider {
  readonly id = "fault-injection";
  readonly model: string;
  readonly supportsJsonSchema = false;
  readonly log: FaultMode[] = [];
  private readonly rng: Xoshiro128;

  constructor(
    private readonly profile: FaultProfile = FAULT_PROFILES.flaky,
    seed = "fault-injection",
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    this.rng = Xoshiro128.fromSeed(seed);
    this.model = "simulated-llm";
  }

  private uniform(): number {
    return this.rng.nextU32() / 2 ** 32;
  }

  private pick<T>(items: readonly T[]): T {
    return items[this.rng.nextInt(items.length)];
  }

  private chooseMode(repair: boolean): FaultMode | null {
    const scale = repair ? this.profile.repairFactor : 1;
    let u = this.uniform();
    for (const mode of FAULT_MODES) {
      const p = this.profile[mode] * scale;
      if (u < p) return mode;
      u -= p;
    }
    return null;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const [lo, hi] = this.profile.latencyMs;
    if (hi > 0) await this.sleep(lo + this.uniform() * (hi - lo));
    const mode = this.chooseMode(isRepairAttempt(request));
    if (mode) this.log.push(mode);
    if (mode === "transientError") throw new ProviderError("simulated upstream error (503)", true, "server");

    const hints = request.hints;
    if (!hints || hints.kind === "memory") {
      return { text: "The user asked about the cards in their reading and how they relate to their situation.", usage: { promptTokens: 200, completionTokens: 30 } };
    }

    const drawn = new Set(hints.draw.cards.map((c) => c.cardId));
    const foreign = this.pick(CARDS.filter((c) => !drawn.has(c.id)));
    const value = structuredClone(
      hints.kind === "reading" ? composeInterpretation(hints) : composeFollowUpAnswer({ draw: hints.draw, message: hints.message }),
    ) as unknown as Record<string, unknown>;
    const textKey = hints.kind === "reading" ? "summary" : "answer";

    switch (mode) {
      case "schemaViolation":
        if (hints.kind === "reading") delete value[this.pick(["advice", "caution", "themes", "summary"])];
        else value.answer = 42;
        break;
      case "wrongReference":
        if (hints.kind === "reading") {
          const cards = value.cards as Array<Record<string, unknown>>;
          const variant = this.rng.nextInt(3);
          if (variant === 0) cards[0].orientation = cards[0].orientation === "upright" ? "reversed" : "upright";
          else if (variant === 1 && cards.length > 1) [cards[0].position, cards[1].position] = [cards[1].position, cards[0].position];
          else cards.pop();
        } else {
          value.referencedCards = [{ cardId: foreign.id, position: "past" }];
        }
        break;
      case "hallucinatedCard":
        value[textKey] = `${String(value[textKey])} Notice how ${foreign.arcana === "major" ? foreign.name : `the ${foreign.name}`} also colours what is coming.`;
        break;
      case "policyViolation":
        value[textKey] = `${String(value[textKey])} You will definitely get what you are hoping for.`;
        break;
    }

    let text = JSON.stringify(value);
    if (mode === "invalidJson") {
      text = this.rng.nextInt(2) === 0 ? text.slice(0, Math.floor(text.length * 0.6)) : `Here is your reading: ${String(value[textKey])}`;
    }
    const promptTokens = Math.round(request.messages.reduce((n, m) => n + m.content.length, 0) / 4);
    return { text, usage: { promptTokens, completionTokens: Math.round(text.length / 4) } };
  }
}
