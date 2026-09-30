/**
 * Four Pillars (BaZi, 八字) chart computation.
 *
 * Conventions (each is also reported per chart in `BaziChart.notes`):
 *  - Year pillar changes at 立春 (Sun at apparent longitude 315°), not on 1 January or at
 *    the Lunar New Year. Year index = (solarYear − 4) mod 60, so 1984 = 甲子.
 *  - Month pillar changes at each of the 12 jie (节) solar terms; 立春 opens the 寅 month.
 *    Month stem by 五虎遁: the 寅-month stem is (yearStem × 2 + 2) mod 10.
 *  - Day pillar from the Julian Day Number of the local civil date: index = (JDN − 11) mod 60
 *    (2000-01-01 → 戊午, 1949-10-01 → 甲子). The day changes at 23:00 local time: the late
 *    子 hour (23:00–23:59) belongs to the next day.
 *  - Hour branch: 23:00–00:59 子, 01:00–02:59 丑, … 21:00–22:59 亥. Hour stem by 五鼠遁:
 *    the 子-hour stem is (dayStem × 2) mod 10, using the day pillar after the 23:00 rule.
 *  - Local civil (clock) time is used as given; no true-solar-time correction.
 */

import {
  EARTHLY_BRANCHES,
  ELEMENTS,
  HEAVENLY_STEMS,
  HIDDEN_STEM_ROLES,
  JIE_TERMS,
  mod,
  sexagenaryIndex,
  sexagenaryName,
  type EarthlyBranch,
  type Element,
  type HeavenlyStem,
  type HiddenStemRole,
  type JieTerm,
} from "./data";
import {
  findSunLongitudeInstant,
  julianDayNumber,
  MS_PER_DAY,
  normalizeDegrees,
  SUN_MEAN_MOTION_DEG_PER_DAY,
  sunApparentLongitudeAt,
} from "./astronomy";
import { tenGodOf, type TenGod } from "./tenGods";

export interface BirthInput {
  /** Local civil date, YYYY-MM-DD (Gregorian calendar). */
  date: string;
  /** Local civil time, HH:MM on the 24-hour clock. */
  time: string;
  /**
   * Offset of the local civil time from UTC in minutes, e.g. 480 for UTC+8 and −420 for UTC−7.
   * Include daylight-saving time if it was in effect at the birth.
   */
  utcOffsetMinutes: number;
}

/** Supported range of local civil years (inclusive). */
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
/** Largest accepted |utcOffsetMinutes| (±14 h, the extremes of real-world zones). */
export const MAX_UTC_OFFSET_MINUTES = 14 * 60;
/** Births closer than this to a jie boundary get a sensitivity note. */
export const BOUNDARY_NOTE_MINUTES = 60;

/**
 * Weights for `elementScores`. Every visible stem counts 1.0. Each branch contributes its
 * hidden stems (藏干) instead of its own element: the main qi (本气, always the branch's own
 * element) 1.0, the middle qi (中气) 0.5 and the residual qi (余气) 0.3. A common simplified
 * weighting — traditional schools vary, and seasonal strength is deliberately not modelled.
 */
export const ELEMENT_SCORE_WEIGHTS: Readonly<Record<"stem" | HiddenStemRole, number>> = Object.freeze({
  stem: 1,
  main: 1,
  middle: 0.5,
  residual: 0.3,
});

export type PillarPosition = "year" | "month" | "day" | "hour";
export const PILLAR_POSITIONS: readonly PillarPosition[] = ["year", "month", "day", "hour"];

export interface HiddenStem {
  stem: HeavenlyStem;
  role: HiddenStemRole;
  /** Weight of this hidden stem in `elementScores`. */
  weight: number;
  /** Ten god of this hidden stem relative to the Day Master. */
  tenGod: TenGod;
}

export interface Pillar {
  position: PillarPosition;
  /** Index in the sexagenary cycle, 0–59 (甲子 = 0). */
  index: number;
  /** Chinese name, e.g. "甲子". */
  name: string;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  /** Ten god of the stem relative to the Day Master; `null` for the day pillar, whose stem is the Day Master. */
  tenGod: TenGod | null;
  /** The branch's hidden stems in main / middle / residual order, with their ten gods. */
  hiddenStems: HiddenStem[];
}

export interface SolarTermInEffect extends JieTerm {
  /** UTC instant (ISO 8601, to the second) at which this term began. */
  beganAt: string;
  /** The following jie term, which ends this BaZi month. */
  next: JieTerm;
  /** UTC instant (ISO 8601, to the second) at which the next term begins. */
  endsAt: string;
}

