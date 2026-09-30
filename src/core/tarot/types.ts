export type Arcana = "major" | "minor";
export type Suit = "wands" | "cups" | "swords" | "pentacles";
export type Element = "fire" | "water" | "air" | "earth";
export type Orientation = "upright" | "reversed";

/** One card of the 78-card Rider–Waite–Smith deck, with a short original knowledge-base entry. */
export interface CardData {
  /** Stable id: "major-00".."major-21", "<suit>-01".."<suit>-14" (01 = Ace, 11 = Page, 12 = Knight, 13 = Queen, 14 = King). */
  id: string;
  /** English name, e.g. "The Fool", "Ace of Wands", "Page of Cups". */
  name: string;
  /** Simplified Chinese name, e.g. "愚者", "权杖王牌", "圣杯侍从". */
  nameZh: string;
  arcana: Arcana;
  suit: Suit | null;
  /** 0–21 for the major arcana (RWS numbering: Strength = 8, Justice = 11); 1–14 for the minor arcana. */
  number: number;
  element: Element;
  keywords: { upright: string[]; reversed: string[] };
  meaning: { upright: string; reversed: string };
  /** One open question that invites self-reflection. */
  reflection: string;
}
