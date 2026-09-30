import { useState } from "react";
import { CARDS, DECK_SIZE } from "../../core/tarot/deck";
import { REVERSAL_PROBABILITY, shuffleDeck } from "../../core/tarot/engine";
import { randomSeed } from "../../core/tarot/rng";
import { Figure, Histogram, StatTile } from "./charts";

/** Upper-tail probability of a chi-square statistic (Wilson–Hilferty normal approximation). */
function chiSquarePValue(x: number, df: number): number {
  const z = (Math.cbrt(x / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  // Standard normal upper tail via the complementary error function (Abramowitz–Stegun 7.1.26).
  const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-((z / Math.SQRT2) ** 2));
  const upper = z >= 0 ? (1 - erf) / 2 : (1 + erf) / 2;
  return Math.min(1, Math.max(0, upper));
}

interface Result {
  counts: number[];
  chi2: number;
  p: number;
  reversedRate: number;
  n: number;
  ms: number;
}

export function DrawLab() {
  const [running, setRunning] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const N = 78_000;

  const run = async () => {
    setRunning(0);
    const salt = randomSeed();
    const counts = new Array(DECK_SIZE).fill(0);
    let reversed = 0;
    const started = performance.now();
    for (let i = 0; i < N; i++) {
      const deck = shuffleDeck(`${salt}-${i}`);
      counts[deck.order[0]]++;
      if (deck.reversed[0]) reversed++;
      if (i % 6000 === 5999) {
        setRunning(i + 1);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    const expected = N / DECK_SIZE;
    const chi2 = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    setResult({ counts, chi2, p: chiSquarePValue(chi2, DECK_SIZE - 1), reversedRate: reversed / N, n: N, ms: performance.now() - started });
    setRunning(null);
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
      <div className="space-y-8">
        <StatTile label="Algorithm" value="xoshiro128**" caption="128-bit state seeded by cyrb128, unbiased Fisher–Yates (rejection sampling), 32-bit integer math only — bit-identical in browser, Worker and Node." />
        <StatTile label="Reversal probability" value={`${REVERSAL_PROBABILITY * 100}%`} caption="Drawn from the same seeded stream after the shuffle, so orientation is part of the verifiable draw." />
      </div>
      <Figure
        n="7"
        title="Is the shuffle fair? Test it."
        note={`Shuffle ${N.toLocaleString()} fresh seeds in your browser and count which card lands on top. Every card should appear about 1,000 times.`}
      >
        <button type="button" onClick={() => void run()} disabled={running !== null} className="btn btn-primary">
          {running !== null ? `Shuffling… ${Math.round((running / N) * 100)}%` : "Run the test"}
        </button>
        {result ? (
          <div className="mt-6">
            <Histogram values={result.counts} labels={CARDS.map((c) => c.name)} reference={result.n / DECK_SIZE} referenceLabel="expected 1,000" />
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">
              χ² = <span className="font-mono text-[0.85rem] text-ink">{result.chi2.toFixed(1)}</span> with 77 degrees of freedom, p ≈{" "}
              <span className="font-mono text-[0.85rem] text-ink">{result.p.toFixed(2)}</span> {result.p > 0.001 ? "— consistent with a uniform shuffle." : "— unusually far from uniform."}{" "}
              Reversed on top: {(result.reversedRate * 100).toFixed(1)}%. {Math.round(result.ms)} ms.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[0.92rem] italic text-ink-3">The same test runs in CI on fixed seeds (χ² &lt; 121.2, the α = 0.001 critical value), together with determinism and seed-sensitivity checks.</p>
        )}
      </Figure>
    </div>
  );
}
