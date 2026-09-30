import { getCard } from "../tarot/deck";
import type { Draw, DrawnCard } from "../tarot/engine";
import { findCardMentions } from "../tarot/mentions";
import { checkPolicy } from "./policy";
import { SPREADS } from "../tarot/spreads";
import type { CardData, Element } from "../tarot/types";
import type { FollowUpAnswer, Focus, Interpretation, SafetyLabel } from "./types";

/**
 * Deterministic, knowledge-base-grounded composer.
 *
 * It is the last line of the reliability pipeline (served when every model
 * attempt fails validation or the provider is unavailable) and the engine of the
 * offline mode. By construction it only uses the drawn cards' own entries, so it
 * always passes the same validator the model output has to pass — a property the
 * test suite checks across thousands of random draws.
 */

const FOCUS_LINE: Record<Focus, { upright: string; reversed: string }> = {
  general: {
    upright: "Notice where this is already showing up in your days, and what it asks of you.",
    reversed: "Notice where this energy feels stuck, and what small shift might free it.",
  },
  career: {
    upright: "At work or in your studies, notice where this is already shaping your choices.",
    reversed: "At work or in your studies, this may show up as friction worth naming rather than pushing through.",
  },
  love: {
    upright: "In your relationships, notice how this colours the way you connect with others.",
    reversed: "In your relationships, it may be showing up as distance or tension that deserves a gentle conversation.",
  },
  finance: {
    upright: "In money matters, let it inform steady, well-considered choices rather than impulses.",
    reversed: "In money matters, it suggests slowing down and checking assumptions before committing.",
  },
  growth: {
    upright: "For your inner growth, treat this as something to observe with curiosity rather than judge.",
    reversed: "For your inner growth, it points to a pattern that asks for patience and honest attention.",
  },
};

