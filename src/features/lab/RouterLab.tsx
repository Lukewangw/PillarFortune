import { useState } from "react";
import metrics from "../../../ml/router/reports/system-metrics.json";
import { useRoute } from "../reading/AskStep";
import { BarList, ConfusionMatrix, Figure, StatTile } from "./charts";

type Split = (typeof metrics.splits)["dev"];
const splits = metrics.splits as Record<string, Split>;
/** Headline numbers come from the blind test split when it has been evaluated. */
const headline: Split = splits.test ?? splits.dev;
const headlineName = splits.test ? "blind test set" : "dev set";

const FOCUS_NAME: Record<string, string> = { career: "Career", finance: "Money", general: "General", growth: "Growth", love: "Love" };
const SAFETY_NAME: Record<string, string> = { crisis: "Crisis", high_stakes: "High-stakes", medical: "Medical", none: "None" };
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function ProbBars({ probs, names }: { probs: Record<string, number>; names: Record<string, string> }) {
  const rows = Object.entries(probs)
    .map(([label, value]) => ({ label: names[label] ?? label, value }))
    .sort((a, b) => b.value - a.value);
  return <BarList rows={rows} highlight={rows[0]?.label} format={(v) => `${Math.round(v * 100)}%`} />;
}

export function RouterLab() {
  const [text, setText] = useState("My girlfriend and I keep fighting about money, should we move in together?");
  const route = useRoute(text);

  return (
    <div className="space-y-14">
      <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={`Focus macro-F1 · ${headlineName}`} value={headline.focus.macro_f1.toFixed(3)} caption={`5 classes · majority baseline ${metrics.focusMajorityBaselineMacroF1.toFixed(3)}`} />
        <StatTile label={`Safety macro-F1 · ${headlineName}`} value={headline.safety.macro_f1.toFixed(3)} caption="none · crisis · medical · high-stakes" />
        <StatTile
          label={`Crisis recall · ${headlineName}`}
          value={pct(headline.crisis.recall.served)}
          caption={`${headline.crisis.support} crisis questions · ${pct(headline.crisis.falseAlarmRate.served)} of others see the resources card`}
        />
        <StatTile label="Inference" value={`${headline.inferenceUsPerQuestion} µs`} caption={`${metrics.model.features.toLocaleString()} features · ${metrics.model.sizeKB} KB int8 · browser & Worker`} />
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <Figure n="3" title="Try the router" note="The exact model the Worker runs, loaded into your browser.">
          <label htmlFor="router-input" className="sr-only">
            Question to route
          </label>
          <textarea id="router-input" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="field resize-none text-[1.02rem]" />
          {route ? (
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[0.95rem] text-star-2">
                  Focus → <span className="text-star">{FOCUS_NAME[route.focus.label]}</span>
                </p>
                <ProbBars probs={route.focus.probs} names={FOCUS_NAME} />
              </div>
              <div>
                <p className="mb-2 text-[0.95rem] text-star-2">
                  Safety → <span className="text-star">{SAFETY_NAME[route.safety.label]}</span>
                  {route.safety.gate && <span className="ml-1 text-gold">({route.safety.gate} gate)</span>}
                </p>
                <ProbBars probs={route.safety.probs} names={SAFETY_NAME} />
                {route.safety.rule && <p className="mt-2 font-mono text-[0.7rem] text-gold">rule: {route.safety.rule}</p>}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[0.92rem] italic text-star-3">Type at least 8 characters…</p>
          )}
        </Figure>

        <Figure
          n="4"
          title="Crisis detection: rules and model together"
          note={
            <>
              Explicit statements hit high-precision rules (hard gate: resources only). The classifier, with a recall-oriented threshold of {metrics.model.crisisThreshold}{" "}
              chosen by cross-validation, catches indirect warning signs (soft gate: resources, then the choice to continue).
            </>
          }
        >
          <BarList
            rows={[
              { label: "Hard rules only", value: headline.crisis.recall.hardRulesOnly },
              { label: "Model only", value: headline.crisis.recall.modelOnly },
              { label: "Served (both)", value: headline.crisis.recall.served },
            ]}
            highlight="Served (both)"
            format={pct}
          />
          <p className="mt-4 text-[0.9rem] leading-snug text-star-3">
            Recall on the {headlineName}. False alarms: {headline.crisis.falseAlarms.hardRulesOnly} from hard rules, {headline.crisis.falseAlarms.served} overall, out of{" "}
            {headline.crisis.nonCrisis} non-crisis questions.
          </p>
        </Figure>
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <Figure n="5" title={`Focus — confusion matrix (${headlineName})`}>
          <ConfusionMatrix labels={headline.focus.confusion.labels} matrix={headline.focus.confusion.matrix} display={(l) => FOCUS_NAME[l] ?? l} />
        </Figure>
        <Figure n="6" title={`Safety — confusion matrix (${headlineName})`}>
          <ConfusionMatrix labels={headline.safety.confusion.labels} matrix={headline.safety.confusion.matrix} display={(l) => SAFETY_NAME[l] ?? l} />
        </Figure>
      </div>

      <details className="border-t border-line pt-3">
        <summary className="label cursor-pointer transition-colors hover:!text-star">Method, splits and ablations</summary>
        <ul className="mt-4 max-w-[46rem] list-disc space-y-2 pl-5 text-[0.98rem] leading-relaxed text-star-2">
          <li>
            Data: {metrics.model.trainExamples.toLocaleString()} training questions (English and Chinese), a dev set of {splits.dev.n} used for error analysis, and{" "}
            {splits.test ? `a blind test set of ${splits.test.n} written by a separate author and scored once` : "a blind test set that is scored once, at the end"}.
          </li>
          <li>
            Features: sublinear TF-IDF over words, word bigrams, CJK characters and bigrams, and character 3–5-grams. Vocabulary size chosen by nested 5-fold CV (
            {Object.entries(metrics.model.vocabSearchCv)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")}
            ).
          </li>
          <li>
            Feature ablation, focus macro-F1 on dev:{" "}
            {Object.entries(metrics.featureAblationFocusMacroF1)
              .map(([k, v]) => `${k} ${v}`)
              .join(" · ")}
            .
          </li>
          <li>
            Two logistic-regression heads (C = {metrics.model.cFocus} / {metrics.model.cSafety}, balanced class weights for safety), int8-quantized per class; the quantized
            model agrees with the float model on {pct(metrics.model.int8Agreement)} of dev predictions, and a parity test checks the TypeScript inference against Python to 6
            decimals.
          </li>
        </ul>
      </details>
    </div>
  );
}
