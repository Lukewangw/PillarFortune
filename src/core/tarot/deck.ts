import { CARDS } from "./cards.data";
import type { CardData } from "./types";

export { CARDS };
export const DECK_SIZE = 78;

const BY_ID = new Map<string, CardData>(CARDS.map((card) => [card.id, card]));

export function isCardId(id: unknown): id is string {
  return typeof id === "string" && BY_ID.has(id);
}

export function getCard(id: string): CardData {
  const card = BY_ID.get(id);
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}
