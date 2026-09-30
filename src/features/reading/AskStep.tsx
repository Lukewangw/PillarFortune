import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Focus } from "../../core/llm/types";
import { QUESTION_LIMITS } from "../../core/orchestrate";
import type { QuestionRouter, RouteResult } from "../../core/router/router";
import { SPREADS, SPREAD_IDS, type SpreadId } from "../../core/tarot/spreads";
import { loadRouter } from "../../lib/routerClient";
import { SpreadDiagram } from "./SpreadLayout";

export const FOCUS_LABEL: Record<Focus, string> = {
  general: "General",
  career: "Career & study",
  love: "Love & relationships",
  finance: "Money",
  growth: "Personal growth",
};

const EXAMPLES = [
  "I just started a new job and feel out of my depth. What should I focus on?",
  "How can I reconnect with my sister after a long silence?",
  "I keep procrastinating on my creative work. What's holding me back?",
  "我该如何面对这段时间的迷茫？",
];

const STEPS: Array<[string, string]> = [
  ["Your question is routed", "A small classifier reads its topic and checks for distress, in your browser, in about 0.1 ms."],
  ["The deck is dealt", "A seeded shuffle fixes the order of all 78 cards. You pick; anyone can replay the draw."],
  ["The cards are interpreted", "The model sees only your cards. Every answer is validated, repaired if needed, or replaced."],
];

/** Live routing feedback while typing: the same model the server uses, running in the browser. */
export function useRoute(text: string): RouteResult | null {
  const [router, setRouter] = useState<QuestionRouter | null>(null);
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    loadRouter().then(setRouter).catch(() => setRouter(null));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 180);
    return () => clearTimeout(timer);
  }, [text]);
  return useMemo(() => (router && debounced.trim().length >= 8 ? router.route(debounced) : null), [router, debounced]);
}

export function AskStep(props: {
  question: string;
  setQuestion: (q: string) => void;
  focus: Focus | "auto";
  setFocus: (f: Focus | "auto") => void;
  spread: SpreadId;
  setSpread: (s: SpreadId) => void;
  onContinue: () => void;
  onOpenHistory: () => void;
}) {
  const { question, setQuestion, focus, setFocus, spread, setSpread, onContinue, onOpenHistory } = props;
  const route = useRoute(question);
  const trimmed = question.trim();
  const valid = trimmed.length >= QUESTION_LIMITS.min && trimmed.length <= QUESTION_LIMITS.max;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:gap-20">
        <div className="min-w-0 max-w-[46rem]">
          <div className="flex items-baseline justify-between gap-4">
            <p className="label">A tarot reading</p>
            <button type="button" onClick={onOpenHistory} className="label transition-colors hover:!text-ink" aria-label="Past readings">
              Past readings →
            </button>
          </div>
          <h1 className="display mt-5 text-[2.6rem] sm:text-[3.7rem]">What would you like guidance on?</h1>
          <p className="lede mt-5 max-w-[36rem]">Write it the way you would say it to a friend. The more specific the question, the more specific the reading.</p>

          <form
            className="mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) onContinue();
            }}
          >
            <label htmlFor="question" className="label">
              Your question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && valid) onContinue();
              }}
              rows={3}
              maxLength={QUESTION_LIMITS.max}
              placeholder="How should I approach the decision about moving cities?"
              className="field mt-2 resize-none px-4 py-3.5 text-[1.3rem] leading-snug sm:text-[1.4rem]"
            />
            <div className="mt-2 flex min-h-5 flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[0.7rem] leading-relaxed text-ink-3">
              {route ? (
                <span title="Predicted by the question router running in your browser">
                  <span className="uppercase tracking-[0.08em]">Router</span> · reads as <span className="text-ink">{FOCUS_LABEL[route.focus.label].toLowerCase()}</span>{" "}
                  {Math.round(route.focus.confidence * 100)}%{focus !== "auto" && " (you chose the focus)"}
                </span>
              ) : (
                <span>
                  <span className="uppercase tracking-[0.08em]">Router</span> · waiting for a question
                </span>
              )}
              {route && (route.safety.label === "medical" || route.safety.label === "high_stakes") && (
                <span className="text-warn">
                  {route.safety.label === "medical" ? "health topic: the reading will not give medical advice" : "high stakes: no legal or financial directives"}
                </span>
              )}
              {route?.safety.label === "crisis" && <span className="text-accent">if you are going through something painful, support comes first</span>}
              <span className="ml-auto tabular-nums">
                {question.length}/{QUESTION_LIMITS.max}
              </span>
            </div>

            {!trimmed && (
              <div className="mt-6">
                <p className="label">Or begin with one of these</p>
                <ul className="mt-2 space-y-1">
                  {EXAMPLES.map((example) => (
                    <li key={example}>
                      <button type="button" onClick={() => setQuestion(example)} className="text-left text-[1.02rem] italic leading-snug text-ink-2 transition-colors hover:text-accent">
                        “{example}”
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <fieldset className="mt-10 border-t border-rule pt-5">
              <legend className="label float-left mb-3 w-full">Focus</legend>
              <div className="clear-both flex flex-wrap gap-x-5 gap-y-2">
                {(["auto", "career", "love", "finance", "growth", "general"] as const).map((option) => {
                  const active = focus === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFocus(option)}
                      aria-pressed={active}
                      className={`text-[1.05rem] transition-colors ${
                        active ? "text-ink underline decoration-accent decoration-[1.5px] underline-offset-[6px]" : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      {option === "auto" ? "Detect automatically" : FOCUS_LABEL[option]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-8 border-t border-rule pt-5">
              <legend className="label float-left mb-3 w-full">Spread</legend>
              <div className="clear-both grid gap-2.5 sm:grid-cols-3">
                {SPREAD_IDS.map((id) => {
                  const def = SPREADS[id];
                  const active = spread === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSpread(id)}
                      aria-pressed={active}
                      className={`flex items-start gap-4 border bg-paper-2 p-4 text-left transition-colors ${
                        active ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-rule-2 hover:border-ink-3"
                      }`}
                    >
                      <span className="flex h-[4.2rem] w-10 shrink-0 items-center justify-center">
                        <SpreadDiagram spread={id} active={active} />
                      </span>
                      <span>
                        <span className="block text-[1.05rem] leading-tight text-ink">{def.name}</span>
                        <span className="mt-1.5 block text-[0.85rem] leading-snug text-ink-3">{def.tagline}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button type="submit" disabled={!valid} className="btn btn-primary">
                Shuffle the deck <ArrowRight className="nudge" />
              </button>
              <span className="text-sm text-ink-3">
                {!valid && trimmed.length > 0 ? `Please write at least ${QUESTION_LIMITS.min} characters.` : "or press Ctrl / ⌘ + Enter"}
              </span>
            </div>
          </form>
        </div>

        <aside className="border-t border-rule pt-6 lg:mt-[7.2rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
          <p className="label">How a reading is made</p>
          <ol className="mt-4 space-y-5">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[1.4rem_1fr] gap-x-2">
                <span className="font-mono text-[0.75rem] leading-[1.6rem] text-accent">{i + 1}</span>
                <span>
                  <span className="block text-[1rem] leading-snug text-ink">{title}</span>
                  <span className="mt-1 block text-[0.9rem] leading-snug text-ink-3">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <a href="#/lab" className="label mt-6 inline-block !text-ink underline decoration-rule-2 underline-offset-4 transition-colors hover:decoration-accent">
            See the machinery →
          </a>
        </aside>
      </div>
    </section>
  );
}
