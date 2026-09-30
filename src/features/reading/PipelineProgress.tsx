import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Trace } from "../../core/llm/trace";

type StepState = "pending" | "active" | "done" | "warn";

const STEPS = [
  { id: "route", label: "Routing your question", detail: "focus and safety classifier" },
  { id: "draw", label: "Verifying the draw", detail: "recomputing your cards from seed + picks" },
  { id: "generate", label: "Interpreting the cards", detail: "" },
  { id: "validate", label: "Validating the answer", detail: "JSON Schema · card references · unseen cards · tone" },
];

/** Animated view of the reading pipeline while a request is in flight; settles on the real trace when it returns. */
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
      ? `${attempts.length} model attempt${attempts.length === 1 ? "" : "s"} failed validation — served the knowledge-base reading instead.`
      : rejected > 0
        ? `Attempt ${rejected} was rejected by the validator and repaired on attempt ${rejected + 1}.`
        : attempts.length
          ? "Accepted on the first attempt."
          : "Composed from the card knowledge base (no language model in this engine)."
    : null;

  return (
    <div className="panel mx-auto mt-8 max-w-lg p-5" role="status" aria-live="polite">
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const state = states[i];
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  state === "done"
                    ? "border-ok-400/60 bg-ok-400/15 text-ok-400"
                    : state === "warn"
                      ? "border-warn-400/60 bg-warn-400/15 text-warn-400"
                      : state === "active"
                        ? "border-gold-400/60 text-gold-300"
                        : "border-white/15 text-mist-500"
                }`}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : state === "warn" ? <RotateCcw className="h-3 w-3" /> : state === "active" ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1 w-1 rounded-full bg-current" />}
              </span>
              <span>
                <span className={`block text-sm ${state === "pending" ? "text-mist-500" : "text-mist-100"}`}>{step.label}</span>
                <span className="block text-xs text-mist-500">{step.id === "generate" ? modelLabel : step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {note && (
        <p className="mt-4 flex items-start gap-2 border-t border-white/5 pt-3 text-xs text-mist-400">
          {fallback ? <X className="mt-0.5 h-3.5 w-3.5 text-warn-400" /> : <Check className="mt-0.5 h-3.5 w-3.5 text-ok-400" />}
          {note}
        </p>
      )}
    </div>
  );
}
