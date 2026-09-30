import type { Draw } from "../tarot/engine";
import { findForeignCardMentions } from "../tarot/mentions";
import { composeFollowUpAnswer, composeInterpretation } from "./fallback";
import { generateValidated, type AttemptRecord, type GenerationPolicy } from "./generate";
import { buildFollowUpMessages, buildMemoryMessages, buildReadingMessages, PROMPT_VERSION } from "./prompts";
import { buildFollowUpSchema, buildInterpretationSchema, SCHEMA_VERSION } from "./schemas";
import type { Tracer } from "./trace";
import type { ChatMessage, FollowUpAnswer, Focus, Interpretation, LLMProvider, Outcome, SafetyLabel } from "./types";
import { validateFollowUp, validateInterpretation } from "./validate";

export interface EngineInfo {
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
}

export interface InterpretationResult {
  interpretation: Interpretation;
  outcome: Outcome;
  attempts: AttemptRecord[];
  fallbackReason?: string;
  engine: EngineInfo;
}

export interface FollowUpResult {
  answer: FollowUpAnswer;
  outcome: Outcome;
  attempts: AttemptRecord[];
  fallbackReason?: string;
  engine: EngineInfo;
}

const OFFLINE = { provider: "offline", model: "knowledge-base composer" };

function engineInfo(provider: LLMProvider | null, promptVersion: string): EngineInfo {
  return {
    provider: provider?.id ?? OFFLINE.provider,
    model: provider?.model ?? OFFLINE.model,
    promptVersion,
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Interpret a draw. With no provider (offline mode) the knowledge-base composer answers directly. */
export async function interpretDraw(
  provider: LLMProvider | null,
  input: { draw: Draw; question: string; focus: Focus; safety: SafetyLabel },
  options: { tracer: Tracer; policy?: Partial<GenerationPolicy> },
): Promise<InterpretationResult> {
  const engine = engineInfo(provider, PROMPT_VERSION.reading);
  if (!provider) {
    const interpretation = await options.tracer.span("compose.offline", () => composeInterpretation(input));
    return { interpretation, outcome: "offline", attempts: [], engine };
  }
  const schema = buildInterpretationSchema(input.draw);
  const result = await generateValidated({
    provider,
    messages: buildReadingMessages(input),
    schema,
    validate: (value) => validateInterpretation(value, input.draw, schema),
    fallback: () => composeInterpretation(input),
    policy: options.policy,
    tracer: options.tracer,
    hints: { kind: "reading", draw: input.draw, question: input.question, focus: input.focus },
  });
  return {
    interpretation: result.value,
    outcome: result.outcome,
    attempts: result.attempts,
    fallbackReason: result.fallbackReason,
    engine,
  };
}

/** Answer a follow-up question, grounded in the reading's cards and the conversation so far. */
export async function answerFollowUp(
  provider: LLMProvider | null,
  input: { draw: Draw; question: string; summary: string; memory: string; history: ChatMessage[]; message: string },
  options: { tracer: Tracer; policy?: Partial<GenerationPolicy> },
): Promise<FollowUpResult> {
  const engine = engineInfo(provider, PROMPT_VERSION.followUp);
  if (!provider) {
    const answer = await options.tracer.span("compose.offline", () => composeFollowUpAnswer(input));
    return { answer, outcome: "offline", attempts: [], engine };
  }
  const schema = buildFollowUpSchema(input.draw);
  const result = await generateValidated({
    provider,
    messages: buildFollowUpMessages(input),
    schema,
    validate: (value) => validateFollowUp(value, input.draw, schema, input.message),
    fallback: () => composeFollowUpAnswer(input),
    policy: { maxTokens: 450, ...options.policy },
    tracer: options.tracer,
    hints: { kind: "followup", draw: input.draw, question: input.question, message: input.message },
  });
  return { answer: result.value, outcome: result.outcome, attempts: result.attempts, fallbackReason: result.fallbackReason, engine };
}

/** Extractive fallback for memory compression: the first sentence of each turn. */
export function extractiveMemory(turns: ChatMessage[], previous: string, maxChars = 600): string {
  const lines = turns.map((t) => `${t.role === "user" ? "User" : "Reader"}: ${t.content.split(/(?<=[.!?。！？])\s*/)[0]}`);
  const joined = [previous, ...lines].filter(Boolean).join(" ");
  return joined.length > maxChars ? joined.slice(joined.length - maxChars) : joined;
}

/**
 * Compress older conversation turns into a short summary so long sessions stay
 * within the context budget. Plain-text output, lightly validated: bounded length
 * and no card outside the reading; otherwise the extractive fallback is used.
 */
export async function summarizeMemory(
  provider: LLMProvider | null,
  input: { draw: Draw; turns: ChatMessage[]; previous: string },
  options: { tracer: Tracer },
): Promise<{ memory: string; source: "model" | "extractive" }> {
  const fallback = () => ({ memory: extractiveMemory(input.turns, input.previous), source: "extractive" as const });
  if (!provider) return fallback();
  return options.tracer.span("memory.summarize", async (attrs) => {
    try {
      const { text } = await provider.generate({
        messages: buildMemoryMessages(input.turns, input.previous),
        maxTokens: 160,
        temperature: 0.2,
        hints: { kind: "memory" },
      });
      const memory = text.trim();
      const allowed = input.draw.cards.map((c) => c.cardId);
      if (memory.length >= 20 && memory.length <= 900 && findForeignCardMentions(memory, allowed).length === 0) {
        attrs.source = "model";
        return { memory, source: "model" as const };
      }
      attrs.source = "extractive";
      attrs.rejected = "length_or_grounding";
    } catch (error) {
      attrs.source = "extractive";
      attrs.error = error instanceof Error ? error.message : String(error);
    }
    return fallback();
  });
}
