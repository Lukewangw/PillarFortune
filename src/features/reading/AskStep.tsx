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

const STEPS: Array<[string, string, string]> = [
  ["I", "Your question is read", "A small classifier notes its topic and checks for distress, in your browser, in about 0.1 ms."],
  ["II", "The deck is dealt", "A seeded shuffle fixes all 78 cards. You choose yours, and anyone can replay the draw."],
  ["III", "The cards are read", "The model sees only your cards. Every answer is checked, repaired if needed, or replaced."],
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
    <section className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="flex justify-end">
        <button type="button" onClick={onOpenHistory} className="label !text-star-3 transition-colors hover:!text-gold-2" aria-label="Past readings">
          Past readings →
        </button>
      </div>

      <div className="mx-auto mt-6 max-w-3xl animate-rise text-center">
        <p className="label">✦ &nbsp;A tarot reading&nbsp; ✦</p>
        <h1 className="display mt-6 text-[2.7rem] sm:text-[4.1rem]">
          What would you like <em className="foil animate-shimmer pr-1 italic">guidance</em> on?
        </h1>
        <p className="lede mx-auto mt-5 max-w-[34rem]">Write it the way you would say it to a friend. The more specific the question, the more specific the reading.</p>
      </div>

      <form
        className="mx-auto mt-10 max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onContinue();
        }}
      >
        <div className="frame p-2 transition-shadow focus-within:shadow-[0_0_0_1px_rgb(214_179_112_/_0.6),0_0_40px_-10px_rgb(214_179_112_/_0.55)] sm:p-3">
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
            placeholder="How should I approach the decision about moving cities?"
            className="block w-full resize-none bg-transparent px-4 py-4 text-[1.3rem] leading-snug text-star outline-none placeholder:italic placeholder:text-star-3 sm:px-6 sm:text-[1.45rem]"
          />
        </div>
        <div className="mt-3 flex min-h-5 flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-center font-mono text-[0.7rem] leading-relaxed text-star-3">
          {route ? (
            <span title="Predicted by the question router running in your browser">
              <span className="text-gold">router</span> · reads as <span className="text-star">{FOCUS_LABEL[route.focus.label].toLowerCase()}</span>{" "}
              {Math.round(route.focus.confidence * 100)}%{focus !== "auto" && " (you chose the focus)"}
            </span>
          ) : (
            <span>
              <span className="text-gold">router</span> · waiting for a question
            </span>
          )}
          {route && (route.safety.label === "medical" || route.safety.label === "high_stakes") && (
            <span className="text-warn">
              {route.safety.label === "medical" ? "health topic: the reading will not give medical advice" : "high stakes: no legal or financial directives"}
            </span>
          )}
          {route?.safety.label === "crisis" && <span className="text-bad">if you are going through something painful, support comes first</span>}
          <span className="tabular-nums">
            {question.length}/{QUESTION_LIMITS.max}
          </span>
        </div>

        {!trimmed && (
          <div className="mt-7 text-center">
            <p className="label !text-star-3">Or begin with one of these</p>
            <ul className="mt-3 space-y-1.5">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button type="button" onClick={() => setQuestion(example)} className="text-[1.02rem] italic leading-snug text-star-2 transition-colors hover:text-gold-2">
                    “{example}”
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <fieldset className="mt-12 text-center">
          <legend className="divider label mb-5 w-full">Focus</legend>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {(["auto", "career", "love", "finance", "growth", "general"] as const).map((option) => {
              const active = focus === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFocus(option)}
                  aria-pressed={active}
                  className={`relative text-[1.05rem] transition-colors ${active ? "text-gold-2" : "text-star-3 hover:text-star"}`}
                >
                  {option === "auto" ? "Detect automatically" : FOCUS_LABEL[option]}
                  {active && <span className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-gold" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-12">
          <legend className="divider label mb-5 w-full">Spread</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {SPREAD_IDS.map((id) => {
              const def = SPREADS[id];
              const active = spread === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSpread(id)}
                  aria-pressed={active}
                  className={`frame flex flex-col items-center px-4 pb-5 pt-6 text-center transition-[box-shadow,border-color] ${
                    active ? "!border-gold shadow-[0_0_36px_-12px_rgb(214_179_112_/_0.7)]" : "hover:!border-gold/60"
                  }`}
                >
                  <span className="flex h-[4.4rem] items-center justify-center">
                    <SpreadDiagram spread={id} active={active} />
                  </span>
                  <span className={`inscription mt-3 block text-[0.95rem] ${active ? "!text-gold-2" : ""}`}>{def.name}</span>
                  <span className="mt-1.5 block text-[0.88rem] leading-snug text-star-3">{def.tagline}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-12 flex flex-col items-center gap-3">
          <button type="submit" disabled={!valid} className="btn btn-primary !px-9">
            Shuffle the deck <ArrowRight className="nudge" />
          </button>
          <span className="text-[0.88rem] text-star-3">
            {!valid && trimmed.length > 0 ? `Please write at least ${QUESTION_LIMITS.min} characters.` : "or press Ctrl / ⌘ + Enter"}
          </span>
        </div>
      </form>

      <div className="mx-auto mt-20 max-w-4xl">
        <p className="divider label">How a reading is made</p>
        <ol className="mt-8 grid gap-8 text-center sm:grid-cols-3">
          {STEPS.map(([numeral, title, body]) => (
            <li key={title}>
              <span className="inscription mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 text-[0.85rem] !text-gold">{numeral}</span>
              <span className="mt-3 block text-[1.08rem] text-star">{title}</span>
              <span className="mx-auto mt-1.5 block max-w-[17rem] text-[0.92rem] leading-snug text-star-3">{body}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center">
          <a href="#/lab" className="label transition-colors hover:!text-gold-2">
            See the machinery →
          </a>
        </p>
      </div>
    </section>
  );
}
