/**
 * Offline evaluation harness for the interpretation pipeline.
 *
 * Runs every case in ml/evals/datasets/readings.jsonl through the *production*
 * code path (router → deterministic draw → prompt → generate → validate →
 * repair → fallback, then grounded follow-ups) under several ablation variants,
 * and writes per-case records plus a summary and a Markdown report.
 *
 *   # Workers AI (the production model), via the REST API:
 *   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run eval -- --provider workers-ai
 *   # Any OpenAI-compatible endpoint (OpenAI, vLLM, llama.cpp, Ollama…):
 *   OPENAI_BASE_URL=http://localhost:8080/v1 OPENAI_API_KEY=… npm run eval -- --provider openai --model qwen2.5-7b-instruct
 *   # Simulated model with injected faults (no network; exercises the harness itself):
 *   npm run eval -- --provider fault-injection
 *
 * Options: --variants v1-baseline,v2-single,v2-repair,v2-constrained  --limit N  --concurrency 4  --out <dir>  --publish
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { AttemptRecord, GenerationPolicy } from "../../src/core/llm/generate";
import { answerFollowUp, interpretDraw } from "../../src/core/llm/pipeline";
import { buildBaselineReadingMessages } from "../../src/core/llm/prompts";
import { checkPolicy } from "../../src/core/llm/policy";
import { FAULT_PROFILES, FaultInjectionProvider, type FaultProfile } from "../../src/core/llm/providers/faultInjection";
import { OpenAICompatibleProvider } from "../../src/core/llm/providers/openaiCompatible";
import { DEFAULT_WORKERS_AI_MODEL, WorkersAIProvider, workersAIRestRunner } from "../../src/core/llm/providers/workersAI";
import { Tracer } from "../../src/core/llm/trace";
import type { ChatMessage, LLMProvider, Outcome } from "../../src/core/llm/types";
import { route } from "../../src/core/orchestrate";
import { QuestionRouter, type RouterModelJSON } from "../../src/core/router/router";
import { getCard } from "../../src/core/tarot/deck";
import { drawCards, type Draw } from "../../src/core/tarot/engine";
import { findCardMentions, findForeignCardMentions } from "../../src/core/tarot/mentions";
import type { SpreadId } from "../../src/core/tarot/spreads";
import { summarize, toMarkdown, type CaseRecord } from "./metrics";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

interface EvalCase {
  id: string;
  question: string;
  spread: SpreadId;
  seed: string;
  focus: string;
  tags: string[];
  followUps: string[];
}

export const VARIANTS: Record<string, { label: string; baseline?: boolean; policy?: Partial<GenerationPolicy> }> = {
  "v1-baseline": { label: "Original v1 prompt, single call, JSON.parse only", baseline: true },
  "v2-single": { label: "v2 grounded prompt + validator, 1 attempt", policy: { maxAttempts: 1, constrained: false } },
  "v2-repair": { label: "v2 + validation-feedback repair, ≤3 attempts", policy: { maxAttempts: 3, constrained: false } },
  "v2-constrained": { label: "v2 + repair + JSON-Schema constrained decoding (production)", policy: { maxAttempts: 3, constrained: true } },
};

const { values: args } = parseArgs({
  options: {
    provider: { type: "string", default: "fault-injection" },
    model: { type: "string" },
    profile: { type: "string", default: "flaky" },
    variants: { type: "string", default: Object.keys(VARIANTS).join(",") },
    limit: { type: "string" },
    concurrency: { type: "string", default: "4" },
    out: { type: "string" },
    publish: { type: "boolean", default: false },
  },
});

function providerFactory(): (caseId: string) => LLMProvider {
  switch (args.provider) {
    case "workers-ai": {
      const account = process.env.CLOUDFLARE_ACCOUNT_ID;
      const token = process.env.CLOUDFLARE_API_TOKEN;
      if (!account || !token) throw new Error("Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI: Read permission).");
      const provider = new WorkersAIProvider(workersAIRestRunner(account, token), args.model ?? DEFAULT_WORKERS_AI_MODEL);
      return () => provider;
    }
    case "openai": {
      if (!args.model) throw new Error("--model is required for --provider openai");
      const provider = new OpenAICompatibleProvider({
        baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY,
        model: args.model,
      });
      return () => provider;
    }
    case "fault-injection": {
      const profile = FAULT_PROFILES[args.profile as keyof typeof FAULT_PROFILES] as FaultProfile | undefined;
      if (!profile) throw new Error(`unknown --profile ${args.profile}`);
      // A fresh, seeded simulator per case keeps runs reproducible regardless of scheduling.
      return (caseId) => new FaultInjectionProvider({ ...profile, latencyMs: [0, 0] }, `eval:${caseId}`, async () => {});
    }
    default:
      throw new Error(`unknown --provider ${args.provider}`);
  }
}

const loadJsonl = <T>(path: string): T[] =>
  readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);

function allStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

/** v1 behaviour: one call, JSON.parse, raw-text fallback; audited post hoc with the v2 checks. */
async function runBaseline(provider: LLMProvider, c: EvalCase, draw: Draw, focus: string) {
  const started = performance.now();
  let text = "";
  let error: string | undefined;
  let usage;
  try {
    const result = await provider.generate({
      messages: buildBaselineReadingMessages({ draw, question: c.question, focus: focus as never }),
      maxTokens: 500,
      temperature: 0.7,
      hints: { kind: "reading", draw, question: c.question, focus: focus as never },
    });
    text = result.text;
    usage = result.usage;
  } catch (e) {
    error = (e as Error).message;
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const shipped = parsed ?? { summary: text.slice(0, 260) };
  const strings = allStrings(shipped);
  const drawnIds = draw.cards.map((d) => d.cardId);
  const mentioned = new Set(strings.flatMap((s) => findCardMentions(s).map((m) => m.cardId)));
  return {
    latencyMs: performance.now() - started,
    usage,
    error,
    parsed: parsed !== null,
    hallucinatedCards: strings.some((s) => findForeignCardMentions(s, drawnIds).length > 0),
    policyViolation: strings.some((s) => checkPolicy(s, "/").length > 0),
    allCardsMentioned: drawnIds.every((id) => mentioned.has(id)),
    raw: text.slice(0, 4000),
  };
}

function attemptSummary(attempts: AttemptRecord[]) {
  return attempts.map((a) => ({
    verdict: a.verdict,
    latencyMs: Math.round(a.latencyMs),
    constrained: a.constrained,
    codes: [...a.issues.map((i) => i.code), ...(a.providerError ? [`provider_${a.providerError.code}`] : [])],
    usage: a.usage,
  }));
}

async function runCase(makeProvider: (id: string) => LLMProvider, router: QuestionRouter, c: EvalCase, variant: string): Promise<CaseRecord> {
  const spec = VARIANTS[variant];
  const provider = makeProvider(`${c.id}:${variant}`);
  const routed = route(router, c.question, c.focus === "auto" ? "auto" : (c.focus as never));
  const draw = drawCards({ seed: c.seed, spread: c.spread });
  const base = { caseId: c.id, variant, tags: c.tags, spread: c.spread, focus: routed.focus, safety: routed.safety };

  if (routed.safety === "crisis" && routed.gate === "hard") {
    return { ...base, kind: "blocked" };
  }

  if (spec.baseline) {
    const reading = await runBaseline(provider, c, draw, routed.focus);
    return { ...base, kind: "baseline", baseline: reading };
  }

  const tracer = new Tracer("reading");
  const started = performance.now();
  const result = await interpretDraw(provider, { draw, question: c.question, focus: routed.focus, safety: routed.safety }, {
    tracer,
    policy: { ...spec.policy, backoffMs: () => 250 },
  });
  const reading = {
    outcome: result.outcome as Outcome,
    fallbackReason: result.fallbackReason,
    latencyMs: performance.now() - started,
    attempts: attemptSummary(result.attempts),
  };

  // Follow-ups run through the same session logic as the Durable Object.
  const followUps = [];
  const history: ChatMessage[] = [];
  for (const message of c.followUps) {
    const fTracer = new Tracer("followup");
    const t0 = performance.now();
    const f = await answerFollowUp(
      provider,
      { draw, question: c.question, summary: result.interpretation.summary, memory: "", history: [...history], message },
      { tracer: fTracer, policy: { ...spec.policy, backoffMs: () => 250 } },
    );
    history.push({ role: "user", content: message }, { role: "assistant", content: f.answer.answer });
    followUps.push({
      message,
      outcome: f.outcome as Outcome,
      latencyMs: performance.now() - t0,
      attempts: attemptSummary(f.attempts),
      answer: f.answer.answer.slice(0, 600),
      referencedCards: f.answer.referencedCards.map((r) => getCard(r.cardId).name),
    });
  }

  return {
    ...base,
    kind: "pipeline",
    reading,
    followUps,
    sample: { summary: result.interpretation.summary, cards: draw.cards.map((d) => `${d.positionLabel}: ${d.name} (${d.orientation})`) },
  };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const cases = loadJsonl<EvalCase>(join(here, "datasets/readings.jsonl")).slice(0, args.limit ? Number(args.limit) : undefined);
  const variants = args.variants!.split(",").map((v) => v.trim());
  for (const v of variants) if (!VARIANTS[v]) throw new Error(`unknown variant ${v}`);
  const router = new QuestionRouter(JSON.parse(readFileSync(join(root, "src/core/router/model.json"), "utf8")) as RouterModelJSON);
  const makeProvider = providerFactory();
  const sample = makeProvider("probe");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = args.out ?? join(here, "runs", `${stamp}-${args.provider}`);
  mkdirSync(outDir, { recursive: true });
  const resultsPath = join(outDir, "results.jsonl");
  writeFileSync(resultsPath, "");

  console.log(`Evaluating ${cases.length} cases × ${variants.length} variants on ${sample.id}/${sample.model} → ${outDir}`);
  const records: CaseRecord[] = [];
  for (const variant of variants) {
    const started = performance.now();
    const batch = await pool(cases, Number(args.concurrency), async (c) => {
      const record = await runCase(makeProvider, router, c, variant);
      appendFileSync(resultsPath, `${JSON.stringify(record)}\n`);
      return record;
    });
    records.push(...batch);
    console.log(`  ${variant.padEnd(16)} done in ${((performance.now() - started) / 1000).toFixed(1)} s`);
  }

  const summary = summarize(records, {
    provider: sample.id,
    model: sample.model,
    profile: args.provider === "fault-injection" ? args.profile : undefined,
    date: new Date().toISOString(),
    cases: cases.length,
    followUps: cases.reduce((n, c) => n + c.followUps.length, 0),
    variants: Object.fromEntries(variants.map((v) => [v, VARIANTS[v].label])),
  });
  writeFileSync(join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(join(outDir, "report.md"), toMarkdown(summary));
  if (args.publish) {
    const name = args.provider === "fault-injection" ? "eval-simulated.json" : "eval-latest.json";
    writeFileSync(join(here, "results", name), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`Published summary to ml/evals/results/${name}`);
  }
  console.log(toMarkdown(summary));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
