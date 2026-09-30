import { IssueList } from "../../components/TraceDrawer";
import { useMemo, useState } from "react";
import { extractJson } from "../../core/llm/extract";
import { composeInterpretation } from "../../core/llm/fallback";
import { buildInterpretationSchema } from "../../core/llm/schemas";
import { validateInterpretation } from "../../core/llm/validate";
import { getCard } from "../../core/tarot/deck";
import { drawCards } from "../../core/tarot/engine";
import { CARDS } from "../../core/tarot/deck";

const DRAW = drawCards({ seed: "validator-playground-7", spread: "three" });
const SCHEMA = buildInterpretationSchema(DRAW);
const VALID = JSON.stringify(composeInterpretation({ draw: DRAW, question: "How can I grow in my new role?", focus: "career" }), null, 2);
const FOREIGN = CARDS.find((c) => c.name.startsWith("The ") && !DRAW.cards.some((d) => d.cardId === c.id))!;

type Fault = { label: string; apply: (value: Record<string, unknown>) => Record<string, unknown> | string };

const FAULTS: Fault[] = [
  {
    label: "Flip an orientation",
    apply: (v) => {
      const cards = v.cards as Array<Record<string, unknown>>;
      cards[0].orientation = cards[0].orientation === "upright" ? "reversed" : "upright";
      return v;
    },
  },
  {
    label: "Mention an undrawn card",
    apply: (v) => ({ ...v, summary: `${String(v.summary)} ${FOREIGN.name} also suggests a sudden change.` }),
  },
  {
    label: "Drop a card",
    apply: (v) => ({ ...v, cards: (v.cards as unknown[]).slice(0, -1) }),
  },
  {
    label: "Overclaim certainty",
    apply: (v) => ({ ...v, advice: "You will definitely get the promotion, so relax." }),
  },
  {
    label: "Truncate the JSON",
    apply: (v) => JSON.stringify(v, null, 2).slice(0, 420),
  },
];

export function ValidatorPlayground() {
  const [text, setText] = useState(VALID);
  const result = useMemo(() => {
    const extracted = extractJson(text);
    if (!extracted.ok) return { issues: [extracted.issue], notes: [] as string[] };
    const checked = validateInterpretation(extracted.value, DRAW, SCHEMA);
    return { issues: checked.issues, notes: [...extracted.notes, ...checked.notes] };
  }, [text]);

  const inject = (fault: Fault) => {
    const base = extractJson(text);
    const value = base.ok && typeof base.value === "object" && base.value ? structuredClone(base.value as Record<string, unknown>) : JSON.parse(VALID);
    const next = fault.apply(value);
    setText(typeof next === "string" ? next : JSON.stringify(next, null, 2));
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14">
      <div className="min-w-0">
        <p className="label">Drawn for this example</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {DRAW.cards.map((c) => (
            <span key={c.cardId} className="tag">
              {c.positionLabel}: {getCard(c.cardId).name}
              {c.orientation === "reversed" ? " (reversed)" : ""}
            </span>
          ))}
        </p>
        <label htmlFor="playground" className="label mt-6 block">
          Model output — edit it, or inject a fault below
        </label>
        <textarea
          id="playground"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="field scrollbar-thin mt-2 h-80 resize-y font-mono !text-[0.72rem] leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {FAULTS.map((fault) => (
            <button key={fault.label} type="button" onClick={() => inject(fault)} className="tag cursor-pointer !px-2.5 !py-1.5 transition-colors hover:border-bad hover:text-bad">
              {fault.label}
            </button>
          ))}
          <button type="button" onClick={() => setText(VALID)} className="tag cursor-pointer !px-2.5 !py-1.5 transition-colors hover:border-gold/50 hover:text-star">
            ↺ Reset
          </button>
        </div>
      </div>
      <div className="min-w-0 border-t border-gold/50 pt-4 lg:mt-[1.35rem]" aria-live="polite">
        <p className="label">Validator verdict</p>
        {result.issues.length === 0 ? (
          <p className="mt-3 text-[1.25rem] leading-snug text-ok">✓ Passes every check — this output would be shipped.</p>
        ) : (
          <>
            <p className="mt-3 text-[1.25rem] leading-snug text-bad">
              ✕ Rejected with {result.issues.length} issue{result.issues.length > 1 ? "s" : ""}. These exact messages go back to the model.
            </p>
            <IssueList issues={result.issues} />
          </>
        )}
        {result.notes.length > 0 && (
          <p className="mt-4 text-[0.88rem] text-star-3">
            Normalized before validation: <span className="font-mono text-[0.72rem]">{result.notes.join(", ")}</span>
          </p>
        )}
        <p className="mt-6 border-t border-line pt-4 text-[0.92rem] leading-relaxed text-star-3">
          The schema is generated per draw: <span className="font-mono text-[0.72rem] text-star-2">cardId</span> must be one of{" "}
          <span className="font-mono text-[0.72rem] text-star-2">{DRAW.cards.map((c) => c.cardId).join(", ")}</span>, positions and orientations must match the draw exactly,
          and free text may not name any other card. Harmless deviations (a card name instead of its id, “Upright”, extra keys, wrong order) are normalized instead of
          rejected.
        </p>
      </div>
    </div>
  );
}