export interface BaziChart {
  /** The validated input. */
  input: BirthInput;
  /** The birth instant in UTC, ISO 8601. */
  utcInstant: string;
  /** Gregorian year in which this chart's solar year (立春 to 立春) began. */
  solarYear: number;
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar };
  /** The day pillar's stem (日主, the Day Master). */
  dayMaster: HeavenlyStem;
  /** Elements of the eight visible characters (4 stems + 4 branches); sums to 8. */
  elementCounts: Record<Element, number>;
  /** Weighted element tally including hidden stems; see {@link ELEMENT_SCORE_WEIGHTS}. */
  elementScores: Record<Element, number>;
  /** The jie term in effect at birth, which fixes the month pillar. */
  solarTerm: SolarTermInEffect;
  /** Plain-language notes on the conventions applied to this chart. */
  notes: string[];
}

/** Thrown by {@link computeChart} for malformed or out-of-range input. */
export class BaziInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaziInputError";
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Julian Day Number of 1970-01-01. */
const UNIX_EPOCH_JDN = 2440588;

interface ParsedInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  offset: number;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function parseInput(input: BirthInput): ParsedInput {
  if (input === null || typeof input !== "object") {
    throw new BaziInputError("Birth input must be an object with date, time and utcOffsetMinutes.");
  }
  const { date, time, utcOffsetMinutes } = input;

  if (typeof date !== "string") throw new BaziInputError("Birth date must be a string in YYYY-MM-DD format.");
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dm) throw new BaziInputError(`Invalid date "${date}": expected YYYY-MM-DD, e.g. 1990-07-15.`);
  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new BaziInputError(`Year ${year} is outside the supported range ${MIN_YEAR}–${MAX_YEAR}.`);
  }
  if (month < 1 || month > 12) throw new BaziInputError(`Invalid date "${date}": month must be 01–12.`);
  const dim = daysInMonth(year, month);
  if (day < 1 || day > dim) {
    throw new BaziInputError(`Invalid date "${date}": ${MONTH_NAMES[month - 1]} ${year} has ${dim} days.`);
  }

  if (typeof time !== "string") throw new BaziInputError("Birth time must be a string in HH:MM format.");
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!tm) throw new BaziInputError(`Invalid time "${time}": expected 24-hour HH:MM, e.g. 08:05 or 23:30.`);
  const hour = Number(tm[1]);
  const minute = Number(tm[2]);
  if (hour > 23) throw new BaziInputError(`Invalid time "${time}": hour must be 00–23.`);
  if (minute > 59) throw new BaziInputError(`Invalid time "${time}": minute must be 00–59.`);

  if (typeof utcOffsetMinutes !== "number" || !Number.isInteger(utcOffsetMinutes)) {
    throw new BaziInputError(`UTC offset must be a whole number of minutes (e.g. 480 for UTC+8), got ${String(utcOffsetMinutes)}.`);
  }
  if (Math.abs(utcOffsetMinutes) > MAX_UTC_OFFSET_MINUTES) {
    throw new BaziInputError(`UTC offset ${utcOffsetMinutes} min is outside ±${MAX_UTC_OFFSET_MINUTES} min (±14 h).`);
  }
  return { year, month, day, hour, minute, offset: utcOffsetMinutes || 0 }; // `|| 0` folds −0 into 0
}

/** Unix ms of a UTC calendar date-time via the JDN (avoids Date.UTC's two-digit-year quirk). */
function utcMsOf(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return (julianDayNumber(year, month, day) - UNIX_EPOCH_JDN) * MS_PER_DAY + (hour * 60 + minute) * 60_000;
}

function jieTerm(index: number): JieTerm {
  const term = JIE_TERMS[mod(index, 12)];
  if (!term) throw new RangeError(`Jie term index must be an integer, got ${index}.`);
  return term;
}

/**
 * UTC instant (Unix ms) at which jie term `termIndex` (0 = 立春 … 11 = 小寒) begins
 * within Gregorian year `year` (e.g. 立春 2024 → 2024-02-04 ≈ 08:27 UTC).
 */
export function jieTermInstant(year: number, termIndex: number): number {
  const term = jieTerm(termIndex);
  return findSunLongitudeInstant(term.longitude, utcMsOf(year, term.approxMonth, term.approxDay));
}

export interface SolarTermSpan {
  /** The jie term in effect. */
  term: JieTerm;
  /** Unix ms when it began (≤ the query instant). */
  startMs: number;
  /** The next jie term. */
  next: JieTerm;
  /** Unix ms when the next term begins (> the query instant). */
  endMs: number;
}

