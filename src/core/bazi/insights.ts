/**
 * Deterministic explanatory text for a BaZi chart: original, reflective descriptions of the
 * ten Day Masters and the five elements, and a simplified element-balance commentary.
 * Nothing here predicts events or gives medical, financial or legal advice.
 */

import type { BaziChart } from "./chart";
import { CONTROLS, ELEMENT_INFO, ELEMENTS, GENERATES, type Element, type HeavenlyStem } from "./data";

export interface DayMasterInsight {
  /** The stem character, e.g. "甲". */
  stem: string;
  /** Short title, e.g. "Yang Wood · the tall tree". */
  title: string;
  /** The traditional image, e.g. "the tall tree". */
  image: string;
  /** Two to three sentences of reflective description. */
  text: string;
}

/** Descriptions of the ten Day Masters, indexed by stem index (甲 = 0). */
export const DAY_MASTER_INSIGHTS: readonly DayMasterInsight[] = [
  {
    stem: "甲",
    title: "Yang Wood · the tall tree",
    image: "the tall tree",
    text:
      "甲 Yang Wood is pictured as a tall tree: upright, rooted and steadily growing toward the light. " +
      "It is traditionally linked with principle, protectiveness and long-range ambition — a trunk others can lean on. " +
      "The classic reflection is about flexibility: where might bending a little let you keep growing?",
  },
  {
    stem: "乙",
    title: "Yin Wood · the vine and the flower",
    image: "the vine and the flower",
    text:
      "乙 Yin Wood is the vine, the grass and the flowering plant: supple, resourceful and quietly persistent. " +
      "It is said to thrive through connection, finding a way around obstacles rather than straight through them. " +
      "A question it invites: when does your adaptability serve you, and when does it ask you to make yourself smaller?",
  },
  {
    stem: "丙",
    title: "Yang Fire · the sun",
    image: "the sun",
    text:
      "丙 Yang Fire is the sun: warm, open-handed and hard to overlook. " +
      "Tradition associates it with generosity, optimism and a natural pull toward visibility and leadership. " +
      "Even the sun sets each evening, so this image invites reflection on rest, pacing and where your warmth is best spent.",
  },
  {
    stem: "丁",
    title: "Yin Fire · the candle flame",
    image: "the candle flame",
    text:
      "丁 Yin Fire is the candle or lamp flame: focused, attentive and able to light up what is close at hand. " +
      "It is associated with insight, care for detail and a steady inner glow rather than a blaze. " +
      "A small flame needs shelter from the wind; the reflection here is about protecting your energy and choosing what to illuminate.",
  },
  {
    stem: "戊",
    title: "Yang Earth · the mountain",
    image: "the mountain",
    text:
      "戊 Yang Earth is the mountain: broad, steady and reassuringly solid. " +
      "It is linked with reliability, patience and a grounding presence that others orient themselves by. " +
      "Mountains move slowly, so it is worth asking where steadiness shades into reluctance to change.",
  },
  {
    stem: "己",
    title: "Yin Earth · the cultivated field",
    image: "the cultivated field",
    text:
      "己 Yin Earth is the cultivated field or garden soil: receptive, fertile and nurturing. " +
      "Tradition associates it with practicality, care and a gift for helping people and projects take root. " +
      "Soil absorbs whatever falls on it; this image invites reflection on what you take in, and what you could let pass through.",
  },
  {
    stem: "庚",
    title: "Yang Metal · the forged blade",
    image: "raw ore and the forged blade",
    text:
      "庚 Yang Metal is raw ore and the forged blade: strong, direct and decisive. " +
      "It is associated with courage, a keen sense of fairness and a readiness to act. " +
      "Ore becomes useful through tempering, so the reflection here is about how challenge and honest feedback have shaped your edge.",
  },
  {
    stem: "辛",
    title: "Yin Metal · the jewel",
    image: "the jewel",
    text:
      "辛 Yin Metal is the jewel or finely worked ornament: refined, precise and quietly brilliant. " +
      "It is traditionally linked with discernment, an eye for quality and self-respect. " +
      "Polished surfaces show every scratch; this image invites reflection on the space between high standards and kindness toward yourself.",
  },
  {
    stem: "壬",
    title: "Yang Water · the great river",
    image: "the great river and the open sea",
    text:
      "壬 Yang Water is the great river or the open sea: expansive, curious and always moving. " +
      "It is associated with resourcefulness, broad vision and a love of freedom. " +
      "A river needs banks to reach the sea, so the reflection here is about which structures help your energy flow somewhere meaningful.",
  },
  {
    stem: "癸",
    title: "Yin Water · rain and mist",
    image: "rain, dew and mist",
    text:
      "癸 Yin Water is rain, dew and mist: gentle, pervasive and quietly nourishing. " +
      "It is linked with intuition, imagination and sensitivity to what goes unsaid. " +
      "Mist can blur as well as soften; this image invites reflection on when to trust a quiet hunch and when to look for more clarity.",
  },
];

