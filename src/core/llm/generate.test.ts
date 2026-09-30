import { describe, expect, it, vi } from "vitest";
import { drawCards } from "../tarot/engine";
import { composeInterpretation } from "./fallback";
import { generateValidated } from "./generate";
import { interpretDraw } from "./pipeline";
import { FAULT_PROFILES, FaultInjectionProvider } from "./providers/faultInjection";
import { buildInterpretationSchema } from "./schemas";
import { Tracer } from "./trace";
import { ProviderError, type GenerateRequest, type LLMProvider } from "./types";
import { validateInterpretation } from "./validate";

const draw = drawCards({ seed: "generate-fixture", spread: "three" });
const schema = buildInterpretationSchema(draw);
const valid = JSON.stringify(composeInterpretation({ draw, question: "How can I grow at work?", focus: "career" }));
const invalid = JSON.stringify({ summary: "too short" });

/** A provider that replays a script of replies (strings) or errors. */
function scripted(script: Array<string | ProviderError>, supportsJsonSchema = false) {
  const requests: GenerateRequest[] = [];
  const provider: LLMProvider = {
    id: "scripted",
    model: "script",
    supportsJsonSchema,
    async generate(request) {
      requests.push(request);
      const next = script[Math.min(requests.length - 1, script.length - 1)];
      if (next instanceof ProviderError) throw next;
      return { text: next };
    },
  };
  return { provider, requests };
}

function run(provider: LLMProvider, policy = {}) {
  const sleep = vi.fn(async () => {});
  const promise = generateValidated({
    provider,
    messages: [{ role: "user", content: "interpret" }],
    schema,
    validate: (v) => validateInterpretation(v, draw, schema),
    fallback: () => composeInterpretation({ draw, question: "fallback", focus: "general" }),
    policy,
    tracer: new Tracer("test"),
    sleep,
  });
  return { promise, sleep };
}

describe("generateValidated", () => {
  it("accepts a valid first attempt", async () => {
    const { provider } = scripted([valid]);
    const result = await run(provider).promise;
    expect(result.outcome).toBe("accepted");
    expect(result.attempts).toHaveLength(1);
  });

  it("repairs with the exact validation errors fed back to the model", async () => {
    const { provider, requests } = scripted([invalid, valid]);
    const result = await run(provider).promise;
    expect(result.outcome).toBe("repaired");
    expect(result.attempts.map((a) => a.verdict)).toEqual(["rejected", "accepted"]);
    const repair = requests[1].messages;
    expect(repair.at(-2)).toEqual({ role: "assistant", content: invalid });
    expect(repair.at(-1)?.content).toMatch(/\/summary: too short/);
    expect(repair.at(-1)?.content).toMatch(/\/cards: is required/);
    expect(requests[1].temperature).toBeLessThan(requests[0].temperature);
  });

  it("stops after maxAttempts and serves the deterministic fallback", async () => {
    const { provider, requests } = scripted(["not json at all"]);
    const result = await run(provider, { maxAttempts: 3 }).promise;
    expect(result.outcome).toBe("fallback");
    expect(result.fallbackReason).toBe("validation_exhausted");
    expect(requests).toHaveLength(3);
    expect(validateInterpretation(result.value, draw, schema).issues).toEqual([]);
  });

  it("backs off and retries transient provider errors", async () => {
    const { provider } = scripted([new ProviderError("503", true, "server"), valid]);
    const { promise, sleep } = run(provider);
    const result = await promise;
    expect(result.outcome).toBe("repaired");
    expect(sleep).toHaveBeenCalledWith(250);
    expect(result.attempts[0]).toMatchObject({ verdict: "provider_error", providerError: { code: "server" } });
  });

  it("falls back immediately on a fatal provider error", async () => {
    const { provider, requests } = scripted([new ProviderError("quota", false, "rate_limited"), valid]);
    const result = await run(provider).promise;
    expect(result).toMatchObject({ outcome: "fallback", fallbackReason: "provider_rate_limited" });
    expect(requests).toHaveLength(1);
  });

  it("drops decode-time constraints after a constraint failure", async () => {
    const { provider, requests } = scripted([new ProviderError("JSON Mode couldn't be met", true, "constraint"), valid], true);
    const result = await run(provider).promise;
    expect(result.outcome).toBe("repaired");
    expect(requests[0].jsonSchema).toBeDefined();
    expect(requests[1].jsonSchema).toBeUndefined();
    // The decoding schema keeps structure (enums) but not content limits.
    expect(JSON.stringify(requests[0].jsonSchema)).toContain(draw.cards[0].cardId);
    expect(JSON.stringify(requests[0].jsonSchema)).not.toContain("minLength");
  });

  it("resamples without feedback when feedback is disabled", async () => {
    const { provider, requests } = scripted([invalid, valid]);
    await run(provider, { feedback: false }).promise;
    expect(requests[1].messages).toEqual(requests[0].messages);
  });

  it("respects the deadline", async () => {
    const { provider, requests } = scripted([invalid]);
    const result = await run(provider, { deadlineMs: -1 }).promise;
    expect(result).toMatchObject({ outcome: "fallback", fallbackReason: "deadline_exceeded" });
    expect(requests).toHaveLength(0);
  });
});

describe("pipeline under fault injection", () => {
  it("always ships a valid interpretation, and retries cut the fallback rate", async () => {
    const outcomes = { accepted: 0, repaired: 0, fallback: 0 };
    const n = 300;
    for (let i = 0; i < n; i++) {
      const d = drawCards({ seed: `fi-${i}`, spread: (["single", "three", "cross"] as const)[i % 3] });
      const provider = new FaultInjectionProvider(FAULT_PROFILES.harsh, `fi-${i}`, async () => {});
      const result = await interpretDraw(
        provider,
        { draw: d, question: "What should I know about my path this season?", focus: "growth", safety: "none" },
        { tracer: new Tracer("reading"), policy: { backoffMs: () => 0 } },
      );
      expect(validateInterpretation(result.interpretation, d, buildInterpretationSchema(d)).issues).toEqual([]);
      outcomes[result.outcome as keyof typeof outcomes]++;
    }
    // With a ~60% per-attempt failure rate, first-try acceptance is ~40%; three attempts leave ~6-22% on the fallback.
    expect(outcomes.accepted / n).toBeGreaterThan(0.3);
    expect(outcomes.accepted / n).toBeLessThan(0.5);
    expect(outcomes.fallback / n).toBeLessThan(0.3);
    expect(outcomes.repaired).toBeGreaterThan(0);
  });
});
