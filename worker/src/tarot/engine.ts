import { tarotDeck } from "./deck";
import { spreadDefinitions } from "./spreads";
import { DrawnCard, SpreadType } from "./types";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawCards(spreadType: SpreadType, seedInput: string): DrawnCard[] {
  const positions = spreadDefinitions[spreadType];
  const rng = mulberry32(hashSeed(seedInput));
  const deck = [...tarotDeck];

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return positions.map((position, index) => {
    const card = deck[index];
    return {
      id: card.id,
      name: card.name,
      position,
      reversed: rng() > 0.72,
      keywords: card.keywords,
    };
  });
}
