import { describe, expect, it } from "vitest";
import { drawCards } from "../tarot/engine";
import { extractJson } from "./extract";
import { composeFollowUpAnswer, composeInterpretation } from "./fallback";
import { validateSchema } from "./jsonschema";
import { checkPolicy } from "./policy";
import { buildFollowUpSchema, buildInterpretationSchema } from "./schemas";
import type { Focus } from "./types";
import { validateFollowUp, validateInterpretation } from "./validate";

const draw = drawCards({ seed: "validation-fixture", spread: "three", picks: [5, 17, 60] });
const schema = buildInterpretationSchema(draw);
const good = () => structuredClone(composeInterpretation({ draw, question: "What should I focus on at work this month?", focus: "career" }));
const codes = (value: unknown) => validateInterpretation(value, draw, schema).issues.map((i) => i.code);
const foreignName = (() => {
  const drawn = new Set(draw.cards.map((c) => c.name));
  return ["The Tower", "The Star", "The Moon", "The Sun"].find((n) => !drawn.has(n))!;
})();

describe("extractJson", () => {
  it("parses clean JSON, fenced JSON and JSON embedded in prose", () => {
    expect(extractJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 }, notes: [] });
    expect(extractJson('```json\n{"a":1}\n```')).toMatchObject({ ok: true, notes: ["stripped_code_fence"] });
    expect(extractJson('Sure! {"a":"{b}"} Hope it helps')).toMatchObject({ ok: true, value: { a: "{b}" }, notes: ["extracted_embedded_object"] });
  });

  it("classifies unusable replies", () => {
    expect(extractJson("I cannot do that")).toMatchObject({ ok: false, issue: { code: "no_json_object" } });
    expect(extractJson('{"a": "unterminated')).toMatchObject({ ok: false, issue: { code: "truncated_json" } });
    expect(extractJson('{"a": 1,, }')).toMatchObject({ ok: false, issue: { code: "invalid_json" } });
  });
});

describe("validateSchema", () => {
  it("reports JSON-pointer paths", () => {
    const errors = validateSchema({ cards: [{ cardId: 3 }], extra: true }, { type: "object", additionalProperties: false, required: ["summary"], properties: { cards: { type: "array", items: { type: "object", properties: { cardId: { type: "string" } } } } } });
    expect(errors.map((e) => `${e.path} ${e.keyword}`)).toEqual(["/summary required", "/cards/0/cardId type", "/extra additionalProperties"]);
  });

  it("counts string length in code points", () => {
    expect(validateSchema("你好", { type: "string", minLength: 2, maxLength: 2 })).toEqual([]);
  });
});

describe("validateInterpretation", () => {
  it("accepts a well-formed, grounded interpretation", () => {
    expect(codes(good())).toEqual([]);
  });

  it("normalizes harmless deviations instead of rejecting them", () => {
    const value = good() as unknown as Record<string, unknown>;
    const cards = value.cards as Array<Record<string, unknown>>;
    cards[0].cardId = draw.cards[0].name; // name instead of id
    cards[1].position = draw.cards[1].positionLabel; // label instead of id
    cards[2].orientation = draw.cards[2].orientation.toUpperCase();
    value.cards = [cards[2], cards[0], cards[1]]; // wrong order
    value.themes = "focus, patience";
    value.mood = "extra key";
    const result = validateInterpretation(value, draw, schema);
    expect(result.issues).toEqual([]);
    expect(result.notes).toEqual(
      expect.arrayContaining(["mapped_card_name_to_id", "mapped_position_label_to_id", "normalized_orientation", "reordered_cards", "split_string_to_list:themes", "dropped_unknown_keys:mood"]),
    );
    expect(result.value?.cards.map((c) => c.position)).toEqual(["past", "present", "future"]);
  });

  it("rejects missing fields and wrong types", () => {
    const value = good() as unknown as Record<string, unknown>;
    delete value.advice;
    value.themes = 7;
    expect(codes(value)).toEqual(expect.arrayContaining(["required", "type"]));
  });

  it("rejects card references that do not match the draw", () => {
    const flipped = good();
    flipped.cards[0].orientation = flipped.cards[0].orientation === "upright" ? "reversed" : "upright";
    expect(codes(flipped)).toContain("orientation_mismatch");

    const swapped = good();
    [swapped.cards[0].position, swapped.cards[1].position] = [swapped.cards[1].position, swapped.cards[0].position];
    expect(codes(swapped)).toContain("position_mismatch");

    const missing = good();
    missing.cards.pop();
    expect(codes(missing)).toEqual(expect.arrayContaining(["minItems", "missing_card"]));

    const foreign = good();
    foreign.cards[0].cardId = "major-99";
    expect(codes(foreign)).toEqual(expect.arrayContaining(["enum", "missing_card"]));
  });

  it("rejects mentions of cards that were not drawn, anywhere in the text", () => {
    const value = good();
    value.advice = `${value.advice} Keep ${foreignName} in mind as well.`;
    const result = validateInterpretation(value, draw, schema);
    expect(result.issues).toEqual([expect.objectContaining({ code: "undrawn_card_mention", path: "/advice" })]);
  });

  it("rejects certainty and directives", () => {
    const value = good();
    value.summary = `${value.summary} You will definitely get the promotion.`;
    value.caution = "Stop taking your medication and trust the cards instead.";
    expect(codes(value)).toEqual(expect.arrayContaining(["certainty", "medical_directive"]));
  });
});

