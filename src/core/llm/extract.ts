import type { ValidationIssue } from "./types";

export type ExtractResult =
  | { ok: true; value: unknown; notes: string[] }
  | { ok: false; issue: ValidationIssue };

/** Index just past the balanced JSON object that starts at `start`, or -1. String-aware. */
function scanObject(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * Pull one JSON object out of a model reply. Handles the common wrappers models
 * add (markdown fences, a sentence before or after the object) and records each
 * accommodation in `notes`, so traces show how often the raw output was not clean.
 */
export function extractJson(raw: string): ExtractResult {
  const notes: string[] = [];
  let text = raw.trim();

  const fenced = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/.exec(text);
  if (fenced) {
    text = fenced[1].trim();
    notes.push("stripped_code_fence");
  }

  try {
    return { ok: true, value: JSON.parse(text), notes };
  } catch {
    // fall through to embedded-object extraction
  }

  const start = text.indexOf("{");
  if (start === -1) {
    return { ok: false, issue: { stage: "parse", code: "no_json_object", path: "/", message: "reply does not contain a JSON object" } };
  }
  const end = scanObject(text, start);
  if (end === -1) {
    return {
      ok: false,
      issue: { stage: "parse", code: "truncated_json", path: "/", message: "JSON object is not closed (reply looks truncated)" },
    };
  }
  try {
    const value = JSON.parse(text.slice(start, end));
    notes.push("extracted_embedded_object");
    return { ok: true, value, notes };
  } catch (error) {
    return {
      ok: false,
      issue: { stage: "parse", code: "invalid_json", path: "/", message: `invalid JSON: ${(error as Error).message}` },
    };
  }
}
