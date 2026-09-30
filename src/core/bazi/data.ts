/**
 * Static reference data for the Four Pillars (BaZi, 八字) calculator:
 * the ten heavenly stems, the twelve earthly branches with their hidden stems,
 * the five phases and their cycles, and the twelve "jie" (节) solar terms that
 * open each BaZi month.
 *
 * Pure data + tiny helpers — no runtime dependencies, safe for browser, Worker and Node.
 */

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";

/**
 * Recursively freezes plain data. Chart objects embed these shared records, so freezing keeps
 * one consumer's accidental mutation from leaking into every later chart.
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value as object)) deepFreeze(inner);
  }
  return value;
}

/** The five phases (五行) in generating-cycle order. */
export const ELEMENTS: readonly Element[] = deepFreeze(["wood", "fire", "earth", "metal", "water"]);

export interface ElementInfo {
  key: Element;
  chinese: string;
  pinyin: string;
  english: string;
}

export const ELEMENT_INFO: Readonly<Record<Element, ElementInfo>> = deepFreeze({
  wood: { key: "wood", chinese: "木", pinyin: "mù", english: "Wood" },
  fire: { key: "fire", chinese: "火", pinyin: "huǒ", english: "Fire" },
  earth: { key: "earth", chinese: "土", pinyin: "tǔ", english: "Earth" },
  metal: { key: "metal", chinese: "金", pinyin: "jīn", english: "Metal" },
  water: { key: "water", chinese: "水", pinyin: "shuǐ", english: "Water" },
});

/** Generating cycle (相生): wood feeds fire, fire makes earth (ash), earth bears metal, metal carries water, water nourishes wood. */
export const GENERATES: Readonly<Record<Element, Element>> = deepFreeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

/** Controlling cycle (相克): wood parts earth, earth dams water, water quenches fire, fire melts metal, metal cuts wood. */
export const CONTROLS: Readonly<Record<Element, Element>> = deepFreeze({
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
});

export interface HeavenlyStem {
  /** 0–9, 甲 = 0. */
  index: number;
  char: string;
  /** Hanyu Pinyin with tone marks. */
  pinyin: string;
  /** Conventional English gloss (polarity + element). */
  english: string;
  element: Element;
  polarity: Polarity;
}

/** The ten heavenly stems (天干). */
export const HEAVENLY_STEMS: readonly HeavenlyStem[] = deepFreeze([
  { index: 0, char: "甲", pinyin: "jiǎ", english: "Yang Wood", element: "wood", polarity: "yang" },
  { index: 1, char: "乙", pinyin: "yǐ", english: "Yin Wood", element: "wood", polarity: "yin" },
  { index: 2, char: "丙", pinyin: "bǐng", english: "Yang Fire", element: "fire", polarity: "yang" },
  { index: 3, char: "丁", pinyin: "dīng", english: "Yin Fire", element: "fire", polarity: "yin" },
  { index: 4, char: "戊", pinyin: "wù", english: "Yang Earth", element: "earth", polarity: "yang" },
  { index: 5, char: "己", pinyin: "jǐ", english: "Yin Earth", element: "earth", polarity: "yin" },
  { index: 6, char: "庚", pinyin: "gēng", english: "Yang Metal", element: "metal", polarity: "yang" },
  { index: 7, char: "辛", pinyin: "xīn", english: "Yin Metal", element: "metal", polarity: "yin" },
  { index: 8, char: "壬", pinyin: "rén", english: "Yang Water", element: "water", polarity: "yang" },
  { index: 9, char: "癸", pinyin: "guǐ", english: "Yin Water", element: "water", polarity: "yin" },
]);

/** Role of a hidden stem inside a branch: 本气 main qi, 中气 middle qi, 余气 residual qi. */
export type HiddenStemRole = "main" | "middle" | "residual";

/** Hidden-stem roles by position in `EarthlyBranch.hiddenStems`. */
export const HIDDEN_STEM_ROLES: readonly HiddenStemRole[] = deepFreeze(["main", "middle", "residual"]);