const ELEMENT_DOMAIN: Record<Element, string> = {
  fire: "drive, ambition and action",
  water: "feelings and relationships",
  air: "thoughts, decisions and communication",
  earth: "practical and material matters",
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "the Ace of Cups", "The Tower", "Strength" — minor arcana take an article, majors keep their own names. */
const ref = (card: CardData) => (card.arcana === "major" ? card.name : `the ${card.name}`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function cardText(drawn: DrawnCard, draw: Draw, focus: Focus): string {
  const card = getCard(drawn.cardId);
  const position = SPREADS[draw.spread].positions.find((p) => p.id === drawn.position)!;
  const orientation = drawn.orientation === "reversed" ? "reversed" : "upright";
  return [
    `In the ${position.label} position (${lowerFirst(position.meaning).replace(/\.$/, "")}), ${ref(card)} appears ${orientation}.`,
    card.meaning[drawn.orientation],
    FOCUS_LINE[focus][drawn.orientation],
  ].join(" ");
}

function themesFor(draw: Draw): string[] {
  const themes: string[] = [];
  for (const drawn of draw.cards) {
    const keyword = getCard(drawn.cardId).keywords[drawn.orientation][0];
    if (keyword && !themes.includes(keyword)) themes.push(keyword);
  }
  if (themes.length === 1 && draw.cards.length === 1) {
    const second = getCard(draw.cards[0].cardId).keywords[draw.cards[0].orientation][1];
    if (second) themes.push(second);
  }
  return themes.slice(0, 4);
}

function summaryFor(draw: Draw, question: string, themes: string[]): string {
  const spread = SPREADS[draw.spread];
  const cards = draw.cards.map((c) => getCard(c.cardId));
  const parts: string[] = [];
  const topic = themes.length > 1 ? `${themes.slice(0, -1).join(", ")} and ${themes[themes.length - 1]}` : themes[0];
  // Echo the question only when doing so cannot smuggle a card name or a policy phrase into the output.
  const echo = findCardMentions(question).length === 0 && checkPolicy(question, "/").length === 0;
  parts.push(`Your ${spread.noun}${echo ? ` on "${shorten(question, 90)}"` : ""} centres on ${topic}.`);

  const majors = cards.filter((c) => c.arcana === "major").length;
  if (cards.length >= 3 && majors >= Math.ceil(cards.length / 2)) {
    parts.push("With several Major Arcana present, this looks like a meaningful chapter rather than a passing moment.");
  } else if (cards.length >= 3 && majors === 0) {
    parts.push("With no Major Arcana present, the matter rests largely on everyday choices that are within your reach.");
  }

  const counts = new Map<Element, number>();
  for (const card of cards) counts.set(card.element, (counts.get(card.element) ?? 0) + 1);
  const [topElement, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (cards.length >= 3 && topCount >= 2) {
    parts.push(`The emphasis falls on ${ELEMENT_DOMAIN[topElement]}.`);
  }

  const reversed = draw.cards.filter((c) => c.orientation === "reversed").length;
  if (reversed === 0) {
    parts.push("Every card is upright, so the energies involved are flowing fairly freely.");
  } else if (reversed * 2 >= draw.cards.length) {
    parts.push("Reversed cards suggest some of this energy is blocked or turned inward for now, which calls for patience.");
  } else {
    parts.push("A reversed card marks the place where things may need the most care.");
  }
  parts.push("Treat it as a mirror for reflection rather than a verdict.");
  return parts.join(" ");
}

function adviceFor(draw: Draw): string {
  const preferred = ["advice", "future", "outcome", "focus", "present"];
  const anchor =
    preferred.map((id) => draw.cards.find((c) => c.position === id)).find(Boolean) ?? draw.cards[draw.cards.length - 1];
  const card = getCard(anchor.cardId);
  return `Sit with the question ${ref(card)} raises: "${card.reflection}" Then choose one small, concrete step this week that honours your answer.`;
}

const SAFETY_CAUTION: Partial<Record<SafetyLabel, string>> = {
  crisis: "If things feel heavy right now, please reach out to someone you trust or a local crisis line. You deserve support, and this reading can wait.",
  medical: "For anything health-related, a qualified clinician is the right guide; let this reading support reflection, not medical decisions.",
  high_stakes: "Before acting on a legal or major financial decision, talk it through with a qualified professional; let this reading inform reflection only.",
};

function cautionFor(draw: Draw, safety: SafetyLabel): string {
  const safetyNote = SAFETY_CAUTION[safety];
  if (safetyNote) return safetyNote;
  const reversed = draw.cards.find((c) => c.orientation === "reversed");
  if (reversed) {
    const card = getCard(reversed.cardId);
    const [a, b] = card.keywords.reversed;
    return `${capitalize(ref(card))}, reversed, asks you to watch for ${a}${b ? ` and ${b}` : ""} before making big moves.`;
  }
  const challenge = draw.cards.find((c) => c.position === "challenge");
  if (challenge) {
    const card = getCard(challenge.cardId);
    return `${capitalize(ref(card))} in the Challenge position points to ${card.keywords.upright[0]} as the thing to work with, not against.`;
  }
  return "Your choices still shape what happens next, so hold this reading lightly and check it against what you know.";
}

function followUpsFor(draw: Draw): string[] {
  const [first, second] = draw.cards.map((c) => getCard(c.cardId));
  const out = [`What does ${ref(first)} suggest I do next?`];
  if (second) out.push(`How do ${ref(first)} and ${ref(second)} relate to each other here?`);
  out.push("What should I be careful about in this situation?");
  return out.slice(0, 3);
}

export function composeInterpretation(input: { draw: Draw; question: string; focus: Focus; safety?: SafetyLabel }): Interpretation {
  const themes = themesFor(input.draw);
  return {
    summary: summaryFor(input.draw, input.question, themes),
    cards: input.draw.cards.map((drawn) => ({
      cardId: drawn.cardId,
      position: drawn.position,
      orientation: drawn.orientation,
      interpretation: cardText(drawn, input.draw, input.focus),
    })),
    themes,
    advice: adviceFor(input.draw),
    caution: cautionFor(input.draw, input.safety ?? "none"),
    followUps: followUpsFor(input.draw),
  };
}

const POSITION_WORDS: Record<string, RegExp> = {
  past: /\b(past|before|behind|history)\b|过去/i,
  present: /\b(present|now|current(ly)?|today)\b|现在|目前/i,
  future: /\b(future|next|ahead|coming|will)\b|未来|将来/i,
  situation: /\b(situation|core|heart)\b|现状/i,
  challenge: /\b(challenge|obstacle|problem|block(ing|ed)?)\b|挑战|阻碍/i,
  advice: /\b(advice|should i|what (can|do) i do|how (can|do|should) i)\b|建议|怎么办/i,
  influences: /\b(influence|people|others|around me|environment)\b|影响|周围/i,
  outcome: /\b(outcome|result|end up|direction)\b|结果|方向/i,
  focus: /\b(focus|card|this)\b/i,
};

/** Offline answer to a follow-up: picks the most relevant drawn card and answers from its entry. */
export function composeFollowUpAnswer(input: { draw: Draw; message: string }): FollowUpAnswer {
  const { draw, message } = input;
  const mentioned = findCardMentions(message);
  const foreign = mentioned.filter((m) => !draw.cards.some((c) => c.cardId === m.cardId));
  const direct = draw.cards.find((c) => mentioned.some((m) => m.cardId === c.cardId));
  const byPosition = draw.cards.find((c) => POSITION_WORDS[c.position]?.test(message));
  const tokens = new Set(message.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  const byKeyword = [...draw.cards]
    .map((c) => {
      const card = getCard(c.cardId);
      const words = [...card.keywords[c.orientation], card.meaning[c.orientation]].join(" ").toLowerCase().match(/[a-z]{4,}/g) ?? [];
      return { c, score: words.filter((w) => tokens.has(w)).length };
    })
    .sort((a, b) => b.score - a.score)[0];
  const anchor = direct ?? byPosition ?? (byKeyword && byKeyword.score > 0 ? byKeyword.c : undefined) ?? draw.cards[0];

  const card = getCard(anchor.cardId);
  const parts: string[] = [];
  if (foreign.length > 0) {
    parts.push(`${foreign.map((m) => `"${m.match}"`).join(" and ")} ${foreign.length > 1 ? "are" : "is"} not part of this reading, so I'll stay with the cards you drew.`);
  }
  parts.push(
    `Looking at ${ref(card)} (${anchor.orientation}) in the ${anchor.positionLabel} position: ${lowerFirst(card.meaning[anchor.orientation])}`,
  );
  parts.push(`A question to carry with you: ${card.reflection}`);
  return { answer: parts.join(" "), referencedCards: [{ cardId: anchor.cardId, position: anchor.position }] };
}