/** One-sentence descriptions of the five elements. */
export const ELEMENT_INSIGHTS: Readonly<Record<Element, string>> = {
  wood: "Wood (木) is the phase of spring and growth: reaching, planning and branching out with a sense of direction.",
  fire: "Fire (火) is the phase of summer and full expression: warmth, visibility, enthusiasm and connection with others.",
  earth: "Earth (土) is the phase of the centre and of the turning seasons: stability, nourishment and the capacity to hold things together.",
  metal: "Metal (金) is the phase of autumn and harvest: structure, clarity and discernment about what to keep and what to release.",
  water: "Water (水) is the phase of winter and stillness: depth, adaptability, reflection and quietly accumulated wisdom.",
};

/** The Day Master description for a stem record or stem index (0–9). */
export function describeDayMaster(stem: HeavenlyStem | number): DayMasterInsight {
  const index = typeof stem === "number" ? stem : stem.index;
  const insight = Number.isInteger(index) ? DAY_MASTER_INSIGHTS[index] : undefined;
  if (!insight) throw new RangeError(`Stem index must be an integer 0–9, got ${index}.`);
  return insight;
}

/** The one-sentence description of an element. */
export function describeElement(element: Element): string {
  return ELEMENT_INSIGHTS[element];
}

// ---------------------------------------------------------------------------

function label(el: Element): string {
  return `${ELEMENT_INFO[el].english} (${ELEMENT_INFO[el].chinese})`;
}

