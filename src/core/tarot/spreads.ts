export type SpreadId = "single" | "three" | "cross";

export interface SpreadPosition {
  id: string;
  label: string;
  /** What this position signifies. Shown in the UI and given to the interpreter as grounding. */
  meaning: string;
  /** Layout slot in a unit grid for rendering (column, row). */
  slot: { col: number; row: number };
}

export interface SpreadDef {
  id: SpreadId;
  name: string;
  /** How the spread is referred to in prose, e.g. "three-card reading". */
  noun: string;
  tagline: string;
  positions: SpreadPosition[];
  grid: { cols: number; rows: number };
}

export const SPREADS: Record<SpreadId, SpreadDef> = {
  single: {
    id: "single",
    name: "Single card",
    noun: "single-card reading",
    tagline: "One card for a clear, focused answer.",
    grid: { cols: 1, rows: 1 },
    positions: [
      {
        id: "focus",
        label: "Focus",
        meaning: "The energy most worth your attention in this situation right now.",
        slot: { col: 0, row: 0 },
      },
    ],
  },
  three: {
    id: "three",
    name: "Past · Present · Future",
    noun: "three-card reading",
    tagline: "A short timeline: what shaped this, where it stands, where it is heading.",
    grid: { cols: 3, rows: 1 },
    positions: [
      { id: "past", label: "Past", meaning: "What has shaped the situation and still echoes in it.", slot: { col: 0, row: 0 } },
      { id: "present", label: "Present", meaning: "Where things stand now and what is most active.", slot: { col: 1, row: 0 } },
      {
        id: "future",
        label: "Future",
        meaning: "Where the current path is heading if nothing changes.",
        slot: { col: 2, row: 0 },
      },
    ],
  },
  cross: {
    id: "cross",
    name: "Five-card cross",
    noun: "five-card cross",
    tagline: "Situation, obstacle, advice, surroundings and the likely direction.",
    grid: { cols: 3, rows: 3 },
    positions: [
      { id: "situation", label: "Situation", meaning: "The heart of the matter as it stands today.", slot: { col: 1, row: 1 } },
      { id: "challenge", label: "Challenge", meaning: "What stands in the way or needs to be worked through.", slot: { col: 0, row: 1 } },
      { id: "advice", label: "Advice", meaning: "An approach or attitude worth trying.", slot: { col: 2, row: 1 } },
      {
        id: "influences",
        label: "Influences",
        meaning: "People and circumstances around you that shape the situation.",
        slot: { col: 1, row: 0 },
      },
      {
        id: "outcome",
        label: "Direction",
        meaning: "The likely direction if you follow the advice.",
        slot: { col: 1, row: 2 },
      },
    ],
  },
};

export const SPREAD_IDS = Object.keys(SPREADS) as SpreadId[];

export function isSpreadId(value: unknown): value is SpreadId {
  return typeof value === "string" && value in SPREADS;
}
