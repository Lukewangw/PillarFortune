/**
 * Ten gods (十神): the relationship of any stem to the Day Master, derived from the
 * five-phase cycles and polarity.
 *
 *   relation to the Day Master (DM)      same polarity   different polarity
 *   same element                          比肩 Friend      劫财 Rob Wealth
 *   element the DM produces               食神 Eating God  伤官 Hurting Officer
 *   element the DM controls               偏财 Indirect W. 正财 Direct Wealth
 *   element that controls the DM          七杀 Seven K.    正官 Direct Officer
 *   element that produces the DM          偏印 Indirect R. 正印 Direct Resource
 */

import { CONTROLS, deepFreeze, GENERATES, HEAVENLY_STEMS, type HeavenlyStem } from "./data";

export type TenGodKey =
  | "friend"
  | "robWealth"
  | "eatingGod"
  | "hurtingOfficer"
  | "indirectWealth"
  | "directWealth"
  | "sevenKillings"
  | "directOfficer"
  | "indirectResource"
  | "directResource";

/** The five families of ten gods, by the other stem's element relative to the Day Master's. */
export type TenGodGroup = "companion" | "output" | "wealth" | "power" | "resource";

export interface TenGod {
  key: TenGodKey;
  chinese: string;
  pinyin: string;
  english: string;
  group: TenGodGroup;
}

export const TEN_GODS: Readonly<Record<TenGodKey, TenGod>> = deepFreeze({
  friend: { key: "friend", chinese: "比肩", pinyin: "bǐjiān", english: "Friend", group: "companion" },
  robWealth: { key: "robWealth", chinese: "劫财", pinyin: "jiécái", english: "Rob Wealth", group: "companion" },
  eatingGod: { key: "eatingGod", chinese: "食神", pinyin: "shíshén", english: "Eating God", group: "output" },
  hurtingOfficer: { key: "hurtingOfficer", chinese: "伤官", pinyin: "shāngguān", english: "Hurting Officer", group: "output" },
  indirectWealth: { key: "indirectWealth", chinese: "偏财", pinyin: "piāncái", english: "Indirect Wealth", group: "wealth" },
  directWealth: { key: "directWealth", chinese: "正财", pinyin: "zhèngcái", english: "Direct Wealth", group: "wealth" },
  sevenKillings: { key: "sevenKillings", chinese: "七杀", pinyin: "qīshā", english: "Seven Killings", group: "power" },
  directOfficer: { key: "directOfficer", chinese: "正官", pinyin: "zhèngguān", english: "Direct Officer", group: "power" },
  indirectResource: { key: "indirectResource", chinese: "偏印", pinyin: "piānyìn", english: "Indirect Resource", group: "resource" },
  directResource: { key: "directResource", chinese: "正印", pinyin: "zhèngyìn", english: "Direct Resource", group: "resource" },
});

/** Keys in the traditional order 比肩, 劫财, 食神, 伤官, 偏财, 正财, 七杀, 正官, 偏印, 正印. */
export const TEN_GOD_ORDER: readonly TenGodKey[] = deepFreeze([
  "friend",
  "robWealth",
  "eatingGod",
  "hurtingOfficer",
  "indirectWealth",
  "directWealth",
  "sevenKillings",
  "directOfficer",
  "indirectResource",
  "directResource",
]);

function toStem(stem: HeavenlyStem | number): HeavenlyStem {
  if (typeof stem !== "number") return stem;
  const found = Number.isInteger(stem) ? HEAVENLY_STEMS[stem] : undefined;
  if (!found) throw new RangeError(`Stem index must be an integer 0–9, got ${stem}.`);
  return found;
}

/**
 * The ten god that `other` represents for the given Day Master.
 * Accepts stem records or stem indices (0–9, 甲 = 0).
 */
export function tenGodOf(dayMaster: HeavenlyStem | number, other: HeavenlyStem | number): TenGod {
  const dm = toStem(dayMaster);
  const o = toStem(other);
  const same = dm.polarity === o.polarity;
  if (o.element === dm.element) return TEN_GODS[same ? "friend" : "robWealth"];
  if (GENERATES[dm.element] === o.element) return TEN_GODS[same ? "eatingGod" : "hurtingOfficer"];
  if (CONTROLS[dm.element] === o.element) return TEN_GODS[same ? "indirectWealth" : "directWealth"];
  if (CONTROLS[o.element] === dm.element) return TEN_GODS[same ? "sevenKillings" : "directOfficer"];
  // Only remaining relation: `other` produces the Day Master.
  return TEN_GODS[same ? "indirectResource" : "directResource"];
}
