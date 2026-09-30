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
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <div className="border-t border-ink pt-4">
          <p className="label !text-ink">Ablations the harness runs</p>
          <ol className="mt-3">
            {VARIANT_ROWS.map(([key, label]) => (
              <li key={key} className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-rule py-2.5 text-[0.98rem]">
                <span className="font-mono text-[0.75rem] leading-6 text-accent">{key}</span>
                <span className="text-ink-2">{label}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-3">
            Metrics: validity at the first attempt, share served from the model vs. the fallback, mean model calls, p50/p95 latency and tokens; for the v1 baseline, how often
            shipped text names undrawn cards or overclaims certainty. Results are broken down by subset (adversarial, sensitive, Chinese…).
          </p>
        </div>
        <div className="border-t border-ink pt-4">
          <p className="label !text-ink">Dataset · 55 readings</p>
          <ul className="mt-3">
            {DATASET.map(([n, label]) => (
              <li key={label} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-rule py-2.5 text-[0.98rem]">
                <span className="text-right font-mono text-[0.8rem] leading-6 tabular-nums text-ink">{n}</span>
                <span className="text-ink-2">{label}</span>
              </li>
            ))}
          </ul>
          <pre className="mt-5 whitespace-pre-wrap break-all bg-paper-3/70 p-3 font-mono text-[0.7rem] leading-relaxed text-ink">
            CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… npm run eval -- --provider workers-ai --publish
          </pre>
          <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-3">
            Real-model results appear here once the harness has been run against Workers AI (it needs the account's API token, so it runs in CI or locally, not in this page).{" "}
            <a className="link" href={codeLink("ml/evals/run.ts")} target="_blank" rel="noreferrer">
              Harness source
            </a>
          </p>
        </div>
      </div>
    );
  }

  const rows = Object.entries(published.variants);
  return (
    <div className="overflow-x-auto border-t border-ink pt-4">
      <p className="label">
        {published.meta.provider} · {published.meta.model} · {published.meta.cases} readings, {published.meta.followUps} follow-ups · {new Date(published.meta.date).toLocaleDateString()}
      </p>
      <table className="mt-4 w-full min-w-[40rem] text-left text-[0.95rem]">
        <thead>
          <tr className="border-b border-ink">
            {["Variant", "Valid at 1st call", "Served from model", "Fallback", "Mean calls", "p50 / p95"].map((h) => (
              <th key={h} className="label py-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-[0.8rem] tabular-nums text-ink-2">
          {rows.map(([name, v]) =>
            "baseline" in v ? (
              <tr key={name} className="border-b border-rule">
                <td className="py-2.5 pr-3 text-accent">{name}</td>
                <td className="py-2.5 pr-3" colSpan={3}>
                  parseable {pct(v.baseline.parsed)} · undrawn cards shipped {pct(v.baseline.shippedHallucinatedCards)} · overclaims shipped {pct(v.baseline.shippedPolicyViolations)}
                </td>
                <td className="py-2.5 pr-3">1</td>
                <td className="py-2.5 pr-3">
                  {ms(v.baseline.latencyMs.p50)} / {ms(v.baseline.latencyMs.p95)}
                </td>
              </tr>
            ) : (
              <tr key={name} className="border-b border-rule">
                <td className="py-2.5 pr-3 text-accent">{name}</td>
                <td className="py-2.5 pr-3">{pct(v.readings.validAtFirstAttempt)}</td>
                <td className="py-2.5 pr-3">{pct(v.readings.servedFromModel)}</td>
                <td className="py-2.5 pr-3">{pct(v.readings.fallback)}</td>
                <td className="py-2.5 pr-3">{v.readings.meanAttempts ?? "—"}</td>
                <td className="py-2.5 pr-3">
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
