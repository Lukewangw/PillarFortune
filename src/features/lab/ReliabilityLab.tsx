import { CheckCircle2, CircleAlert, RotateCcw } from "lucide-react";
import { useState } from "react";
import simulation from "../../../ml/evals/results/simulation.json";
import { interpretDraw } from "../../core/llm/pipeline";
import { FAULT_MODES, FAULT_PROFILES, FaultInjectionProvider } from "../../core/llm/providers/faultInjection";
import { Tracer } from "../../core/llm/trace";
import { drawCards } from "../../core/tarot/engine";
import { randomSeed } from "../../core/tarot/rng";
import { Figure, LineChart, type LineSeries } from "./charts";

const ORDINAL = ["var(--viz-ord-1)", "var(--viz-ord-2)", "var(--viz-ord-3)", "var(--viz-ord-4)"];
const pct = (v: number) => `${Math.round(v * 100)}%`;

type Cell = (typeof simulation.grid)[number];

function seriesFor(metric: "fallback" | "meanAttempts"): LineSeries[] {
  const cells = simulation.grid.filter((c: Cell) => c.repairFactor === 1);
  return [1, 2, 3, 4].map((k, i) => {
    const analytic = (p: number) => (metric === "fallback" ? p ** k : (1 - p ** k) / (1 - p));
    return {
      key: `k${k}`,
      label: `${k} call${k > 1 ? "s" : ""}`,
      color: ORDINAL[i],
      line: Array.from({ length: 36 }, (_, j) => {
        const p = 0.05 + (0.7 - 0.05) * (j / 35);
        return { x: p, y: analytic(p) };
      }),
      dots: cells.filter((c: Cell) => c.k === k).map((c: Cell) => ({ x: c.p, y: metric === "fallback" ? c.fallback : c.meanAttempts })),
    };
  });
}

interface SimResult {
  n: number;
  accepted: number;
  repaired: number;
  fallback: number;
  attempts: number;
}