/** The jie term in effect at a UTC instant (Unix ms), with its start and the next term's start. */
export function solarTermAt(utcMs: number): SolarTermSpan {
  const avgTermMs = (30 / SUN_MEAN_MOTION_DEG_PER_DAY) * MS_PER_DAY;
  const lon = sunApparentLongitudeAt(utcMs);
  let k = Math.floor(normalizeDegrees(lon - 315) / 30) % 12;
  // Seed the root finder where the Sun was at the term's longitude, assuming mean motion.
  const seed = utcMs - (normalizeDegrees(lon - jieTerm(k).longitude) / SUN_MEAN_MOTION_DEG_PER_DAY) * MS_PER_DAY;
  let startMs = findSunLongitudeInstant(jieTerm(k).longitude, seed);
  // Guard against round-off right at a boundary so that startMs ≤ utcMs < endMs always holds.
  if (startMs > utcMs) {
    k = mod(k - 1, 12);
    startMs = findSunLongitudeInstant(jieTerm(k).longitude, startMs - avgTermMs);
  }
  let endMs = findSunLongitudeInstant(jieTerm(k + 1).longitude, startMs + avgTermMs);
  if (endMs <= utcMs) {
    k = mod(k + 1, 12);
    startMs = endMs;
    endMs = findSunLongitudeInstant(jieTerm(k + 1).longitude, startMs + avgTermMs);
  }
  return { term: jieTerm(k), startMs, next: jieTerm(k + 1), endMs };
}

