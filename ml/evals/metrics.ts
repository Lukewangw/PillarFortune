/** Aggregation and reporting for eval runs (shared by run.ts and the "How it works" page). */

export interface AttemptLite {
  verdict: string;
  latencyMs: number;
  constrained: boolean;
  codes: string[];
  usage?: { promptTokens?: number; completionTokens?: number };
}

interface Base {
  caseId: string;
  variant: string;
  tags: string[];
  spread: string;
  focus: string;
  safety: string;
}

export type CaseRecord = Base &
  (
    | { kind: "blocked" }
    | {
        kind: "baseline";
        baseline: {
          latencyMs: number;
          usage?: { promptTokens?: number; completionTokens?: number };
          error?: string;
          parsed: boolean;
          hallucinatedCards: boolean;
          policyViolation: boolean;
          allCardsMentioned: boolean;
          raw: string;
        };
      }
    | {
        kind: "pipeline";
        reading: { outcome: string; fallbackReason?: string; latencyMs: number; attempts: AttemptLite[] };
        followUps: Array<{ message: string; outcome: string; latencyMs: number; attempts: AttemptLite[]; answer: string; referencedCards: string[] }>;
        sample: { summary: string; cards: string[] };
      }
  );

const round = (x: number, digits = 4) => Math.round(x * 10 ** digits) / 10 ** digits;
const rate = (hits: number, n: number) => (n ? round(hits / n) : null);

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

export interface PipelineStats {
  n: number;
  validAtFirstAttempt: number | null;
  servedFromModel: number | null;
  repaired: number | null;
  fallback: number | null;
  meanAttempts: number | null;
  latencyMs: { p50: number | null; p95: number | null };
  meanTokens: { prompt: number; completion: number } | null;
  firstAttemptIssues: Record<string, number>;
  caughtUndrawnCardMentions: number;
  fallbackReasons: Record<string, number>;
}

function pipelineStats(items: Array<{ outcome: string; latencyMs: number; attempts: AttemptLite[]; fallbackReason?: string }>): PipelineStats {
  const n = items.length;
  const firstAttemptIssues: Record<string, number> = {};
  const fallbackReasons: Record<string, number> = {};
  let caught = 0;
  let prompt = 0;
  let completion = 0;
  let withUsage = 0;
  for (const item of items) {
    for (const code of item.attempts[0]?.codes ?? []) firstAttemptIssues[code] = (firstAttemptIssues[code] ?? 0) + 1;
    for (const attempt of item.attempts) caught += attempt.codes.filter((c) => c === "undrawn_card_mention").length;
    if (item.fallbackReason) fallbackReasons[item.fallbackReason] = (fallbackReasons[item.fallbackReason] ?? 0) + 1;
    const usage = item.attempts.filter((a) => a.usage);
    if (usage.length) {
      withUsage++;
      prompt += usage.reduce((s, a) => s + (a.usage?.promptTokens ?? 0), 0);
      completion += usage.reduce((s, a) => s + (a.usage?.completionTokens ?? 0), 0);
    }
  }
  return {
    n,
    validAtFirstAttempt: rate(items.filter((i) => i.attempts[0]?.verdict === "accepted").length, n),
    servedFromModel: rate(items.filter((i) => i.outcome === "accepted" || i.outcome === "repaired").length, n),
    repaired: rate(items.filter((i) => i.outcome === "repaired").length, n),
    fallback: rate(items.filter((i) => i.outcome === "fallback").length, n),
    meanAttempts: n ? round(items.reduce((s, i) => s + i.attempts.length, 0) / n, 3) : null,
    latencyMs: { p50: quantile(items.map((i) => i.latencyMs), 0.5), p95: quantile(items.map((i) => i.latencyMs), 0.95) },
    meanTokens: withUsage ? { prompt: Math.round(prompt / withUsage), completion: Math.round(completion / withUsage) } : null,
    firstAttemptIssues: Object.fromEntries(Object.entries(firstAttemptIssues).sort((a, b) => b[1] - a[1])),
    caughtUndrawnCardMentions: caught,
    fallbackReasons,
  };
}

export interface BaselineStats {
  n: number;
  parsed: number | null;
  shippedHallucinatedCards: number | null;
  shippedPolicyViolations: number | null;
  allDrawnCardsMentioned: number | null;
  providerErrors: number | null;
  latencyMs: { p50: number | null; p95: number | null };
}

export interface EvalSummary {
  meta: {
    provider: string;
    model: string;
    profile?: string;
    date: string;
    cases: number;
    followUps: number;
    variants: Record<string, string>;
  };
  variants: Record<string, { readings: PipelineStats; followUps: PipelineStats; subsets: Record<string, PipelineStats> } | { baseline: BaselineStats }>;
}

