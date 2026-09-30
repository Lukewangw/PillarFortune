import { getCard } from "../tarot/deck";
import type { Draw } from "../tarot/engine";
import { findCardMentions, findForeignCardMentions } from "../tarot/mentions";
import { validateSchema, type JSONSchema } from "./jsonschema";
import { checkPolicy } from "./policy";
import type { FollowUpAnswer, Interpretation, ValidationIssue } from "./types";

export interface Validated<T> {
  /** The normalized output; only meaningful when `issues` is empty. */
  value: T | null;
  issues: ValidationIssue[];
  /** Deterministic fixes applied before validation (recorded in traces). */
  notes: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const trimIfString = (v: unknown) => (typeof v === "string" ? v.trim() : v);

function pickKeys(record: Record<string, unknown>, allowed: readonly string[], where: string, notes: string[]) {
  const extra = Object.keys(record).filter((k) => !allowed.includes(k));
  if (extra.length) notes.push(`dropped_unknown_keys${where}:${extra.join(",")}`);
  return Object.fromEntries(allowed.filter((k) => k in record).map((k) => [k, trimIfString(record[k])]));
}

function toStringList(value: unknown, field: string, notes: string[]): unknown {
  if (typeof value === "string") {
    notes.push(`split_string_to_list:${field}`);
    return value
      .split(/[,;、，；\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return Array.isArray(value) ? value.map(trimIfString) : value;
}

/** Map a model-written card reference ("The Tower", "高塔") to the drawn card id. */
function resolveCardId(raw: unknown, draw: Draw, notes: string[]): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (draw.cards.some((c) => c.cardId === value)) return value;
  const lowered = value.toLowerCase().replace(/^the\s+/, "");
  const byName = draw.cards.find((c) => {
    const card = getCard(c.cardId);
    return card.name.toLowerCase().replace(/^the\s+/, "") === lowered || card.nameZh === value;
  });
  if (byName) {
    notes.push("mapped_card_name_to_id");
    return byName.cardId;
  }
  return value;
}

function resolvePosition(raw: unknown, draw: Draw, notes: string[]): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (draw.cards.some((c) => c.position === value)) return value;
  const byLabel = draw.cards.find((c) => c.positionLabel.toLowerCase() === value.toLowerCase() || c.position === value.toLowerCase());
  if (byLabel) {
    notes.push("mapped_position_label_to_id");
    return byLabel.position;
  }
  return value;
}

function resolveOrientation(raw: unknown, notes: string[]): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim().toLowerCase();
  const mapped = /^(reversed|reverse|inverted|rev|逆位)$/.test(value)
    ? "reversed"
    : /^(upright|up|normal|正位)$/.test(value)
      ? "upright"
      : value;
  if (mapped !== raw) notes.push("normalized_orientation");
  return mapped;
}

function textFields(value: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const visit = (v: unknown, path: string) => {
    if (typeof v === "string") out.push([path, v]);
    else if (Array.isArray(v)) v.forEach((item, i) => visit(item, `${path}/${i}`));
    else if (isRecord(v)) {
      for (const [k, child] of Object.entries(v)) {
        if (k === "cardId" || k === "position" || k === "orientation") continue;
        visit(child, `${path}/${k}`);
      }
    }
  };
  visit(value, "");
  return out;
}

function groundingAndPolicy(value: Record<string, unknown>, allowedIds: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [path, text] of textFields(value)) {
    const seen = new Set<string>();
    for (const mention of findForeignCardMentions(text, allowedIds)) {
      if (seen.has(mention.cardId)) continue;
      seen.add(mention.cardId);
      issues.push({
        stage: "grounding",
        code: "undrawn_card_mention",
        path,
        message: `mentions "${mention.match}", which is not one of the drawn cards`,
      });
    }
    issues.push(...checkPolicy(text, path));
  }
  return issues;
}

