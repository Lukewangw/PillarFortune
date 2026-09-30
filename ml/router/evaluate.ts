/**
 * Evaluates the router exactly as it is served (TypeScript inference, int8 weights,
 * crisis rules + threshold) and writes ml/router/reports/system-metrics.json, which
 * the "How it works" page renders.
 *
 *   npx tsx ml/router/evaluate.ts               # dev split (used for error analysis)
 *   npx tsx ml/router/evaluate.ts --blind-test  # also the blind test split (final numbers)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { matchCrisisRule } from "../../src/core/router/crisis";
import { QuestionRouter, type RouterModelJSON } from "../../src/core/router/router";

const here = dirname(fileURLToPath(import.meta.url));
const model = JSON.parse(readFileSync(join(here, "../../src/core/router/model.json"), "utf8")) as RouterModelJSON;
const trainMetrics = JSON.parse(readFileSync(join(here, "reports/metrics.json"), "utf8"));
const loadSplit = (name: string) =>
  readFileSync(join(here, `data/${name}.jsonl`), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { text: string; focus: string; safety: string; lang: string });

const FOCUS = ["career", "finance", "general", "growth", "love"];
const SAFETY = ["crisis", "high_stakes", "medical", "none"];
const round = (x: number) => Math.round(x * 10_000) / 10_000;

function report(truth: string[], pred: string[], labels: string[]) {
  const perClass: Record<string, { precision: number; recall: number; f1: number; support: number }> = {};
  for (const label of labels) {
    const tp = truth.filter((t, i) => t === label && pred[i] === label).length;
    const fp = truth.filter((t, i) => t !== label && pred[i] === label).length;
    const fn = truth.filter((t, i) => t === label && pred[i] !== label).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    perClass[label] = { precision: round(precision), recall: round(recall), f1: round(precision + recall ? (2 * precision * recall) / (precision + recall) : 0), support: tp + fn };
  }
  return {
    accuracy: round(truth.filter((t, i) => t === pred[i]).length / truth.length),
    macro_f1: round(labels.reduce((s, l) => s + perClass[l].f1, 0) / labels.length),
    per_class: perClass,
    confusion: { labels, matrix: labels.map((t) => labels.map((p) => truth.filter((x, i) => x === t && pred[i] === p).length)) },
  };
}

const router = new QuestionRouter(model);

function evaluateSplit(test: ReturnType<typeof loadSplit>) {
  for (let i = 0; i < 50; i++) router.route(test[i % test.length].text); // warm-up
  const started = performance.now();
  const results = test.map((row) => router.route(row.text));
  const perQuestionUs = ((performance.now() - started) / test.length) * 1000;

  const focusPred = results.map((r) => r.focus.label as string);
  const safetyPred = results.map((r) => r.safety.label as string);
  const truthFocus = test.map((r) => r.focus);
  const truthSafety = test.map((r) => r.safety);

  const crisisIdx = test.map((r, i) => (r.safety === "crisis" ? i : -1)).filter((i) => i >= 0);
  const ruleHits = test.map((r) => matchCrisisRule(r.text) !== null);
  const hardHits = test.map((r) => matchCrisisRule(r.text)?.tier === "hard");
  const modelHits = test.map((r) => router.predictProba(r.text).safety[0] >= router.crisisThreshold);
  const served = safetyPred.map((p) => p === "crisis");
  const recallOf = (hits: boolean[]) => round(crisisIdx.filter((i) => hits[i]).length / crisisIdx.length);
  const falseAlarms = (hits: boolean[]) => test.filter((r, i) => r.safety !== "crisis" && hits[i]).length;
  const nonCrisis = test.length - crisisIdx.length;

  const byLang = Object.fromEntries(
    [...new Set(test.map((r) => r.lang))].map((lang) => {
      const idx = test.map((r, i) => (r.lang === lang ? i : -1)).filter((i) => i >= 0);
      return [
        lang,
        {
          n: idx.length,
          focus: report(idx.map((i) => truthFocus[i]), idx.map((i) => focusPred[i]), FOCUS).macro_f1,
          safety: report(idx.map((i) => truthSafety[i]), idx.map((i) => safetyPred[i]), SAFETY).macro_f1,
        },
      ];
    }),
  );

  return {
    n: test.length,
    lang: Object.fromEntries([...new Set(test.map((r) => r.lang))].map((l) => [l, test.filter((r) => r.lang === l).length])),
    inferenceUsPerQuestion: Math.round(perQuestionUs),
    focus: report(truthFocus, focusPred, FOCUS),
    safety: report(truthSafety, safetyPred, SAFETY),
    crisis: {
      support: crisisIdx.length,
      nonCrisis,
      recall: { rulesOnly: recallOf(ruleHits), hardRulesOnly: recallOf(hardHits), modelOnly: recallOf(modelHits), served: recallOf(served) },
      falseAlarms: { rulesOnly: falseAlarms(ruleHits), hardRulesOnly: falseAlarms(hardHits), modelOnly: falseAlarms(modelHits), served: falseAlarms(served) },
      falseAlarmRate: { hardRulesOnly: round(falseAlarms(hardHits) / nonCrisis), served: round(falseAlarms(served) / nonCrisis) },
    },
    byLanguage: byLang,
    errors: {
      crisisMissed: crisisIdx.filter((i) => !served[i]).map((i) => ({ text: test[i].text, predicted: safetyPred[i] })),
      crisisFalseAlarms: test.filter((r, i) => r.safety !== "crisis" && served[i]).map((r) => ({ text: r.text, truth: r.safety, hardRule: matchCrisisRule(r.text)?.tier === "hard" })),
    },
  };
}

const blind = process.argv.includes("--blind-test");
const splits: Record<string, ReturnType<typeof evaluateSplit>> = { dev: evaluateSplit(loadSplit("dev")) };
if (blind) splits.test = evaluateSplit(loadSplit("test"));

const out = {
  modelVersion: model.version,
  generatedAt: new Date().toISOString(),
  model: {
    features: model.features.length,
    sizeKB: Math.round(readFileSync(join(here, "../../src/core/router/model.json")).length / 1024),
    crisisThreshold: router.crisisThreshold,
    trainExamples: trainMetrics.data.train,
    vocabSearchCv: trainMetrics.model.vocab_search_cv,
    cFocus: trainMetrics.model.c_focus,
    cSafety: trainMetrics.model.c_safety,
    int8Agreement: trainMetrics.model.int8_vs_float_focus_agreement,
  },
  focusMajorityBaselineMacroF1: trainMetrics.dev.focus_majority_baseline_macro_f1,
  featureAblationFocusMacroF1: trainMetrics.dev.feature_ablation_focus_macro_f1,
  splits,
};

writeFileSync(join(here, "reports/system-metrics.json"), `${JSON.stringify(out, null, 2)}\n`);
for (const [name, split] of Object.entries(splits)) {
  console.log(name, JSON.stringify({ n: split.n, focus: split.focus.macro_f1, focusAcc: split.focus.accuracy, safety: split.safety.macro_f1, crisis: split.crisis, byLang: split.byLanguage, us: split.inferenceUsPerQuestion }, null, 1));
}