export function summarize(records: CaseRecord[], meta: EvalSummary["meta"]): EvalSummary {
  const variants: EvalSummary["variants"] = {};
  for (const variant of Object.keys(meta.variants)) {
    const rows = records.filter((r) => r.variant === variant);
    const baselineRows = rows.flatMap((r) => (r.kind === "baseline" ? [r.baseline] : []));
    if (baselineRows.length) {
      const n = baselineRows.length;
      variants[variant] = {
        baseline: {
          n,
          parsed: rate(baselineRows.filter((b) => b.parsed).length, n),
          shippedHallucinatedCards: rate(baselineRows.filter((b) => b.hallucinatedCards).length, n),
          shippedPolicyViolations: rate(baselineRows.filter((b) => b.policyViolation).length, n),
          allDrawnCardsMentioned: rate(baselineRows.filter((b) => b.allCardsMentioned).length, n),
          providerErrors: rate(baselineRows.filter((b) => b.error).length, n),
          latencyMs: { p50: quantile(baselineRows.map((b) => b.latencyMs), 0.5), p95: quantile(baselineRows.map((b) => b.latencyMs), 0.95) },
        },
      };
      continue;
    }
    const pipelineRows = rows.flatMap((r) => (r.kind === "pipeline" ? [r] : []));
    const subsets: Record<string, PipelineStats> = {};
    for (const tag of ["normal", "adversarial", "sensitive", "edge", "zh"]) {
      const subset = pipelineRows.filter((r) => r.tags.includes(tag)).map((r) => r.reading);
      if (subset.length) subsets[tag] = pipelineStats(subset);
    }
    variants[variant] = {
      readings: pipelineStats(pipelineRows.map((r) => r.reading)),
      followUps: pipelineStats(pipelineRows.flatMap((r) => r.followUps)),
      subsets,
    };
  }
  return { meta, variants };
}

const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const ms = (x: number | null) => (x === null ? "—" : x >= 1000 ? `${(x / 1000).toFixed(2)} s` : `${x} ms`);

export function toMarkdown(summary: EvalSummary): string {
  const { meta } = summary;
  const lines = [
    `# Eval report — ${meta.provider} / ${meta.model}${meta.profile ? ` (profile: ${meta.profile})` : ""}`,
    "",
    `${meta.cases} readings, ${meta.followUps} follow-ups · ${meta.date}`,
    "",
    "## Readings",
    "",
    "| Variant | valid @ 1st attempt | served from model | repaired | fallback | mean attempts | p50 | p95 | tokens in/out |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const [name, v] of Object.entries(summary.variants)) {
    if ("baseline" in v) continue;
    const r = v.readings;
    lines.push(
      `| ${name} | ${pct(r.validAtFirstAttempt)} | ${pct(r.servedFromModel)} | ${pct(r.repaired)} | ${pct(r.fallback)} | ${r.meanAttempts ?? "—"} | ${ms(r.latencyMs.p50)} | ${ms(r.latencyMs.p95)} | ${r.meanTokens ? `${r.meanTokens.prompt}/${r.meanTokens.completion}` : "—"} |`,
    );
  }
  const baselines = Object.entries(summary.variants).filter(([, v]) => "baseline" in v);
  if (baselines.length) {
    lines.push("", "## Original v1 pipeline (audited with the v2 validators)", "", "| Variant | parseable JSON | shipped undrawn-card mentions | shipped policy violations | all drawn cards mentioned | p50 |", "|---|---|---|---|---|---|");
    for (const [name, v] of baselines) {
      if (!("baseline" in v)) continue;
      const b = v.baseline;
      lines.push(`| ${name} | ${pct(b.parsed)} | ${pct(b.shippedHallucinatedCards)} | ${pct(b.shippedPolicyViolations)} | ${pct(b.allDrawnCardsMentioned)} | ${ms(b.latencyMs.p50)} |`);
    }
    lines.push("", "Every v2 variant ships 0% undrawn-card mentions and 0% schema or policy violations by construction: invalid outputs are repaired or replaced by the validated fallback.");
  }
  lines.push("", "## Follow-ups", "", "| Variant | valid @ 1st attempt | served from model | fallback | mean attempts | p50 |", "|---|---|---|---|---|---|");
  for (const [name, v] of Object.entries(summary.variants)) {
    if ("baseline" in v) continue;
    const f = v.followUps;
    lines.push(`| ${name} | ${pct(f.validAtFirstAttempt)} | ${pct(f.servedFromModel)} | ${pct(f.fallback)} | ${f.meanAttempts ?? "—"} | ${ms(f.latencyMs.p50)} |`);
  }
  const production = summary.variants["v2-constrained"] ?? Object.values(summary.variants).find((v) => !("baseline" in v));
  if (production && !("baseline" in production)) {
    lines.push("", "## First-attempt failure modes (production variant)", "", "| Issue | count |", "|---|---|");
    for (const [code, count] of Object.entries(production.readings.firstAttemptIssues)) lines.push(`| ${code} | ${count} |`);
    lines.push("", "## By subset (production variant)", "", "| Subset | n | valid @ 1st | fallback | mean attempts |", "|---|---|---|---|---|");
    for (const [tag, s] of Object.entries(production.subsets)) lines.push(`| ${tag} | ${s.n} | ${pct(s.validAtFirstAttempt)} | ${pct(s.fallback)} | ${s.meanAttempts} |`);
  }
  return `${lines.join("\n")}\n`;
}
