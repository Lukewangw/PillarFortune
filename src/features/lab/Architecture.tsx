import { ArrowDown, ArrowRight } from "lucide-react";
import { codeLink } from "../../lib/config";

const STAGES = [
  {
    n: 1,
    title: "Route",
    body: "An int8 logistic-regression router (TF-IDF over words, bigrams, CJK and char n-grams) predicts focus and safety in ~0.1 ms, in the browser and at the edge.",
    code: "src/core/router/router.ts",
    tag: "trained model",
  },
  {
    n: 2,
    title: "Draw",
    body: "xoshiro128** + Fisher–Yates from a 128-bit seed; the user picks slots. The server recomputes the cards from (seed, picks) — the LLM never chooses a card.",
    code: "src/core/tarot/engine.ts",
    tag: "deterministic",
  },
  {
    n: 3,
    title: "Ground & prompt",
    body: "The prompt carries only the drawn cards, their positions and knowledge-base meanings, plus a per-draw JSON Schema whose card ids are enums.",
    code: "src/core/llm/prompts.ts",
    tag: "retrieval",
  },
  {
    n: 4,
    title: "Generate",
    body: "Llama 3.3 70B on Workers AI with schema-constrained decoding; if the constraint cannot be met the next attempt degrades to unconstrained generation.",
    code: "src/core/llm/providers/workersAI.ts",
    tag: "LLM",
  },
  {
    n: 5,
    title: "Validate",
    body: "JSON extraction → normalization → JSON Schema → card references (id, position, orientation) → undrawn-card mentions (EN + 中文) → tone & directive policy.",
    code: "src/core/llm/validate.ts",
    tag: "guardrails",
  },
  {
    n: 6,
    title: "Repair or fall back",
    body: "Rejected outputs go back with the exact JSON-pointer errors, at a lower temperature, up to 3 calls within a deadline; otherwise a knowledge-base reading that passes the same validator.",
    code: "src/core/llm/generate.ts",
    tag: "bounded retries",
  },
];

export function Architecture() {
  return (
    <div>
      <ol className="grid gap-3 md:grid-cols-3">
        {STAGES.map((stage, i) => (
          <li key={stage.n} className="panel relative p-5">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold-400/40 text-sm text-gold-200">{stage.n}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-mist-400">{stage.tag}</span>
            </div>
            <h3 className="mt-3 text-lg font-medium text-mist-100">{stage.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-mist-400">{stage.body}</p>
            <a href={codeLink(stage.code)} target="_blank" rel="noreferrer" className="mt-3 inline-block font-mono text-[11px] text-gold-300/80 hover:text-gold-200">
              {stage.code}
            </a>
            {i < STAGES.length - 1 && i % 3 !== 2 && (
              <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-gold-400/50 md:block" />
            )}
            {i < STAGES.length - 1 && <ArrowDown className="absolute -bottom-3 left-1/2 z-10 h-4 w-4 -translate-x-1/2 text-gold-400/50 md:hidden" />}
          </li>
        ))}
      </ol>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="panel p-5 text-sm leading-relaxed text-mist-400">
          <p className="font-medium text-mist-100">Sessions — Durable Objects</p>
          One object per reading holds the question, the drawn cards, the summary, the recent turns and an LLM-compressed memory of older ones, and processes follow-ups
          strictly one at a time, so concurrent messages can never interleave. Sessions expire after a week.{" "}
          <a className="font-mono text-[11px] text-gold-300/80 hover:text-gold-200" href={codeLink("worker/src/session.ts")} target="_blank" rel="noreferrer">
            worker/src/session.ts
          </a>
        </div>
        <div className="panel p-5 text-sm leading-relaxed text-mist-400">
          <p className="font-medium text-mist-100">Monitoring & cost guards — D1</p>
          Every request writes a trace row (outcome, attempts, issue codes, latency, tokens) that feeds the live metrics below; a daily model-call budget and per-network limits
          degrade gracefully to the knowledge-base composer instead of failing.{" "}
          <a className="font-mono text-[11px] text-gold-300/80 hover:text-gold-200" href={codeLink("worker/src/metrics.ts")} target="_blank" rel="noreferrer">
            worker/src/metrics.ts
          </a>
        </div>
      </div>
    </div>
  );
}
