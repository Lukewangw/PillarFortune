/**
 * Reliability sweep: how the bounded-retry policy trades fallback rate against
 * cost (model calls) as the per-attempt failure rate grows. Runs the production
 * pipeline (interpretDraw) against the fault-injection model and compares the
 * empirical numbers with the closed form for independent failures:
 *   P(fallback) = p^k,   E[attempts] = (1 − p^k) / (1 − p)
 *
 *   npx tsx ml/evals/simulate.ts   → ml/evals/results/simulation.json
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { interpretDraw } from "../../src/core/llm/pipeline";
import { FAULT_MODES, FAULT_PROFILES, FaultInjectionProvider, type FaultProfile } from "../../src/core/llm/providers/faultInjection";
import { buildInterpretationSchema } from "../../src/core/llm/schemas";
import { Tracer } from "../../src/core/llm/trace";
import { validateInterpretation } from "../../src/core/llm/validate";
import { drawCards } from "../../src/core/tarot/engine";

const here = dirname(fileURLToPath(import.meta.url));
const N = 400;
const SPREADS = ["single", "three", "cross"] as const;

/** The "flaky" failure mix, rescaled so that the total per-attempt failure probability is p. */
function profileFor(p: number, repairFactor: number): FaultProfile {
  const base = FAULT_PROFILES.flaky;
  const total = FAULT_MODES.reduce((s, m) => s + base[m], 0);
  const scaled = Object.fromEntries(FAULT_MODES.map((m) => [m, (base[m] / total) * p])) as Record<(typeof FAULT_MODES)[number], number>;
  return { ...scaled, repairFactor, latencyMs: [0, 0] };
}

async function cell(p: number, k: number, repairFactor: number) {
  let fallback = 0;
  let accepted = 0;
  let attempts = 0;
  let invalidShipped = 0;
  for (let i = 0; i < N; i++) {
    const draw = drawCards({ seed: `sim-${p}-${k}-${repairFactor}-${i}`, spread: SPREADS[i % 3] });
    const provider = new FaultInjectionProvider(profileFor(p, repairFactor), `sim:${p}:${k}:${repairFactor}:${i}`, async () => {});
    const result = await interpretDraw(
      provider,
      { draw, question: "What should I focus on in the months ahead?", focus: "general", safety: "none" },
      { tracer: new Tracer("reading"), policy: { maxAttempts: k, backoffMs: () => 0 } },
    );
    attempts += result.attempts.length;
    if (result.outcome === "fallback") fallback++;
    if (result.outcome === "accepted") accepted++;
    if (validateInterpretation(result.interpretation, draw, buildInterpretationSchema(draw)).issues.length) invalidShipped++;
  }
  const analyticFallback = repairFactor === 1 ? p ** k : null;
  const analyticAttempts = repairFactor === 1 ? (1 - p ** k) / (1 - p) : null;
  return {
    p,
    k,
    repairFactor,
    n: N,
    fallback: fallback / N,
    validAtFirstAttempt: accepted / N,
    meanAttempts: attempts / N,
    analyticFallback,
    analyticMeanAttempts: analyticAttempts,
    invalidShipped,
  };
}

const grid = [];
for (const repairFactor of [1, 0.6]) {
  for (const p of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
    for (const k of [1, 2, 3, 4]) grid.push(await cell(p, k, repairFactor));
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  description:
    "Production pipeline (interpretDraw) against a simulated model whose per-attempt failure probability is p, using the 'flaky' mix of failure modes (invalid JSON, schema violations, wrong card references, undrawn cards, overconfident claims, transient errors). repairFactor < 1 means validation feedback makes later attempts less likely to fail.",
  requestsPerCell: N,
  grid,
};
writeFileSync(join(here, "results/simulation.json"), `${JSON.stringify(out, null, 2)}\n`);
const invalid = grid.reduce((s, g) => s + g.invalidShipped, 0);
console.log(`cells: ${grid.length}, requests: ${grid.length * N}, invalid outputs shipped: ${invalid}`);
for (const g of grid.filter((g) => g.repairFactor === 1 && (g.p === 0.3 || g.p === 0.5))) {
  console.log(`p=${g.p} k=${g.k}: fallback ${(g.fallback * 100).toFixed(1)}% (analytic ${(g.analyticFallback! * 100).toFixed(1)}%), attempts ${g.meanAttempts.toFixed(2)} (analytic ${g.analyticMeanAttempts!.toFixed(2)})`);
}
