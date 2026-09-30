import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useEngine } from "../../lib/engineContext";
import { BarList, Figure, StatTile } from "./charts";

interface Summary {
  total: number;
  modelRuns: number;
  validAtFirstAttempt: number | null;
  servedFromModel: number | null;
  fallbackRate: number | null;
  meanAttempts: number | null;
  latencyMs: { p50: number | null; p95: number | null };
}
interface Metrics {
  window: { days: number };
  reading: Summary;
  followup: Summary;
  issues: Array<{ code: string; count: number }>;
}

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const sec = (v: number | null) => (v === null ? "—" : `${(v / 1000).toFixed(2)} s`);

export function LiveMetrics() {
  const { live } = useEngine();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (live.status !== "up") return;
    api
      .metrics(30)
      .then((m) => setMetrics(m as unknown as Metrics))
      .catch((e: Error) => setError(e.message));
  }, [live.status]);

  if (live.status !== "up") {
    return (
      <div className="max-w-[46rem] border-t border-gold/50 pt-4">
        <p className="label !text-star">Production monitoring</p>
        <p className="mt-2 text-[1rem] leading-relaxed text-star-2">
          When this page is served by the Cloudflare Worker, this section shows live numbers from the <span className="font-mono text-[0.8rem] text-star">llm_traces</span> table:
          validity at the first attempt, share served from the model, fallback rate and reasons, p50/p95 latency, tokens, and which validation checks fail most. This build is
          running without a backend, so there is nothing live to show.
        </p>
      </div>
    );
  }
  if (error) return <p className="text-[0.95rem] text-bad">{error}</p>;
  if (!metrics) return <p className="label">Loading live metrics…</p>;

  const r = metrics.reading;
  return (
    <div className="space-y-12">
      <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={`Readings · last ${metrics.window.days} days`} value={r.total.toLocaleString()} caption={`${metrics.followup.total.toLocaleString()} follow-ups`} />
        <StatTile label="Valid at the first model call" value={pct(r.validAtFirstAttempt)} caption={`served from the model: ${pct(r.servedFromModel)}`} />
        <StatTile label="Fallback rate" value={pct(r.fallbackRate)} caption={`mean model calls per reading: ${r.meanAttempts?.toFixed(2) ?? "—"}`} />
        <StatTile label="Latency p50 / p95" value={`${sec(r.latencyMs.p50)} / ${sec(r.latencyMs.p95)}`} caption="end-to-end inside the Worker" />
      </div>
      {metrics.issues.length > 0 && (
        <Figure n="8" title="What the validators catch in production">
          <BarList rows={metrics.issues.slice(0, 8).map((i) => ({ label: i.code, value: i.count }))} max={Math.max(...metrics.issues.map((i) => i.count))} format={(v) => String(v)} />
        </Figure>
      )}
    </div>
  );
}
