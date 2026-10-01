import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [nudged, setNudged] = useState(false);

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
          if (valid) return onContinue();
          // Never a dead button: point the user back to the question instead.
          setNudged(true);
          inputRef.current?.focus();
        }}
      >
        <div className="group relative">
          <label htmlFor="question" className="sr-only">
            Your question
          </label>
          <textarea
            id="question"
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && valid) onContinue();
            }}
            rows={2}
            maxLength={QUESTION_LIMITS.max}
            placeholder="How should I approach the decision about moving cities?"
            className="block w-full resize-none bg-transparent px-2 pb-4 pt-2 text-center text-[1.45rem] leading-snug text-star outline-none placeholder:italic placeholder:text-star-3/80 sm:text-[1.7rem]"
          />
          <span className="block h-px w-full bg-[linear-gradient(90deg,transparent,rgb(214_179_112_/_0.55),transparent)]" aria-hidden="true" />
          <span
            className="pointer-events-none absolute inset-x-[15%] -bottom-px block h-[2px] origin-center scale-x-0 bg-[linear-gradient(90deg,transparent,#f0dcaa,transparent)] shadow-[0_0_18px_rgb(240_220_170_/_0.8)] transition-transform duration-500 group-focus-within:scale-x-100"
            aria-hidden="true"
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

        <fieldset className="mt-9 min-w-0 text-center sm:mt-12">
          <legend className="divider label mb-3 w-full sm:mb-5">Focus</legend>
          {/* Phones: one swipeable row. Desktop: a centred, wrapping line. */}
          <div className="-mx-4 flex snap-x scroll-px-9 gap-x-6 overflow-x-auto px-9 pb-1 [mask-image:linear-gradient(90deg,transparent,#000_1.25rem,#000_calc(100%-1.25rem),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-y-3 sm:overflow-visible sm:px-0 sm:pb-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
            {(["auto", "career", "love", "finance", "growth", "general"] as const).map((option) => {
              const active = focus === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFocus(option)}
                  aria-pressed={active}
                  className={`relative shrink-0 snap-start whitespace-nowrap py-2.5 text-[1.02rem] transition-colors sm:py-0 sm:text-[1.05rem] ${active ? "text-gold-2" : "text-star-3 hover:text-star"}`}
                >
                  {option === "auto" ? "Detect automatically" : FOCUS_LABEL[option]}
                  {active && <span className="absolute bottom-0 left-1/2 sm:-bottom-2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-gold" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-9 min-w-0 sm:mt-12">
          <legend className="divider label mb-3 w-full sm:mb-5">Spread</legend>
          <div className="grid grid-cols-3 gap-1 sm:gap-3">
            {SPREAD_IDS.map((id) => {
              const def = SPREADS[id];
              const active = spread === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSpread(id)}
                  aria-pressed={active}
                  className="group relative flex flex-col items-center px-1 pb-2 pt-3 text-center sm:px-4 sm:pb-4 sm:pt-5"
                >
                  <span
                    className={`pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(214_179_112_/_0.2),transparent)] transition-opacity duration-500 ${
                      active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="relative flex h-[4.4rem] origin-bottom scale-[0.8] items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 sm:scale-100">
                    <SpreadDiagram spread={id} active={active} />
                  </span>
                  <span className={`inscription relative mt-1 block text-[0.72rem] leading-snug sm:mt-3 sm:text-[0.95rem] transition-colors ${active ? "!text-gold-2" : "group-hover:!text-gold-2"}`}>{def.name}</span>
                  <span className="relative mt-1.5 hidden max-w-[15rem] sm:block text-[0.88rem] leading-snug text-star-3">{def.tagline}</span>
                  <span
                    className={`relative mt-2 block h-1.5 w-1.5 rotate-45 sm:mt-3 bg-gold transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[0.92rem] leading-snug text-star-3 sm:hidden">{SPREADS[spread].tagline}</p>
        </fieldset>

        {/* Phones: the call to action stays in reach at the bottom of the screen while the form scrolls. */}
        <div className="sticky bottom-0 z-20 mt-8 flex flex-col items-center gap-2 pb-4 [text-shadow:0_1px_6px_#03050c] sm:static sm:mt-12 sm:gap-3 sm:pb-0 sm:[text-shadow:none]">
          <button type="submit" className="btn btn-primary w-full sm:w-auto !min-h-[3.75rem] !gap-3 !px-14 !text-[0.95rem] !tracking-[0.2em] [&_svg]:!h-[1.15rem] [&_svg]:!w-[1.15rem] sm:!min-h-[5rem] sm:!gap-4 sm:!px-24 sm:!text-[1.3rem] sm:!tracking-[0.22em] sm:[&_svg]:!h-[1.6rem] sm:[&_svg]:!w-[1.6rem]">
            Shuffle the deck <ArrowRight className="nudge" />
          </button>
          <span className={`text-[0.88rem] transition-colors ${!valid && nudged ? "text-gold-2" : "text-star-3"}`} aria-live="polite">
            {!valid && (nudged || trimmed.length > 0)
              ? trimmed.length === 0
                ? "Write your question above first."
                : `Please write at least ${QUESTION_LIMITS.min} characters.`
              : <span className="hidden sm:inline">or press Ctrl / ⌘ + Enter</span>}
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
