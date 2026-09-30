import { ArrowRight, History, ShieldAlert, Sparkles } from "lucide-react";
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
  "What do I need to understand about my relationship with money?",
  "I keep procrastinating on my creative work. What's holding me back?",
  "我该如何面对这段时间的迷茫？",
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
  const detected = route?.focus.label;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> A grounded tarot reading
          </p>
          <h1 className="display mt-3 text-4xl leading-tight text-balance sm:text-5xl">What would you like guidance on?</h1>
        </div>
        <button type="button" onClick={onOpenHistory} className="btn-ghost mt-1 shrink-0 !px-3 text-sm" aria-label="Past readings">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </button>
      </div>
      <p className="mt-4 max-w-2xl text-mist-400">
        Cards are drawn by a seeded shuffle you can verify; a language model only interprets them, and every answer is checked against the cards you drew.
      </p>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onContinue();
        }}
      >
        <label htmlFor="question" className="sr-only">
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
          placeholder="e.g. How should I approach the decision about moving cities?"
          className="field resize-none text-lg leading-relaxed"
        />
        <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-xs text-mist-400">
          {route && focus === "auto" && detected && (
            <span className="chip" title="Predicted by the in-browser question router">
              Focus detected: <strong className="font-medium text-gold-200">{FOCUS_LABEL[detected]}</strong>
              <span className="text-mist-500">{Math.round(route.focus.confidence * 100)}%</span>
            </span>
          )}
          {route && (route.safety.label === "medical" || route.safety.label === "high_stakes") && (
            <span className="chip border-warn-400/30 text-warn-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              {route.safety.label === "medical" ? "Health topic: the reading will avoid medical advice" : "High-stakes topic: no legal or financial directives"}
            </span>
          )}
          {route?.safety.label === "crisis" && (
            <span className="chip border-rose-300/30 text-rose-300">
              <ShieldAlert className="h-3.5 w-3.5" /> If you are going through something painful, support resources come first.
            </span>
          )}
          <span className="ml-auto tabular-nums text-mist-500">
            {question.length}/{QUESTION_LIMITS.max}
          </span>
        </div>

        {!trimmed && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => setQuestion(example)} className="chip text-left transition hover:border-gold-400/40 hover:text-mist-100">
                {example}
              </button>
            ))}
          </div>
        )}

        <fieldset className="mt-8">
          <legend className="eyebrow">Focus</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["auto", "career", "love", "finance", "growth", "general"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFocus(option)}
                aria-pressed={focus === option}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  focus === option ? "border-gold-400/60 bg-gold-400/10 text-gold-100" : "border-white/10 text-mist-400 hover:text-mist-100"
                }`}
              >
                {option === "auto" ? "Auto-detect" : FOCUS_LABEL[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="eyebrow">Spread</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {SPREAD_IDS.map((id) => {
              const def = SPREADS[id];
              const active = spread === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSpread(id)}
                  aria-pressed={active}
                  className={`panel flex items-center gap-4 p-4 text-left transition ${active ? "!border-gold-400/50 shadow-[var(--shadow-glow)]" : "hover:!border-white/20"}`}
                >
                  <div className="flex h-16 w-14 shrink-0 items-center justify-center">
                    <SpreadDiagram spread={id} active={active} />
                  </div>
                  <span>
                    <span className="block font-medium text-mist-100">{def.name}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-mist-400">{def.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-10 flex flex-col items-center gap-3">
          <button type="submit" disabled={!valid} className="btn-primary text-base">
            Shuffle the deck <ArrowRight className="h-4 w-4" />
          </button>
          {!valid && trimmed.length > 0 && <p className="text-xs text-mist-500">Please write at least {QUESTION_LIMITS.min} characters.</p>}
        </div>
      </form>
    </section>
  );
}
