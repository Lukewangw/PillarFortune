import { CARDS, DECK_SIZE } from "./deck";
import { Xoshiro128 } from "./rng";
import { SPREADS, type SpreadId } from "./spreads";
import type { Orientation } from "./types";

/**
 * Deterministic card selection, fully separated from interpretation.
 *
 *   (seed) --xoshiro128** + Fisher–Yates--> shuffled deck + per-slot orientation
 *   (shuffled deck, user's picks) --> drawn cards, in spread-position order
 *
 * The client renders the shuffled deck face-down and the user picks slots; the
 * server recomputes the identical draw from (seed, spread, picks) and never
 * trusts card names sent by a client. The LLM only ever receives the result.
 */
export const SHUFFLE_ALGORITHM = "xoshiro128ss-fisher-yates-v1";
export const REVERSAL_PROBABILITY = 0.3;
const REVERSAL_THRESHOLD = Math.floor(REVERSAL_PROBABILITY * 2 ** 32);
const SEED_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export class DrawError extends Error {
  override name = "DrawError";
}

export interface ShuffledDeck {
  seed: string;
  /** order[slot] = index into CARDS of the card lying face-down in that slot. */
  order: number[];
  /** reversed[slot] = orientation of the card in that slot. */
  reversed: boolean[];
}

export interface DrawnCard {
  cardId: string;
  name: string;
  position: string;
  positionLabel: string;
  orientation: Orientation;
  /** Which face-down slot of the shuffled deck the user picked. */
  deckIndex: number;
}

export interface Draw {
  seed: string;
  spread: SpreadId;
  picks: number[];
  cards: DrawnCard[];
  algorithm: string;
}

export function assertValidSeed(seed: unknown): asserts seed is string {
  if (typeof seed !== "string" || !SEED_PATTERN.test(seed)) {
    throw new DrawError("seed must be 1-128 characters of [A-Za-z0-9_.:-].");
  }
}

export function shuffleDeck(seed: string): ShuffledDeck {
  assertValidSeed(seed);
  const rng = Xoshiro128.fromSeed(`${SHUFFLE_ALGORITHM}:${seed}`);
  const order = Array.from({ length: DECK_SIZE }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const reversed = order.map(() => rng.chance(REVERSAL_THRESHOLD));
  return { seed, order, reversed };
}

export function defaultPicks(spread: SpreadId): number[] {
  return SPREADS[spread].positions.map((_, i) => i);
}

function assertValidPicks(picks: unknown, count: number): asserts picks is number[] {
  if (!Array.isArray(picks) || picks.length !== count) {
    throw new DrawError(`picks must contain exactly ${count} deck positions.`);
  }
  const seen = new Set<number>();
  for (const pick of picks) {
    if (!Number.isInteger(pick) || pick < 0 || pick >= DECK_SIZE) {
      throw new DrawError(`each pick must be an integer in [0, ${DECK_SIZE - 1}].`);
    }
    if (seen.has(pick)) throw new DrawError("picks must be distinct.");
    seen.add(pick);
  }
}

export function drawCards(input: { seed: string; spread: SpreadId; picks?: number[] }): Draw {
  const spread = SPREADS[input.spread];
  if (!spread) throw new DrawError(`unknown spread: ${String(input.spread)}`);
  const picks = input.picks ?? defaultPicks(input.spread);
  assertValidPicks(picks, spread.positions.length);
  const deck = shuffleDeck(input.seed);

  const cards = spread.positions.map((position, i): DrawnCard => {
    const deckIndex = picks[i];
    const card = CARDS[deck.order[deckIndex]];
    return {
      cardId: card.id,
      name: card.name,
      position: position.id,
      positionLabel: position.label,
      orientation: deck.reversed[deckIndex] ? "reversed" : "upright",
      deckIndex,
    };
  });

  return { seed: input.seed, spread: input.spread, picks: [...picks], cards, algorithm: SHUFFLE_ALGORITHM };
}

/** True when two draws name the same cards in the same positions and orientations. */
export function sameCards(a: Pick<Draw, "cards">, b: Pick<Draw, "cards">): boolean {
  return (
    a.cards.length === b.cards.length &&
    a.cards.every(
      (card, i) =>
        card.cardId === b.cards[i].cardId &&
        card.position === b.cards[i].position &&
        card.orientation === b.cards[i].orientation,
    )
  );
}