export function validateInterpretation(raw: unknown, draw: Draw, schema: JSONSchema): Validated<Interpretation> {
  const notes: string[] = [];
  if (!isRecord(raw)) {
    return { value: null, notes, issues: [{ stage: "schema", code: "type", path: "/", message: "reply must be a JSON object" }] };
  }

  const top = pickKeys(raw, ["summary", "cards", "themes", "advice", "caution", "followUps"], "", notes);
  top.themes = toStringList(top.themes, "themes", notes);
  top.followUps = toStringList(top.followUps, "followUps", notes);
  if (Array.isArray(top.cards)) {
    top.cards = top.cards.map((entry, i) => {
      if (!isRecord(entry)) return entry;
      const card = pickKeys(entry, ["cardId", "position", "orientation", "interpretation"], `:/cards/${i}`, notes);
      card.cardId = resolveCardId(card.cardId, draw, notes);
      card.position = resolvePosition(card.position, draw, notes);
      card.orientation = resolveOrientation(card.orientation, notes);
      return card;
    });
    // Put entries in spread order when every position is accounted for exactly once.
    const cards = top.cards as unknown[];
    const order = draw.cards.map((c) => cards.findIndex((e) => isRecord(e) && e.position === c.position));
    if (cards.length === draw.cards.length && new Set(order).size === order.length && !order.includes(-1)) {
      const reordered = order.map((i) => cards[i]);
      if (reordered.some((e, i) => e !== cards[i])) notes.push("reordered_cards");
      top.cards = reordered;
    }
  }

  const issues: ValidationIssue[] = validateSchema(top, schema).map((e) => ({
    stage: "schema" as const,
    code: e.keyword,
    path: e.path,
    message: e.message,
  }));

  if (Array.isArray(top.cards)) {
    const entries = top.cards as Array<Record<string, unknown>>;
    for (const drawn of draw.cards) {
      const name = getCard(drawn.cardId).name;
      const matches = entries.map((e, i) => [e, i] as const).filter(([e]) => isRecord(e) && e.cardId === drawn.cardId);
      if (matches.length === 0) {
        issues.push({
          stage: "grounding",
          code: "missing_card",
          path: "/cards",
          message: `no entry for ${name} (cardId "${drawn.cardId}", position "${drawn.position}")`,
        });
        continue;
      }
      if (matches.length > 1) {
        issues.push({ stage: "grounding", code: "duplicate_card", path: "/cards", message: `${name} appears ${matches.length} times` });
      }
      const [entry, i] = matches[0];
      if (entry.position !== drawn.position) {
        issues.push({
          stage: "grounding",
          code: "position_mismatch",
          path: `/cards/${i}/position`,
          message: `${name} was drawn in position "${drawn.position}", not "${String(entry.position)}"`,
        });
      }
      if (entry.orientation !== drawn.orientation) {
        issues.push({
          stage: "grounding",
          code: "orientation_mismatch",
          path: `/cards/${i}/orientation`,
          message: `${name} was drawn ${drawn.orientation}, not ${String(entry.orientation)}`,
        });
      }
    }
  }

  issues.push(...groundingAndPolicy(top, draw.cards.map((c) => c.cardId)));
  return { value: issues.length === 0 ? (top as unknown as Interpretation) : null, issues, notes };
}

/**
 * `userMessage` matters for grounding: if the user asks about a card that is not in
 * the spread, the answer may name it (to say it is not part of the reading).
 */
export function validateFollowUp(raw: unknown, draw: Draw, schema: JSONSchema, userMessage = ""): Validated<FollowUpAnswer> {
  const notes: string[] = [];
  if (!isRecord(raw)) {
    return { value: null, notes, issues: [{ stage: "schema", code: "type", path: "/", message: "reply must be a JSON object" }] };
  }
  const top = pickKeys(raw, ["answer", "referencedCards"], "", notes);
  if (top.referencedCards === undefined) {
    top.referencedCards = [];
    notes.push("defaulted_referenced_cards");
  }
  if (Array.isArray(top.referencedCards)) {
    top.referencedCards = top.referencedCards.map((entry, i) => {
      if (typeof entry === "string") entry = { cardId: entry };
      if (!isRecord(entry)) return entry;
      const ref = pickKeys(entry, ["cardId", "position"], `:/referencedCards/${i}`, notes);
      ref.cardId = resolveCardId(ref.cardId, draw, notes);
      const drawn = draw.cards.find((c) => c.cardId === ref.cardId);
      // The position of a drawn card is known, so a missing or wrong one is repaired deterministically.
      if (drawn && ref.position !== drawn.position) {
        notes.push("filled_reference_position");
        ref.position = drawn.position;
      }
      return ref;
    });
    // Cards the answer talks about should be listed as references.
    if (typeof top.answer === "string") {
      const refs = top.referencedCards as Array<Record<string, unknown>>;
      for (const mention of findCardMentions(top.answer)) {
        const drawn = draw.cards.find((c) => c.cardId === mention.cardId);
        if (drawn && !refs.some((r) => isRecord(r) && r.cardId === drawn.cardId)) {
          refs.push({ cardId: drawn.cardId, position: drawn.position });
          notes.push("added_mentioned_reference");
        }
      }
    }
  }

  const issues: ValidationIssue[] = validateSchema(top, schema).map((e) => ({
    stage: "schema" as const,
    code: e.keyword,
    path: e.path,
    message: e.message,
  }));
  const allowed = [...draw.cards.map((c) => c.cardId), ...findCardMentions(userMessage).map((m) => m.cardId)];
  issues.push(...groundingAndPolicy(top, allowed));
  return { value: issues.length === 0 ? (top as unknown as FollowUpAnswer) : null, issues, notes };
}