async function simulate(p: number, k: number, repairFactor: number, n: number, onProgress: (done: number) => void): Promise<SimResult> {
  const base = FAULT_PROFILES.flaky;
  const total = FAULT_MODES.reduce((s, m) => s + base[m], 0);
  const profile = { ...Object.fromEntries(FAULT_MODES.map((m) => [m, (base[m] / total) * p])), repairFactor, latencyMs: [0, 0] } as typeof base;
  const out: SimResult = { n, accepted: 0, repaired: 0, fallback: 0, attempts: 0 };
  const salt = randomSeed();
  for (let i = 0; i < n; i++) {
    const draw = drawCards({ seed: `${salt}-${i}`, spread: (["single", "three", "cross"] as const)[i % 3] });
    const result = await interpretDraw(
      new FaultInjectionProvider(profile, `${salt}:${i}`, async () => {}),
      { draw, question: "What should I focus on?", focus: "general", safety: "none" },
      { tracer: new Tracer("reading"), policy: { maxAttempts: k, backoffMs: () => 0 } },
    );
    out.attempts += result.attempts.length;
    if (result.outcome === "accepted") out.accepted++;
    else if (result.outcome === "repaired") out.repaired++;
    else out.fallback++;
    if (i % 25 === 24) {
      onProgress(i + 1);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return out;
}

function OutcomeBar({ result }: { result: SimResult }) {
  const parts = [
    { key: "accepted", label: "Accepted first try", value: result.accepted, color: "var(--viz-good)", Icon: CheckCircle2 },
    { key: "repaired", label: "Repaired", value: result.repaired, color: "var(--viz-warn)", Icon: RotateCcw },
    { key: "fallback", label: "Fallback", value: result.fallback, color: "var(--viz-crit)", Icon: CircleAlert },
  ];
  return (
    <div className="viz">
      <div className="flex h-3 w-full gap-[2px]">
        {parts.map((part) =>
          part.value > 0 ? <div key={part.key} style={{ width: `${(part.value / result.n) * 100}%`, background: part.color }} title={`${part.label}: ${part.value}`} /> : null,
        )}
      </div>
      <ul className="mt-3 grid gap-1.5 text-[0.92rem] sm:grid-cols-3">
        {parts.map(({ key, label, value, color, Icon }) => (
          <li key={key} className="flex items-center gap-2 text-star-2">
            <Icon className="h-3.5 w-3.5" style={{ color }} />
            <strong className="font-mono text-[0.8rem] font-medium tabular-nums text-star">{pct(value / result.n)}</strong> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReliabilityLab() {
  const [p, setP] = useState(0.4);
  const [k, setK] = useState(3);
  const [repairFactor, setRepairFactor] = useState(1);
  const [running, setRunning] = useState<number | null>(null);
  const [result, setResult] = useState<(SimResult & { p: number; k: number; repairFactor: number }) | null>(null);
  const N = 300;

  const run = async () => {
    setRunning(0);
    const r = await simulate(p, k, repairFactor, N, setRunning);
    setResult({ ...r, p, k, repairFactor });
    setRunning(null);
  };

  const totalRequests = simulation.grid.length * simulation.requestsPerCell;
  const invalid = simulation.grid.reduce((s: number, c: Cell) => s + c.invalidShipped, 0);

  return (
    <div className="space-y-14">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
        <Figure n="1" title="Fallback rate vs. per-attempt failure rate" note="Dots: simulated requests through the production pipeline. Lines: pᵏ for independent failures.">
          <LineChart
            series={seriesFor("fallback")}
            xDomain={[0.05, 0.72]}
            yDomain={[0, 0.75]}
            xTicks={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]}
            yTicks={[0, 0.25, 0.5, 0.75]}
            formatX={pct}
            formatY={pct}
            xLabel="probability that one model call fails validation"
            dotsLabel="simulated"
            lineLabel="pᵏ"
          />
        </Figure>
        <Figure n="2" title="Cost: model calls per request" note="The price of reliability: expected calls (1 − pᵏ) / (1 − p) stay under 2 even at a 50% failure rate.">
          <LineChart
            series={seriesFor("meanAttempts")}
            xDomain={[0.05, 0.72]}
            yDomain={[1, 3]}
            xTicks={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]}
            yTicks={[1, 1.5, 2, 2.5, 3]}
            formatX={pct}
            formatY={(v) => v.toFixed(2)}
            xLabel="probability that one model call fails validation"
            dotsLabel="simulated"
            lineLabel="expected"
          />
        </Figure>
      </div>

      <div className="border-t border-gold/50 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="text-[1.25rem] leading-snug">Run it yourself — in your browser, on the real pipeline code</p>
          <p className="text-[0.92rem] text-star-3">
            Committed sweep: {totalRequests.toLocaleString()} simulated requests, <span className="text-ok">{invalid} invalid outputs shipped</span>.
          </p>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <label className="block">
            <span className="label">Per-attempt failure rate</span> <span className="ml-1 font-mono text-[0.8rem] text-star">{pct(p)}</span>
            <input type="range" min={0} max={0.8} step={0.05} value={p} onChange={(e) => setP(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-gold)]" />
          </label>
          <label className="block">
            <span className="label">Max model calls</span> <span className="ml-1 font-mono text-[0.8rem] text-star">{k}</span>
            <input type="range" min={1} max={5} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-gold)]" />
          </label>
          <label className="block">
            <span className="label">Repair feedback effect</span>{" "}
            <span className="ml-1 font-mono text-[0.8rem] text-star">{repairFactor === 1 ? "none" : `−${Math.round((1 - repairFactor) * 100)}% failures`}</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.1}
              value={repairFactor}
              onChange={(e) => setRepairFactor(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-gold)]"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => void run()} disabled={running !== null} className="btn btn-primary">
            {running !== null ? `Running… ${running}/${N}` : `Simulate ${N} requests`}
          </button>
          {result && (
            <p className="font-mono text-[0.75rem] text-star-3">
              p = {pct(result.p)}, k = {result.k}: mean {(result.attempts / result.n).toFixed(2)} calls per request
              {result.repairFactor === 1 && ` · predicted fallback ${(result.p ** result.k * 100).toFixed(1)}%`}
            </p>
          )}
        </div>
        {result && (
          <div className="mt-5">
            <OutcomeBar result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