// ---------------------------------------------------------------------------
// Formatting helpers for notes

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** "YYYY-MM-DD HH:MM" in the given offset, rounded to the minute. */
function formatLocal(utcMs: number, offsetMinutes: number): string {
  const d = new Date(Math.round(utcMs / 60_000) * 60_000 + offsetMinutes * 60_000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** ISO 8601 UTC, rounded to the second. */
function isoSeconds(utcMs: number): string {
  return new Date(Math.round(utcMs / 1000) * 1000).toISOString().replace(".000Z", "Z");
}

function formatJdnDate(jdn: number): string {
  const d = new Date((jdn - UNIX_EPOCH_JDN) * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function termLabel(term: JieTerm): string {
  return `${term.name} (${term.english})`;
}

function minutesLabel(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 1) return "less than a minute";
  return m === 1 ? "1 minute" : `${m} minutes`;
}

// ---------------------------------------------------------------------------

function buildPillar(position: PillarPosition, index: number, dayMaster: HeavenlyStem): Pillar {
  const stem = HEAVENLY_STEMS[index % 10];
  const branch = EARTHLY_BRANCHES[index % 12];
  return {
    position,
    index,
    name: sexagenaryName(index),
    stem,
    branch,
    tenGod: position === "day" ? null : tenGodOf(dayMaster, stem),
    hiddenStems: branch.hiddenStems.map((stemIndex, i) => {
      const role = HIDDEN_STEM_ROLES[i];
      return {
        stem: HEAVENLY_STEMS[stemIndex],
        role,
        weight: ELEMENT_SCORE_WEIGHTS[role],
        tenGod: tenGodOf(dayMaster, stemIndex),
      };
    }),
  };
}

function emptyElementRecord(): Record<Element, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

/**
 * Computes the Four Pillars for a birth given in local civil time.
 * Deterministic and pure; throws {@link BaziInputError} for invalid input.
 */
export function computeChart(input: BirthInput): BaziChart {
  const p = parseInput(input);
  const utcMs = utcMsOf(p.year, p.month, p.day, p.hour, p.minute) - p.offset * 60_000;
  const offsetLabel = formatOffset(p.offset);
  const local = (ms: number) => `${formatLocal(ms, p.offset)} (${offsetLabel})`;

  // --- Solar term in effect → month branch, and solar year.
  const span = solarTermAt(utcMs);
  const k = span.term.index; // 0 = 寅 month (立春) … 11 = 丑 month (小寒)
  const termStartYear = new Date(span.startMs).getUTCFullYear();
  // 立春…大雪 begin inside their solar year (Feb–Dec); 小寒 begins in January of the next one.
  const solarYear = k === 11 ? termStartYear - 1 : termStartYear;

  // --- Year pillar.
  const yearIndex = mod(solarYear - 4, 60);
  const yearStem = yearIndex % 10;

  // --- Month pillar (五虎遁).
  const monthStem = mod(yearStem * 2 + 2 + k, 10);
  const monthIndex = sexagenaryIndex(monthStem, span.term.monthBranch);

  // --- Day pillar (day changes at 23:00 local).
  const civilJdn = julianDayNumber(p.year, p.month, p.day);
  const lateRatHour = p.hour === 23;
  const dayJdn = lateRatHour ? civilJdn + 1 : civilJdn;
  const dayIndex = mod(dayJdn - 11, 60);
  const dayStem = dayIndex % 10;

  // --- Hour pillar (五鼠遁).
  const hourBranch = Math.floor((p.hour + 1) / 2) % 12;
  const hourStem = mod(dayStem * 2 + hourBranch, 10);
  const hourIndex = sexagenaryIndex(hourStem, hourBranch);

  const dayMaster = HEAVENLY_STEMS[dayStem];
  const pillars = {
    year: buildPillar("year", yearIndex, dayMaster),
    month: buildPillar("month", monthIndex, dayMaster),
    day: buildPillar("day", dayIndex, dayMaster),
    hour: buildPillar("hour", hourIndex, dayMaster),
  };

  // --- Element tallies (scores accumulated in tenths to keep them exact).
  const elementCounts = emptyElementRecord();
  const scoreTenths = emptyElementRecord();
  for (const position of PILLAR_POSITIONS) {
    const pillar = pillars[position];
    elementCounts[pillar.stem.element] += 1;
    elementCounts[pillar.branch.element] += 1;
    scoreTenths[pillar.stem.element] += Math.round(ELEMENT_SCORE_WEIGHTS.stem * 10);
    for (const hidden of pillar.hiddenStems) scoreTenths[hidden.stem.element] += Math.round(hidden.weight * 10);
  }
  const elementScores = emptyElementRecord();
  for (const el of ELEMENTS) elementScores[el] = scoreTenths[el] / 10;

  // --- Notes.
  const notes: string[] = [];
  notes.push(
    `Times are local civil (clock) time at ${offsetLabel}, used as given: no true-solar-time correction ` +
      `for longitude or the equation of time is applied, and any daylight-saving shift must already be in the UTC offset.`,
  );

  const yearName = pillars.year.name;
  if (solarYear < p.year) {
    const lichun = jieTermInstant(p.year, 0);
    notes.push(
      `Born before 立春 (Start of Spring) on ${local(lichun)}, so the year pillar uses the previous solar year ` +
        `(${solarYear}, ${yearName}). The BaZi year begins at 立春 (Sun at 315°), not on 1 January or at the Lunar New Year.`,
    );
  } else {
    const lichun = jieTermInstant(solarYear, 0);
    notes.push(
      `The BaZi year begins at 立春 (Start of Spring, Sun at 315°), not on 1 January or at the Lunar New Year; ` +
        `this solar year's 立春 fell on ${local(lichun)}, so the year pillar is ${yearName} (${solarYear}).`,
    );
  }

  notes.push(
    `Month pillar ${pillars.month.name} follows the solar term ${termLabel(span.term)}, in effect from ` +
      `${local(span.startMs)} until ${termLabel(span.next)} on ${local(span.endMs)}. BaZi months change at these ` +
      `节 (jie) terms, not at lunar new moons.`,
  );

  if (lateRatHour) {
    const altDayName = sexagenaryName(mod(civilJdn - 11, 60));
    notes.push(
      `Born at ${input.time}, in the late 子 (Rat) hour: under the convention used here the day changes at 23:00, ` +
        `so the day pillar ${pillars.day.name} is that of the next calendar day (${formatJdnDate(dayJdn)}) and the ` +
        `hour stem follows from it. Schools that keep the old day until midnight would use ${altDayName} as the day pillar.`,
    );
  } else if (p.hour === 0) {
    notes.push(
      `Born at ${input.time}, in the early 子 (Rat) hour: the day pillar ${pillars.day.name} is that of ` +
        `${input.date}, which under the convention used here began at 23:00 the previous evening.`,
    );
  }

  const hb = EARTHLY_BRANCHES[hourBranch];
  notes.push(`Hour pillar ${pillars.hour.name}: the ${hb.char} (${hb.animal}) double-hour, ${hb.hours} local time.`);

  const sinceStart = (utcMs - span.startMs) / 60_000;
  const untilNext = (span.endMs - utcMs) / 60_000;
  if (Math.min(sinceStart, untilNext) < BOUNDARY_NOTE_MINUTES) {
    const after = sinceStart <= untilNext;
    const boundary = after ? span.term : span.next;
    const yearToo = boundary.index === 0;
    notes.push(
      `Born ${minutesLabel(after ? sinceStart : untilNext)} ${after ? "after" : "before"} the ${termLabel(boundary)} ` +
        `boundary at ${local(after ? span.startMs : span.endMs)}: an error of that size in the recorded birth time ` +
        `would change the month${yearToo ? " and year pillars" : " pillar"}. (The solar-term instants themselves ` +
        `are computed to within about a minute.)`,
    );
  }

  return {
    input: { date: input.date, time: input.time, utcOffsetMinutes: p.offset },
    utcInstant: new Date(utcMs).toISOString(),
    solarYear,
    pillars,
    dayMaster,
    elementCounts,
    elementScores,
    solarTerm: { ...span.term, beganAt: isoSeconds(span.startMs), next: span.next, endsAt: isoSeconds(span.endMs) },
    notes,
  };
}
