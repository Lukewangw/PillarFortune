import { useEffect, useState } from "react";
import type { Trace } from "../../core/llm/trace";

type StepState = "pending" | "active" | "done" | "warn";

const STEPS = [
  { id: "route", label: "Route the question", detail: "focus and safety classifier" },
  { id: "draw", label: "Verify the draw", detail: "recompute the cards from seed + picks" },
  { id: "generate", label: "Interpret the cards", detail: "" },
  { id: "validate", label: "Validate the answer", detail: "JSON Schema · card references · undrawn cards · tone" },
];

const MARK: Record<StepState, string> = { pending: "·", active: "", done: "✓", warn: "↻" };

/** The reading pipeline as a running log while a request is in flight; settles on the real trace when it returns. */
export function PipelineProgress({ modelLabel, trace }: { modelLabel: string; trace: Trace | null }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (trace) return;
    const timer = setInterval(() => setTick((t) => t + 1), 450);
    return () => clearInterval(timer);
  }, [trace]);

  const attempts = trace?.spans.filter((s) => s.name === "llm.attempt") ?? [];
  const rejected = attempts.filter((s) => s.attrs.verdict !== "accepted").length;
  const fallback = trace?.spans.some((s) => s.name === "fallback.compose");

  const states: StepState[] = trace
    ? ["done", "done", rejected > 0 ? "warn" : "done", fallback ? "warn" : "done"]
    : [tick >= 1 ? "done" : "active", tick >= 2 ? "done" : tick >= 1 ? "active" : "pending", tick >= 2 ? "active" : "pending", "pending"];

  const note = trace
    ? fallback
      ? `${attempts.length} model attempt${attempts.length === 1 ? "" : "s"} failed validation — serving the knowledge-base reading instead.`
      : rejected > 0
        ? `Attempt ${rejected} was rejected by the validator and repaired on attempt ${rejected + 1}.`
        : attempts.length
          ? "Accepted on the first attempt."
          : "Composed from the card knowledge base (no language model in this engine)."
    : null;

  return (
    <div className="mx-auto mt-10 max-w-md border-t border-ink pt-4" role="status" aria-live="polite">
      <p className="label">Pipeline</p>
      <ol className="mt-3 space-y-2.5">
        {STEPS.map((step, i) => {
          const state = states[i];
          return (
            <li key={step.id} className="grid grid-cols-[1.25rem_1fr] gap-x-2">
              <span
                className={`font-mono text-[0.85rem] leading-[1.35rem] ${state === "done" ? "text-ok" : state === "warn" ? "text-warn" : state === "active" ? "text-accent" : "text-ink-3"}`}
                aria-hidden="true"
              >
                {state === "active" ? <span className="inline-block h-2 w-2 animate-pulse bg-accent align-middle" /> : MARK[state]}
              </span>
              <span>
                <span className={`block text-[0.98rem] leading-snug ${state === "pending" ? "text-ink-3" : "text-ink"}`}>{step.label}</span>
                <span className="block font-mono text-[0.7rem] leading-relaxed text-ink-3">{step.id === "generate" ? modelLabel : step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {note && <p className="mt-4 border-t border-rule pt-3 text-[0.9rem] leading-snug text-ink-2">{note}</p>}
    </div>
  );
}