export interface EarthlyBranch {
  /** 0–11, 子 = 0. */
  index: number;
  char: string;
  /** Hanyu Pinyin with tone marks. */
  pinyin: string;
  /** Conventional English gloss (polarity + element of the branch). */
  english: string;
  /** Zodiac animal (生肖). */
  animal: string;
  element: Element;
  polarity: Polarity;
  /** Hidden stems (藏干) as stem indices, in main / middle / residual order. */
  hiddenStems: readonly number[];
  /** The double-hour (时辰) this branch governs, in local civil time. */
  hours: string;
}

/** The twelve earthly branches (地支). */
export const EARTHLY_BRANCHES: readonly EarthlyBranch[] = deepFreeze([
  { index: 0, char: "子", pinyin: "zǐ", english: "Yang Water", animal: "Rat", element: "water", polarity: "yang", hiddenStems: [9], hours: "23:00–00:59" },
  { index: 1, char: "丑", pinyin: "chǒu", english: "Yin Earth", animal: "Ox", element: "earth", polarity: "yin", hiddenStems: [5, 9, 7], hours: "01:00–02:59" },
  { index: 2, char: "寅", pinyin: "yín", english: "Yang Wood", animal: "Tiger", element: "wood", polarity: "yang", hiddenStems: [0, 2, 4], hours: "03:00–04:59" },
  { index: 3, char: "卯", pinyin: "mǎo", english: "Yin Wood", animal: "Rabbit", element: "wood", polarity: "yin", hiddenStems: [1], hours: "05:00–06:59" },
  { index: 4, char: "辰", pinyin: "chén", english: "Yang Earth", animal: "Dragon", element: "earth", polarity: "yang", hiddenStems: [4, 1, 9], hours: "07:00–08:59" },
  { index: 5, char: "巳", pinyin: "sì", english: "Yin Fire", animal: "Snake", element: "fire", polarity: "yin", hiddenStems: [2, 4, 6], hours: "09:00–10:59" },
  { index: 6, char: "午", pinyin: "wǔ", english: "Yang Fire", animal: "Horse", element: "fire", polarity: "yang", hiddenStems: [3, 5], hours: "11:00–12:59" },
  { index: 7, char: "未", pinyin: "wèi", english: "Yin Earth", animal: "Goat", element: "earth", polarity: "yin", hiddenStems: [5, 3, 1], hours: "13:00–14:59" },
  { index: 8, char: "申", pinyin: "shēn", english: "Yang Metal", animal: "Monkey", element: "metal", polarity: "yang", hiddenStems: [6, 8, 4], hours: "15:00–16:59" },
  { index: 9, char: "酉", pinyin: "yǒu", english: "Yin Metal", animal: "Rooster", element: "metal", polarity: "yin", hiddenStems: [7], hours: "17:00–18:59" },
  { index: 10, char: "戌", pinyin: "xū", english: "Yang Earth", animal: "Dog", element: "earth", polarity: "yang", hiddenStems: [4, 7, 3], hours: "19:00–20:59" },
  { index: 11, char: "亥", pinyin: "hài", english: "Yin Water", animal: "Pig", element: "water", polarity: "yin", hiddenStems: [8, 0], hours: "21:00–22:59" },
]);

export interface JieTerm {
  /** Position within the solar year: 0 = 立春 … 11 = 小寒. Also the BaZi month number minus one. */
  index: number;
  name: string;
  pinyin: string;
  english: string;
  /** Apparent geocentric ecliptic longitude of the Sun at which the term begins, in degrees. */
  longitude: number;
  /** Earthly-branch index of the BaZi month this term opens (立春 opens 寅 = 2). */
  monthBranch: number;
  /** Typical Gregorian month (1–12) and day on which the term falls; used only to seed the root finder. */
  approxMonth: number;
  approxDay: number;
}

/**
 * The twelve "jie" (节) solar terms — the odd-numbered of the 24 solar terms —
 * each of which starts a BaZi month. The other twelve ("qi", 中气) do not affect the pillars.
 */
