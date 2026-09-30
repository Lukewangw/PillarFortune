import type { Draw } from "../tarot/engine";
import type { Orientation } from "../tarot/types";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface Usage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  /** JSON Schema for constrained decoding; providers that cannot constrain ignore it. */
  jsonSchema?: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
  /**
   * Structured facts about the request. Real providers ignore this; the
   * fault-injection provider uses it to synthesise realistic outputs.
   */
  hints?: ProviderHints;
}

export type ProviderHints =
  | { kind: "reading"; draw: Draw; question: string; focus: Focus }
  | { kind: "followup"; draw: Draw; question: string; message: string }
  | { kind: "memory" };

export interface GenerateResult {
  text: string;
  usage?: Usage;
}

export interface LLMProvider {
  /** e.g. "workers-ai", "openai-compatible", "fault-injection". */
  readonly id: string;
  readonly model: string;
  /** Whether `jsonSchema` is enforced at decode time. */
  readonly supportsJsonSchema: boolean;
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

/** Error raised by providers; `retryable` distinguishes transient failures from fatal ones. */
export class ProviderError extends Error {
  override name = "ProviderError";
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly code: "timeout" | "rate_limited" | "server" | "network" | "constraint" | "auth" | "bad_request" | "unknown",
  ) {
    super(message);
  }
}

export type Focus = "general" | "career" | "love" | "finance" | "growth";
export type SafetyLabel = "none" | "crisis" | "medical" | "high_stakes";

export interface CardReading {
  cardId: string;
  position: string;
  orientation: Orientation;
  interpretation: string;
}

/** The output contract of the interpreter (validated against a per-draw JSON Schema). */
export interface Interpretation {
  summary: string;
  cards: CardReading[];
  themes: string[];
  advice: string;
  caution: string;
  followUps: string[];
}

export interface FollowUpAnswer {
  answer: string;
  referencedCards: Array<{ cardId: string; position: string }>;
}

/** Why a candidate output was rejected. `path` is a JSON pointer into the output. */
export interface ValidationIssue {
  stage: "parse" | "schema" | "grounding" | "policy";
  code: string;
  path: string;
  message: string;
}

export type Outcome =
  | "accepted" // first attempt passed validation
  | "repaired" // a later attempt passed after validation feedback
  | "fallback" // every attempt failed; deterministic knowledge-base output served
  | "offline" // no model configured; deterministic output by design
  | "blocked"; // safety router short-circuited the request
