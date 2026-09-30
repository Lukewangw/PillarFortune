/** Aggregates over llm_traces: the production-monitoring view of the reliability pipeline. */

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

interface Row {
  kind: string;
  outcome: string;
  attempts: number;
  first_attempt_valid: number;
  issue_codes: string;
  fallback_reason: string | null;
  latency_ms: number;
  model_latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  provider: string;
  model: string;
  created_at: string;
}

export async function computeMetrics(db: D1Database, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { results } = await db
    .prepare(
      `SELECT kind, outcome, attempts, first_attempt_valid, issue_codes, fallback_reason, latency_ms, model_latency_ms,
              prompt_tokens, completion_tokens, provider, model, created_at
       FROM llm_traces WHERE created_at >= ?1 ORDER BY created_at DESC LIMIT 5000`,
    )
    .bind(since)
    .all<Row>();

  const summarize = (rows: Row[]) => {
    const modelRuns = rows.filter((r) => r.attempts > 0);
    const byOutcome: Record<string, number> = {};
    for (const r of rows) byOutcome[r.outcome] = (byOutcome[r.outcome] ?? 0) + 1;
    const latencies = rows.map((r) => r.latency_ms).sort((a, b) => a - b);
    const modelLatencies = modelRuns.map((r) => r.model_latency_ms).sort((a, b) => a - b);
    const withTokens = modelRuns.filter((r) => r.prompt_tokens !== null);
    return {
      total: rows.length,
      byOutcome,
      modelRuns: modelRuns.length,
      validAtFirstAttempt: modelRuns.length ? modelRuns.filter((r) => r.first_attempt_valid).length / modelRuns.length : null,
      servedFromModel: modelRuns.length ? modelRuns.filter((r) => r.outcome === "accepted" || r.outcome === "repaired").length / modelRuns.length : null,
      fallbackRate: modelRuns.length ? modelRuns.filter((r) => r.outcome === "fallback").length / modelRuns.length : null,
      meanAttempts: modelRuns.length ? modelRuns.reduce((n, r) => n + r.attempts, 0) / modelRuns.length : null,
      latencyMs: { p50: quantile(latencies, 0.5), p95: quantile(latencies, 0.95) },
      modelLatencyMs: { p50: quantile(modelLatencies, 0.5), p95: quantile(modelLatencies, 0.95) },
      meanTokens: withTokens.length
        ? {
            prompt: Math.round(withTokens.reduce((n, r) => n + (r.prompt_tokens ?? 0), 0) / withTokens.length),
            completion: Math.round(withTokens.reduce((n, r) => n + (r.completion_tokens ?? 0), 0) / withTokens.length),
          }
        : null,
    };
  };

  const issues: Record<string, number> = {};
  const fallbackReasons: Record<string, number> = {};
  const models: Record<string, number> = {};
  const daily: Record<string, { readings: number; fallback: number }> = {};
  for (const r of results) {
    for (const code of JSON.parse(r.issue_codes) as string[]) issues[code] = (issues[code] ?? 0) + 1;
    if (r.fallback_reason) fallbackReasons[r.fallback_reason] = (fallbackReasons[r.fallback_reason] ?? 0) + 1;
    if (r.attempts > 0) models[`${r.provider}:${r.model}`] = (models[`${r.provider}:${r.model}`] ?? 0) + 1;
    if (r.kind === "reading") {
      const day = r.created_at.slice(0, 10);
      daily[day] ??= { readings: 0, fallback: 0 };
      daily[day].readings++;
      if (r.outcome === "fallback") daily[day].fallback++;
    }
  }

  return {
    window: { days, since },
    reading: summarize(results.filter((r) => r.kind === "reading")),
    followup: summarize(results.filter((r) => r.kind === "followup")),
    issues: Object.entries(issues).sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count })),
    fallbackReasons,
    models,
    daily: Object.entries(daily).sort().map(([day, v]) => ({ day, ...v })),
  };
}