function lower(el: Element): string {
  return ELEMENT_INFO[el].english.toLowerCase();
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function points(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** The element that generates `el` (its "mother" in the generating cycle). */
function generatorOf(el: Element): Element {
  return ELEMENTS.find((x) => GENERATES[x] === el)!;
}

/** The element that controls `el`. */
function controllerOf(el: Element): Element {
  return ELEMENTS.find((x) => CONTROLS[x] === el)!;
}

/** How `el` relates to the Day Master's element, phrased for a reader. */
function relationToDayMaster(el: Element, dm: Element): string {
  if (el === dm) return "your Day Master's own element (companions: self and peers)";
  if (GENERATES[dm] === el) return "the element your Day Master produces (output: expression and creativity)";
  if (CONTROLS[dm] === el) return "the element your Day Master controls (wealth: what you manage and pursue)";
  if (CONTROLS[el] === dm) return "the element that controls your Day Master (power: structure and responsibility)";
  return "the element that produces your Day Master (resource: support and learning)";
}

/**
 * Short observations about the chart's strongest and weakest (or missing) elements, read
 * through the generating and controlling cycles. This is a simplified traditional heuristic
 * built only on `elementScores` — not a full strength analysis, which would also weigh the
 * season of birth, rooting, combinations and clashes. Deterministic for a given chart.
 */
export function describeBalance(chart: Pick<BaziChart, "elementScores" | "dayMaster">): string[] {
  const scores = chart.elementScores;
  const dm = chart.dayMaster;
  const total = ELEMENTS.reduce((sum, el) => sum + scores[el], 0);
  const out: string[] = [
    "A simplified traditional heuristic, not a full strength analysis: these notes compare weighted element " +
      "tallies (visible stems plus hidden stems) through the generating and controlling cycles, and leave out " +
      "season, rooting, combinations and clashes.",
  ];
  if (!(total > 0)) return out;

  // Strongest element(s).
  const max = Math.max(...ELEMENTS.map((el) => scores[el]));
  const strongest = ELEMENTS.filter((el) => scores[el] === max);
  if (strongest.length === 1) {
    const el = strongest[0];
    out.push(
      `${label(el)} is the most prominent element, with ${points(max)} of ${points(total)} weighted points — ` +
        `${relationToDayMaster(el, dm.element)}. In the generating cycle it feeds ${lower(GENERATES[el])}; in the ` +
        `controlling cycle it checks ${lower(CONTROLS[el])}, so ${lower(CONTROLS[el])} themes may ask for more conscious attention.`,
    );
  } else {
    out.push(
      `${listOf(strongest.map(label))} share the lead with ${points(max)} of ${points(total)} weighted points each. ` +
        `In the cycles, ` +
        strongest.map((el) => `${lower(el)} feeds ${lower(GENERATES[el])} and checks ${lower(CONTROLS[el])}`).join("; ") +
        ".",
    );
  }

  // Missing or weakest element(s).
  const missing = ELEMENTS.filter((el) => scores[el] === 0);
  if (missing.length > 0) {
    const cycles = missing
      .map(
        (el) =>
          `${lower(el)} is fed by ${lower(generatorOf(el))} (${points(scores[generatorOf(el)])}) and kept in check by ` +
          `${lower(controllerOf(el))} (${points(scores[controllerOf(el)])})`,
      )
      .join("; ");
    out.push(
      `${listOf(missing.map(label))} ${missing.length === 1 ? "does" : "do"} not appear anywhere in the chart, even ` +
        `among hidden stems. In the cycles, ${cycles}. Traditionally an absent element is read as a quality to ` +
        `cultivate deliberately — through surroundings, relationships or practice — rather than as a flaw.`,
    );
  } else {
    const min = Math.min(...ELEMENTS.map((el) => scores[el]));
    const weakest = ELEMENTS.filter((el) => scores[el] === min);
    const cycles = weakest
      .map((el) => `${lower(el)} is fed by ${lower(generatorOf(el))} (${points(scores[generatorOf(el)])})`)
      .join("; ");
    out.push(
      `${listOf(weakest.map(label))} ${weakest.length === 1 ? "is the least represented element" : "are the least represented elements"} ` +
        `(${points(min)} points${weakest.length === 1 ? "" : " each"}) — present, but quiet. In the generating cycle ${cycles}, ` +
        `the "mother" element that tradition sees as a natural source of support.`,
    );
  }

  // Rough support tally for the Day Master.
  const resource = generatorOf(dm.element);
  const support = scores[dm.element] + scores[resource];
  const share = support / total;
  let lean: string;
  if (share >= 0.55) {
    const outlets = [GENERATES[dm.element], CONTROLS[dm.element], controllerOf(dm.element)].map(lower);
    lean =
      `By this rough measure the chart leans toward the Day Master's side; traditional readers would look to the ` +
      `elements it produces, controls or is checked by (${listOf(outlets)}) for balance.`;
  } else if (share <= 0.45) {
    lean =
      `By this rough measure the chart leans away from the Day Master; traditional readers would see its own ` +
      `element and its resource (${lower(dm.element)} and ${lower(resource)}) as the balancing ones.`;
  } else {
    lean = "By this rough measure support and outflow are fairly even.";
  }
  out.push(
    `Your Day Master ${dm.char} (${dm.english}) is supported by ${lower(dm.element)} (${points(scores[dm.element])}) and by ` +
      `${lower(resource)}, which generates it (${points(scores[resource])}): ${points(support)} of ${points(total)} points, ` +
      `about ${Math.round(share * 100)}%. ${lean}`,
  );

  return out;
}
