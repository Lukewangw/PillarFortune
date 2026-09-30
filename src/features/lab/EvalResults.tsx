import { FlaskConical, Terminal } from "lucide-react";
import type { EvalSummary } from "../../../ml/evals/metrics";
import { codeLink } from "../../lib/config";

// Real-model results are committed after running the harness against Workers AI (see README).
const published = Object.values(import.meta.glob("../../../ml/evals/results/eval-latest.json", { eager: true, import: "default" }))[0] as EvalSummary | undefined;

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);
const ms = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`);

const VARIANT_ROWS = [
  ["v1-baseline", "Original v1: free-form JSON, one call, JSON.parse"],
  ["v2-single", "Grounded prompt + validator, 1 call, fallback"],
  ["v2-repair", "+ validation-feedback repair (≤ 3 calls)"],
  ["v2-constrained", "+ JSON-Schema constrained decoding (production)"],
];

const DATASET = [
  ["33", "ordinary questions across all five focus areas and three spreads"],
  ["10", "adversarial: prompt injection, format attacks, requests for undrawn cards, demands for certainty"],
  ["6", "sensitive: medical and high-stakes legal/financial"],
  ["6", "edge cases: two-word, very long, emoji, either/or decisions"],
  ["5", "in Chinese (answers must follow the question's language)"],
  ["21", "follow-up turns, incl. questions about cards that were not drawn"],
];

export function EvalResults() {
  if (!published) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-mist-100">
            <FlaskConical className="h-4 w-4 text-gold-300" /> Ablations the harness runs
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-mist-400">
            {VARIANT_ROWS.map(([key, label]) => (
              <li key={key}>
                <span className="font-mono text-xs text-gold-300/80">{key}</span> — {label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-mist-500">
            Metrics: validity at the first attempt, share served from the model vs. the fallback, mean model calls, p50/p95 latency and tokens; for the v1 baseline, how often
            shipped text names undrawn cards or overclaims certainty. Results are broken down by subset (adversarial, sensitive, Chinese…).
          </p>
        </div>
        <div className="panel p-5">
          <h3 className="text-sm font-medium text-mist-100">Dataset — 55 readings</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-mist-400">
            {DATASET.map(([n, label]) => (
              <li key={label} className="grid grid-cols-[2.25rem_1fr] gap-2">
                <span className="text-right tabular-nums text-mist-100">{n}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/[0.03] p-3 font-mono text-[11px] leading-relaxed text-mist-300">
            <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300" />
            CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run eval -- --provider workers-ai --publish
          </p>
          <p className="mt-2 text-xs text-mist-500">
            Real-model results appear here once the harness has been run against Workers AI (it needs the account's API token, so it runs in CI or locally, not in this page).{" "}
            <a className="text-gold-300 hover:underline" href={codeLink("ml/evals/run.ts")} target="_blank" rel="noreferrer">
              Harness source
            </a>
          </p>
        </div>
      </div>
    );
  }

  const rows = Object.entries(published.variants);
  return (
    <div className="panel overflow-x-auto p-5">
      <p className="text-xs text-mist-500">
        {published.meta.provider} · {published.meta.model} · {published.meta.cases} readings, {published.meta.followUps} follow-ups · {new Date(published.meta.date).toLocaleDateString()}
      </p>
      <table className="mt-4 w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs text-mist-500">
          <tr>
            <th className="py-2 font-normal">Variant</th>
            <th className="py-2 font-normal">Valid at 1st call</th>
            <th className="py-2 font-normal">Served from model</th>
            <th className="py-2 font-normal">Fallback</th>
            <th className="py-2 font-normal">Mean calls</th>
            <th className="py-2 font-normal">p50 / p95</th>
          </tr>
        </thead>
        <tbody className="tabular-nums text-mist-200">
          {rows.map(([name, v]) =>
            "baseline" in v ? (
              <tr key={name} className="border-t border-white/5">
                <td className="py-2 font-mono text-xs">{name}</td>
                <td className="py-2" colSpan={3}>
                  parseable {pct(v.baseline.parsed)} · undrawn cards shipped {pct(v.baseline.shippedHallucinatedCards)} · overclaims shipped {pct(v.baseline.shippedPolicyViolations)}
                </td>
                <td className="py-2">1</td>
                <td className="py-2">
                  {ms(v.baseline.latencyMs.p50)} / {ms(v.baseline.latencyMs.p95)}
                </td>
              </tr>
            ) : (
              <tr key={name} className="border-t border-white/5">
                <td className="py-2 font-mono text-xs">{name}</td>
                <td className="py-2">{pct(v.readings.validAtFirstAttempt)}</td>
                <td className="py-2">{pct(v.readings.servedFromModel)}</td>
                <td className="py-2">{pct(v.readings.fallback)}</td>
                <td className="py-2">{v.readings.meanAttempts ?? "—"}</td>
                <td className="py-2">
                  {ms(v.readings.latencyMs.p50)} / {ms(v.readings.latencyMs.p95)}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
