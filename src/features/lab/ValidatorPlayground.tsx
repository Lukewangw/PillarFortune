import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
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
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-mist-400">
          <span className="mr-1">Drawn:</span>
          {DRAW.cards.map((c) => (
            <span key={c.cardId} className="chip !py-0.5">
              {c.positionLabel}: {getCard(c.cardId).name}
              {c.orientation === "reversed" ? " (reversed)" : ""}
            </span>
          ))}
        </div>
        <label htmlFor="playground" className="sr-only">
          Model output to validate
        </label>
        <textarea
          id="playground"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="field scrollbar-thin h-80 resize-y font-mono !text-[11.5px] leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {FAULTS.map((fault) => (
            <button key={fault.label} type="button" onClick={() => inject(fault)} className="chip transition hover:border-bad-400/40 hover:text-mist-100">
              {fault.label}
            </button>
          ))}
          <button type="button" onClick={() => setText(VALID)} className="chip transition hover:border-ok-400/40 hover:text-mist-100">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>
      <div className="panel p-5" aria-live="polite">
        {result.issues.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ok-400">
            <CheckCircle2 className="h-4 w-4" /> Passes every check — this output would be shipped.
          </p>
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-bad-400">
              <XCircle className="h-4 w-4" /> Rejected with {result.issues.length} issue{result.issues.length > 1 ? "s" : ""} — these exact messages go back to the model.
            </p>
            <ul className="mt-3 space-y-1.5">
              {result.issues.map((issue, i) => (
                <li key={i} className="rounded-lg bg-bad-400/[0.06] px-2.5 py-1.5 text-xs">
                  <span className="mr-2 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-bad-400">{issue.stage}</span>
                  <span className="font-mono text-mist-300">{issue.path}</span> <span className="text-mist-400">— {issue.message}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {result.notes.length > 0 && (
          <p className="mt-4 text-xs text-mist-500">
            Normalized before validation: <span className="font-mono">{result.notes.join(", ")}</span>
          </p>
        )}
        <p className="mt-5 border-t border-white/5 pt-4 text-xs leading-relaxed text-mist-500">
          The schema is generated per draw: <span className="font-mono text-mist-400">cardId</span> must be one of{" "}
          <span className="font-mono text-mist-400">{DRAW.cards.map((c) => c.cardId).join(", ")}</span>, positions and orientations must match the draw exactly, and free
          text may not name any other card. Harmless deviations (a card name instead of its id, “Upright”, extra keys, wrong order) are normalized instead of rejected.
        </p>
      </div>
    </div>
  );
}
