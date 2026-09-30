/**
 * Detects references to tarot cards inside free text (English and Chinese).
 *
 * Used by the grounding validator: an interpretation may only talk about the cards
 * that were actually drawn, so any mention of another card is a hallucination.
 * The patterns trade a little recall for precision on ordinary words — "the sun on
 * your face" or "inner strength" are not card references, "The Sun" and
 * "the Strength card" are.
 */

export interface CardMention {
  cardId: string;
  match: string;
  index: number;
}

const MAJOR_IDS: Record<string, number> = {
  fool: 0,
  magician: 1,
  "high priestess": 2,
  empress: 3,
  emperor: 4,
  hierophant: 5,
  lovers: 6,
  chariot: 7,
  strength: 8,
  hermit: 9,
  "wheel of fortune": 10,
  wheel: 10,
  justice: 11,
  "hanged man": 12,
  death: 13,
  temperance: 14,
  devil: 15,
  tower: 16,
  star: 17,
  moon: 18,
  sun: 19,
  judgement: 20,
  judgment: 20,
  world: 21,
};

const RANKS: Record<string, number> = {
  ace: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  page: 11, knave: 11, knight: 12, queen: 13, king: 14,
};

const SUITS: Record<string, string> = {
  wands: "wands", rods: "wands", staves: "wands", batons: "wands",
  cups: "cups", chalices: "cups",
  swords: "swords",
  pentacles: "pentacles", coins: "pentacles", disks: "pentacles", discs: "pentacles",
};

const ZH_MAJORS: Record<string, number> = {
  愚者: 0, 魔术师: 1, 女祭司: 2, 皇后: 3, 皇帝: 4, 教皇: 5, 恋人: 6, 战车: 7, 力量: 8, 隐士: 9,
  命运之轮: 10, 正义: 11, 倒吊人: 12, 死神: 13, 节制: 14, 恶魔: 15, 高塔: 16, 星星: 17, 月亮: 18,
  太阳: 19, 审判: 20, 世界: 21,
};
/** Chinese major names that are rarely ordinary words, so they count even without a 牌 suffix or quotes. */
const ZH_DISTINCTIVE = new Set(["愚者", "魔术师", "女祭司", "隐士", "命运之轮", "倒吊人", "死神", "高塔"]);
const ZH_SUITS: Record<string, string> = { 权杖: "wands", 圣杯: "cups", 宝剑: "swords", 星币: "pentacles", 钱币: "pentacles" };
const ZH_RANKS: Record<string, number> = {
  王牌: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  侍从: 11, 侍者: 11, 骑士: 12, 王后: 13, 皇后: 13, 国王: 14,
};

const majorId = (n: number) => `major-${String(n).padStart(2, "0")}`;
const minorId = (suit: string, n: number) => `${suit}-${String(n).padStart(2, "0")}`;

const rankAlt = Object.keys(RANKS).sort((a, b) => b.length - a.length).join("|");
const suitAlt = Object.keys(SUITS).join("|");
const MINOR_EN = new RegExp(`\\b(${rankAlt})\\s+of\\s+(${suitAlt})\\b`, "gi");

// Majors written with "The" and a capitalised noun: "The Tower", "the Hanged Man".
const THE_MAJOR = /\b[Tt]he\s+(Fool|Magician|High\s+Priestess|Empress|Emperor|Hierophant|Lovers|Chariot|Hermit|Hanged\s+Man|Devil|Tower|Star|Moon|Sun|World|Wheel)\b/g;
// Distinctive names that are card references even without "The".
const BARE_MAJOR = /\b(High\s+Priestess|Hanged\s+Man|Hierophant|Magician|Empress|Emperor|Chariot|Hermit|Wheel\s+of\s+Fortune)\b/g;
// Single-word majors, capitalised.
const SINGLE_MAJOR = /\b(Strength|Justice|Temperance|Death|Judgement|Judgment)\b/g;
// Anything followed by "card", in any case: "the tower card", "strength card".
const X_CARD = /\b(?:the\s+)?(fool|magician|high\s+priestess|empress|emperor|hierophant|lovers|chariot|strength|hermit|wheel\s+of\s+fortune|wheel|justice|hanged\s+man|death|temperance|devil|tower|star|moon|sun|judge?ment|world)\s+cards?\b/gi;

const zhSuitAlt = Object.keys(ZH_SUITS).join("|");
const zhRankAlt = Object.keys(ZH_RANKS).sort((a, b) => b.length - a.length).join("|");
const MINOR_ZH = new RegExp(`(${zhSuitAlt})(${zhRankAlt})`, "g");
const zhMajorAlt = Object.keys(ZH_MAJORS).sort((a, b) => b.length - a.length).join("|");
const MAJOR_ZH = new RegExp(`[「“"《『]?(${zhMajorAlt})([」”"》』]|牌)?`, "g");

function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

function isSentenceStart(text: string, index: number): boolean {
  const before = text.slice(0, index);
  return /^\s*["'“‘(]?$/.test(before) || /[.!?:\n]\s*["'“‘(]?$/.test(before);
}

export function findCardMentions(text: string): CardMention[] {
  const found: CardMention[] = [];
  const push = (cardId: string, match: string, index: number) => found.push({ cardId, match, index });

  for (const m of text.matchAll(MINOR_EN)) {
    push(minorId(SUITS[m[2].toLowerCase()], RANKS[m[1].toLowerCase()]), m[0], m.index);
  }
  for (const m of text.matchAll(THE_MAJOR)) push(majorId(MAJOR_IDS[normalizeName(m[1])]), m[0], m.index);
  for (const m of text.matchAll(BARE_MAJOR)) push(majorId(MAJOR_IDS[normalizeName(m[1])]), m[0], m.index);
  for (const m of text.matchAll(X_CARD)) push(majorId(MAJOR_IDS[normalizeName(m[1]).replace("judgment", "judgement")]), m[0], m.index);
  for (const m of text.matchAll(SINGLE_MAJOR)) {
    // "Strength" opening a sentence is usually the ordinary word; the other names are rarely used that way.
    if (m[1] === "Strength" && isSentenceStart(text, m.index)) continue;
    push(majorId(MAJOR_IDS[m[1].toLowerCase()]), m[0], m.index);
  }
  for (const m of text.matchAll(MINOR_ZH)) push(minorId(ZH_SUITS[m[1]], ZH_RANKS[m[2]]), m[0], m.index);
  for (const m of text.matchAll(MAJOR_ZH)) {
    const name = m[1];
    const quotedOrSuffixed = m[0].length > name.length;
    if (!quotedOrSuffixed && !ZH_DISTINCTIVE.has(name)) continue;
    push(majorId(ZH_MAJORS[name]), m[0], m.index);
  }

  // Resolve overlaps (e.g. "The Emperor" also matches "Emperor", "圣杯皇后" also matches "皇后"):
  // keep the longest match starting earliest, drop any match inside an accepted span.
  found.sort((a, b) => a.index - b.index || b.match.length - a.match.length);
  const accepted: CardMention[] = [];
  let coveredUntil = -1;
  for (const mention of found) {
    if (mention.index < coveredUntil) continue;
    accepted.push(mention);
    coveredUntil = mention.index + mention.match.length;
  }
  return accepted;
}

/** Mentions of cards outside `allowedIds` — i.e. hallucinated card references. */
export function findForeignCardMentions(text: string, allowedIds: Iterable<string>): CardMention[] {
  const allowed = new Set(allowedIds);
  return findCardMentions(text).filter((mention) => !allowed.has(mention.cardId));
}
