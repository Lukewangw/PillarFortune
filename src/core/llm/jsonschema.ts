/**
 * A small, dependency-free validator for the JSON Schema subset this project uses.
 *
 * Why not a full library: the same code runs in a Cloudflare Worker (no `eval`, so
 * code-generating validators are out), in the browser bundle and in the eval
 * harness, and we want precise JSON-pointer error paths to feed back to the model
 * in repair prompts.
 */

export interface JSONSchema {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  enum?: readonly unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface SchemaError {
  path: string;
  keyword: string;
  message: string;
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value: unknown, type: NonNullable<JSONSchema["type"]>): boolean {
  const actual = typeOf(value);
  return actual === type || (type === "number" && actual === "integer");
}

const escapePointer = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");

/** Length in Unicode code points, as JSON Schema defines it. */
export const codePointLength = (s: string) => [...s].length;

export function validateSchema(value: unknown, schema: JSONSchema, path = ""): SchemaError[] {
  const errors: SchemaError[] = [];
  const at = path || "/";

  if (schema.type && !matchesType(value, schema.type)) {
    errors.push({ path: at, keyword: "type", message: `expected ${schema.type}, got ${typeOf(value)}` });
    return errors;
  }

  if (schema.enum && !schema.enum.some((option) => option === value)) {
    errors.push({
      path: at,
      keyword: "enum",
      message: `${JSON.stringify(value)} is not one of ${schema.enum.map((o) => JSON.stringify(o)).join(", ")}`,
    });
  }

  if (typeof value === "string") {
    const length = codePointLength(value);
    if (schema.minLength !== undefined && length < schema.minLength) {
      errors.push({ path: at, keyword: "minLength", message: `too short (${length} < ${schema.minLength} characters)` });
    }
    if (schema.maxLength !== undefined && length > schema.maxLength) {
      errors.push({ path: at, keyword: "maxLength", message: `too long (${length} > ${schema.maxLength} characters)` });
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path: at, keyword: "minimum", message: `must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path: at, keyword: "maximum", message: `must be <= ${schema.maximum}` });
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path: at, keyword: "minItems", message: `needs at least ${schema.minItems} items, got ${value.length}` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ path: at, keyword: "maxItems", message: `allows at most ${schema.maxItems} items, got ${value.length}` });
    }
    if (schema.items) {
      value.forEach((item, i) => errors.push(...validateSchema(item, schema.items!, `${path}/${i}`)));
    }
  }

  if (typeOf(value) === "object") {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) {
        errors.push({ path: `${path}/${escapePointer(key)}`, keyword: "required", message: "is required" });
      }
    }
    for (const [key, child] of Object.entries(record)) {
      const childSchema = schema.properties?.[key];
      if (childSchema) {
        errors.push(...validateSchema(child, childSchema, `${path}/${escapePointer(key)}`));
      } else if (schema.additionalProperties === false) {
        errors.push({ path: `${path}/${escapePointer(key)}`, keyword: "additionalProperties", message: "is not an allowed property" });
      }
    }
  }

  return errors;
}

/**
 * The structural part of a schema, for decode-time constraints: types, keys, enums.
 * Content limits (lengths, item counts) are enforced after decoding instead —
 * length limits inside a decoding grammar tend to truncate text mid-sentence.
 */
export function toDecodingSchema(schema: JSONSchema): JSONSchema {
  const out: JSONSchema = {};
  if (schema.type) out.type = schema.type;
  if (schema.enum) out.enum = schema.enum;
  if (schema.required) out.required = schema.required;
  if (schema.additionalProperties !== undefined) out.additionalProperties = schema.additionalProperties;
  if (schema.properties) {
    out.properties = Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, toDecodingSchema(v)]));
  }
  if (schema.items) out.items = toDecodingSchema(schema.items);
  return out;
}
