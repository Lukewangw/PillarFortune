import { describe, expect, it } from "vitest";
import { CARDS, DECK_SIZE } from "./deck";
import { DrawError, REVERSAL_PROBABILITY, drawCards, sameCards, shuffleDeck } from "./engine";
import { Xoshiro128, cyrb128, randomSeed } from "./rng";

describe("rng", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    const a = Xoshiro128.fromSeed("alpha");
    const b = Xoshiro128.fromSeed("alpha");
    const c = Xoshiro128.fromSeed("beta");
    const seqA = Array.from({ length: 16 }, () => a.nextU32());
    expect(Array.from({ length: 16 }, () => b.nextU32())).toEqual(seqA);
    expect(Array.from({ length: 16 }, () => c.nextU32())).not.toEqual(seqA);
  });

  it("produces unbiased bounded integers", () => {
    const rng = Xoshiro128.fromSeed("bounded");
    const counts = new Array(7).fill(0);
    for (let i = 0; i < 70_000; i++) counts[rng.nextInt(7)]++;
    for (const count of counts) expect(Math.abs(count - 10_000)).toBeLessThan(450); // > 4.5 sd
  });

  it("hashes seeds to 128 bits and makes 32-hex-char random seeds", () => {
    expect(cyrb128("x")).toHaveLength(4);
    expect(randomSeed()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("shuffleDeck", () => {
  it("returns a permutation of the 78-card deck", () => {
    const { order, reversed } = shuffleDeck("perm");
    expect(order).toHaveLength(DECK_SIZE);
    expect(new Set(order).size).toBe(DECK_SIZE);
    expect(reversed).toHaveLength(DECK_SIZE);
  });

  it("is reproducible and seed-sensitive", () => {
    expect(shuffleDeck("same")).toEqual(shuffleDeck("same"));
    const orders = new Set(Array.from({ length: 500 }, (_, i) => shuffleDeck(`s${i}`).order.slice(0, 6).join(",")));
    expect(orders.size).toBe(500);
  });

  it("puts every card in a given slot uniformly (chi-square, 78k seeds)", () => {
    const n = 78_000;
    for (const slot of [0, 41]) {
      const counts = new Array(DECK_SIZE).fill(0);
      for (let i = 0; i < n; i++) counts[shuffleDeck(`uniform-${i}`).order[slot]]++;
      const expected = n / DECK_SIZE;
      const chi2 = counts.reduce((sum, observed) => sum + (observed - expected) ** 2 / expected, 0);
      // Critical value for df = 77 at alpha = 0.001 (Wilson–Hilferty) ≈ 121.2.
      expect(chi2).toBeLessThan(121.2);
    }
  });

  it("reverses cards at the configured rate", () => {
    let reversed = 0;
    let total = 0;
    for (let i = 0; i < 2000; i++) {
      for (const r of shuffleDeck(`rev-${i}`).reversed) {
        reversed += r ? 1 : 0;
        total++;
      }
    }
    expect(Math.abs(reversed / total - REVERSAL_PROBABILITY)).toBeLessThan(0.006);
  });
});

describe("drawCards", () => {
  it("maps picks onto spread positions and is verifiable", () => {
    const draw = drawCards({ seed: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", spread: "three", picks: [10, 3, 77] });
    expect(draw.cards.map((c) => c.position)).toEqual(["past", "present", "future"]);
    expect(draw.cards.map((c) => c.deckIndex)).toEqual([10, 3, 77]);
    const deck = shuffleDeck(draw.seed);
    draw.cards.forEach((card) => {
      expect(card.cardId).toBe(CARDS[deck.order[card.deckIndex]].id);
      expect(card.orientation).toBe(deck.reversed[card.deckIndex] ? "reversed" : "upright");
    });
    // Recomputing from (seed, spread, picks) — what the server does — gives the same cards.
    expect(sameCards(draw, drawCards({ seed: draw.seed, spread: "three", picks: [10, 3, 77] }))).toBe(true);
    expect(sameCards(draw, drawCards({ seed: draw.seed, spread: "three", picks: [10, 3, 76] }))).toBe(false);
  });

  it("defaults to the top of the deck when no picks are given", () => {
    const draw = drawCards({ seed: "top", spread: "cross" });
    expect(draw.picks).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(draw.cards.map((c) => c.cardId)).size).toBe(5);
  });

  it("rejects invalid seeds and picks", () => {
    expect(() => drawCards({ seed: "", spread: "single" })).toThrow(DrawError);
    expect(() => drawCards({ seed: "bad seed!", spread: "single" })).toThrow(DrawError);
    expect(() => drawCards({ seed: "ok", spread: "three", picks: [1, 2] })).toThrow(/exactly 3/);
    expect(() => drawCards({ seed: "ok", spread: "three", picks: [1, 1, 2] })).toThrow(/distinct/);
    expect(() => drawCards({ seed: "ok", spread: "three", picks: [1, 2, 78] })).toThrow(/integer/);
    expect(() => drawCards({ seed: "ok", spread: "three", picks: [1, 2, 2.5] })).toThrow(/integer/);
  });
});
