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
      <ol className="grid border-t border-ink sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage, i) => (
          <li
            key={stage.n}
            className={`border-b border-rule py-5 sm:pr-5 ${i % 2 === 1 ? "sm:border-l sm:pl-5" : "sm:border-l-0 sm:pl-0"} ${
              i % 3 === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-5"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[0.8rem] text-accent">{String(stage.n).padStart(2, "0")}</span>
              <span className="label">{stage.tag}</span>
            </div>
            <h3 className="mt-2 text-[1.3rem] leading-tight text-ink">{stage.title}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">{stage.body}</p>
            <a href={codeLink(stage.code)} target="_blank" rel="noreferrer" className="mt-3 inline-block font-mono text-[0.7rem] text-ink-3 underline decoration-rule-2 underline-offset-4 hover:text-accent">
              {stage.code}
            </a>
          </li>
        ))}
      </ol>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div className="border-t border-rule pt-4">
          <p className="label !text-ink">Sessions · Durable Objects</p>
          <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">
            One object per reading holds the question, the drawn cards, the summary, the recent turns and an LLM-compressed memory of older ones, and processes follow-ups
            strictly one at a time, so concurrent messages can never interleave. Sessions expire after a week.{" "}
            <a className="font-mono text-[0.7rem] text-ink-3 underline decoration-rule-2 underline-offset-4 hover:text-accent" href={codeLink("worker/src/session.ts")} target="_blank" rel="noreferrer">
              worker/src/session.ts
            </a>
          </p>
        </div>
        <div className="border-t border-rule pt-4">
          <p className="label !text-ink">Monitoring &amp; cost guards · D1</p>
          <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">
            Every request writes a trace row (outcome, attempts, issue codes, latency, tokens) that feeds the live metrics below; a daily model-call budget and per-network
            limits degrade gracefully to the knowledge-base composer instead of failing.{" "}
            <a className="font-mono text-[0.7rem] text-ink-3 underline decoration-rule-2 underline-offset-4 hover:text-accent" href={codeLink("worker/src/metrics.ts")} target="_blank" rel="noreferrer">
              worker/src/metrics.ts
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