export const JIE_TERMS: readonly JieTerm[] = deepFreeze([
  { index: 0, name: "立春", pinyin: "lìchūn", english: "Start of Spring", longitude: 315, monthBranch: 2, approxMonth: 2, approxDay: 4 },
  { index: 1, name: "惊蛰", pinyin: "jīngzhé", english: "Awakening of Insects", longitude: 345, monthBranch: 3, approxMonth: 3, approxDay: 6 },
  { index: 2, name: "清明", pinyin: "qīngmíng", english: "Pure Brightness", longitude: 15, monthBranch: 4, approxMonth: 4, approxDay: 5 },
  { index: 3, name: "立夏", pinyin: "lìxià", english: "Start of Summer", longitude: 45, monthBranch: 5, approxMonth: 5, approxDay: 6 },
  { index: 4, name: "芒种", pinyin: "mángzhòng", english: "Grain in Ear", longitude: 75, monthBranch: 6, approxMonth: 6, approxDay: 6 },
  { index: 5, name: "小暑", pinyin: "xiǎoshǔ", english: "Minor Heat", longitude: 105, monthBranch: 7, approxMonth: 7, approxDay: 7 },
  { index: 6, name: "立秋", pinyin: "lìqiū", english: "Start of Autumn", longitude: 135, monthBranch: 8, approxMonth: 8, approxDay: 8 },
  { index: 7, name: "白露", pinyin: "báilù", english: "White Dew", longitude: 165, monthBranch: 9, approxMonth: 9, approxDay: 8 },
  { index: 8, name: "寒露", pinyin: "hánlù", english: "Cold Dew", longitude: 195, monthBranch: 10, approxMonth: 10, approxDay: 8 },
  { index: 9, name: "立冬", pinyin: "lìdōng", english: "Start of Winter", longitude: 225, monthBranch: 11, approxMonth: 11, approxDay: 7 },
  { index: 10, name: "大雪", pinyin: "dàxuě", english: "Major Snow", longitude: 255, monthBranch: 0, approxMonth: 12, approxDay: 7 },
  { index: 11, name: "小寒", pinyin: "xiǎohán", english: "Minor Cold", longitude: 285, monthBranch: 1, approxMonth: 1, approxDay: 6 },
]);

/** Non-negative remainder: `mod(-1, 60) === 59`. */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * Index 0–59 in the sexagenary cycle (六十甲子, 甲子 = 0) of a stem/branch pair.
 * Only pairs of equal polarity exist; others throw.
 */
export function sexagenaryIndex(stemIndex: number, branchIndex: number): number {
  if (!Number.isInteger(stemIndex) || stemIndex < 0 || stemIndex > 9) {
    throw new RangeError(`Stem index must be an integer 0–9, got ${stemIndex}.`);
  }
  if (!Number.isInteger(branchIndex) || branchIndex < 0 || branchIndex > 11) {
    throw new RangeError(`Branch index must be an integer 0–11, got ${branchIndex}.`);
  }
  if (stemIndex % 2 !== branchIndex % 2) {
    throw new RangeError(`Stem ${stemIndex} and branch ${branchIndex} differ in polarity; no such sexagenary pair.`);
  }
  // Chinese remainder theorem: i ≡ stem (mod 10), i ≡ branch (mod 12).
  return mod(6 * stemIndex - 5 * branchIndex, 60);
}

/** Chinese name of a sexagenary index, e.g. 0 → "甲子", 59 → "癸亥". */
export function sexagenaryName(index: number): string {
  const i = mod(index, 60);
  return HEAVENLY_STEMS[i % 10].char + EARTHLY_BRANCHES[i % 12].char;
}

/** All sixty names of the sexagenary cycle in order, 甲子 … 癸亥. */
export const SEXAGENARY_NAMES: readonly string[] = deepFreeze(Array.from({ length: 60 }, (_, i) => sexagenaryName(i)));
