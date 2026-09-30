/**
 * Public API of the Four Pillars (BaZi, 八字) calculator.
 * Pure TypeScript: no DOM, no Node APIs, no dependencies.
 */

export {
  computeChart,
  jieTermInstant,
  solarTermAt,
  BaziInputError,
  MIN_YEAR,
  MAX_YEAR,
  MAX_UTC_OFFSET_MINUTES,
  BOUNDARY_NOTE_MINUTES,
  ELEMENT_SCORE_WEIGHTS,
  PILLAR_POSITIONS,
} from "./chart";
export type {
  BirthInput,
  BaziChart,
  Pillar,
  PillarPosition,
  HiddenStem,
  SolarTermInEffect,
  SolarTermSpan,
} from "./chart";

export { tenGodOf, TEN_GODS, TEN_GOD_ORDER } from "./tenGods";
export type { TenGod, TenGodKey, TenGodGroup } from "./tenGods";

export {
  describeBalance,
  describeDayMaster,
  describeElement,
  DAY_MASTER_INSIGHTS,
  ELEMENT_INSIGHTS,
} from "./insights";
export type { DayMasterInsight } from "./insights";

export {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  JIE_TERMS,
  ELEMENTS,
  ELEMENT_INFO,
  GENERATES,
  CONTROLS,
  HIDDEN_STEM_ROLES,
  SEXAGENARY_NAMES,
  sexagenaryIndex,
  sexagenaryName,
} from "./data";
export type {
  Element,
  Polarity,
  ElementInfo,
  HeavenlyStem,
  EarthlyBranch,
  HiddenStemRole,
  JieTerm,
} from "./data";

export {
  julianDay,
  julianDayNumber,
  julianEphemerisDay,
  deltaTSeconds,
  sunApparentLongitude,
  sunApparentLongitudeLowAccuracy,
  sunApparentLongitudeAt,
  findSunLongitudeInstant,
} from "./astronomy";
export type { SolarLongitudeModel } from "./astronomy";
