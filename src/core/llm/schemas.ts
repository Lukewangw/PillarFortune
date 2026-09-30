import type { Draw } from "../tarot/engine";
import type { JSONSchema } from "./jsonschema";

export const SCHEMA_VERSION = "interpretation.v2";

export const LIMITS = {
  summary: [80, 900],
  cardInterpretation: [60, 900],
  theme: [2, 48],
  themes: [1, 4],
  advice: [40, 700],
  caution: [30, 500],
  followUp: [8, 140],
  followUps: [2, 3],
  answer: [20, 1400],
} as const;

/**
 * Per-draw output contract. Card references are enums of the ids and positions
 * that were actually drawn, so a constrained decoder cannot even express a card
 * outside the spread, and the post-hoc validator can check pairings exactly.
 */
export function buildInterpretationSchema(draw: Draw): JSONSchema {
  const n = draw.cards.length;
  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "cards", "themes", "advice", "caution", "followUps"],
    properties: {
      summary: {
        type: "string",
        description: "2-4 sentences answering the question through the spread as a whole.",
        minLength: LIMITS.summary[0],
        maxLength: LIMITS.summary[1],
      },
      cards: {
        type: "array",
        minItems: n,
        maxItems: n,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["cardId", "position", "orientation", "interpretation"],
          properties: {
            cardId: { type: "string", enum: draw.cards.map((c) => c.cardId) },
            position: { type: "string", enum: draw.cards.map((c) => c.position) },
            orientation: { type: "string", enum: ["upright", "reversed"] },
            interpretation: {
              type: "string",
              minLength: LIMITS.cardInterpretation[0],
              maxLength: LIMITS.cardInterpretation[1],
            },
          },
        },
      },
      themes: {
        type: "array",
        minItems: LIMITS.themes[0],
        maxItems: LIMITS.themes[1],
        items: { type: "string", minLength: LIMITS.theme[0], maxLength: LIMITS.theme[1] },
      },
      advice: { type: "string", minLength: LIMITS.advice[0], maxLength: LIMITS.advice[1] },
      caution: { type: "string", minLength: LIMITS.caution[0], maxLength: LIMITS.caution[1] },
      followUps: {
        type: "array",
        minItems: LIMITS.followUps[0],
        maxItems: LIMITS.followUps[1],
        items: { type: "string", minLength: LIMITS.followUp[0], maxLength: LIMITS.followUp[1] },
      },
    },
  };
}

export function buildFollowUpSchema(draw: Draw): JSONSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["answer", "referencedCards"],
    properties: {
      answer: { type: "string", minLength: LIMITS.answer[0], maxLength: LIMITS.answer[1] },
      referencedCards: {
        type: "array",
        maxItems: draw.cards.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["cardId", "position"],
          properties: {
            cardId: { type: "string", enum: draw.cards.map((c) => c.cardId) },
            position: { type: "string", enum: draw.cards.map((c) => c.position) },
          },
        },
      },
    },
  };
}