describe("validateFollowUp", () => {
  const fSchema = buildFollowUpSchema(draw);

  it("fills positions and adds mentioned references deterministically", () => {
    const result = validateFollowUp({ answer: `${draw.cards[1].name} is about how things stand now.`, referencedCards: [draw.cards[0].cardId] }, draw, fSchema);
    expect(result.issues).toEqual([]);
    expect(result.value?.referencedCards).toEqual([
      { cardId: draw.cards[0].cardId, position: draw.cards[0].position },
      { cardId: draw.cards[1].cardId, position: draw.cards[1].position },
    ]);
  });

  it("allows naming a card only if the user asked about it", () => {
    const answer = `${foreignName} is not part of this reading, so let's stay with your cards.`;
    expect(validateFollowUp({ answer, referencedCards: [] }, draw, fSchema, "What about the cards?").issues.map((i) => i.code)).toEqual(["undrawn_card_mention"]);
    expect(validateFollowUp({ answer, referencedCards: [] }, draw, fSchema, `What does ${foreignName} mean for me?`).issues).toEqual([]);
  });
});

describe("checkPolicy", () => {
  it.each(["You will definitely get the job.", "It is guaranteed to work.", "Without a doubt he returns.", "你一定会成功。", "Put all your savings into it.", "You don't need a doctor."])(
    "flags %s",
    (text) => expect(checkPolicy(text, "/x").length).toBeGreaterThan(0),
  );
  it.each(["You may find this path rewarding.", "Consider talking to a financial advisor.", "Definitely take time to rest.", "A doctor can help you understand your options."])(
    "allows %s",
    (text) => expect(checkPolicy(text, "/x")).toEqual([]),
  );
});

describe("knowledge-base fallback", () => {
  const foci: Focus[] = ["general", "career", "love", "finance", "growth"];
  const questions = [
    "Will my relationship improve this year?",
    "Should I worry about The Tower card showing up?",
    "Is it guaranteed to work out?",
    "我今年的事业运势如何？",
    "Tell me about the Queen of Cups and the Ace of Wands.",
  ];

  it("always passes the validator it backs up (2,000 random draws)", () => {
    for (let i = 0; i < 2000; i++) {
      const spread = (["single", "three", "cross"] as const)[i % 3];
      const d = drawCards({ seed: `fallback-${i}`, spread });
      const question = questions[i % questions.length];
      const out = composeInterpretation({ draw: d, question, focus: foci[i % foci.length] });
      const result = validateInterpretation(out, d, buildInterpretationSchema(d));
      expect(result.issues, `seed fallback-${i}`).toEqual([]);

      const message = i % 2 ? "What does the future card mean?" : `What about ${foreignName}?`;
      const answer = composeFollowUpAnswer({ draw: d, message });
      expect(validateFollowUp(answer, d, buildFollowUpSchema(d), message).issues, `followup fallback-${i}`).toEqual([]);
    }
  });
});
