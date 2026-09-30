import { extractJson } from "./extract";
import { toDecodingSchema, type JSONSchema } from "./jsonschema";
import { buildRepairMessage } from "./prompts";
import type { Tracer } from "./trace";
import {
  ProviderError,
  type ChatMessage,
  type LLMProvider,
  type ProviderHints,
  type Usage,
  type ValidationIssue,
} from "./types";
import type { Validated } from "./validate";

export interface GenerationPolicy {
  /** Hard cap on model calls per request (bounded retries). */
  maxAttempts: number;
  /** Wall-clock budget for all attempts; when exceeded we stop and fall back. */
  deadlineMs: number;
  attemptTimeoutMs: number;
  /** Temperature per attempt; later attempts are cooler (more conservative). */
  temperatures: number[];
  maxTokens: number;
  /** Ask the provider for decode-time JSON Schema constraints when it supports them. */
  constrained: boolean;
  /** Feed validation errors back to the model (repair) instead of plain resampling. */
  feedback: boolean;
  /** Backoff before retrying a transient provider error. */
  backoffMs: (attempt: number) => number;
}

export const DEFAULT_POLICY: GenerationPolicy = {
  maxAttempts: 3,
  deadlineMs: 45_000,
  attemptTimeoutMs: 25_000,
  temperatures: [0.7, 0.4, 0.2],
  maxTokens: 1400,
  constrained: true,
  feedback: true,
  backoffMs: (attempt) => Math.min(2000, 250 * 2 ** (attempt - 1)),
};

export interface AttemptRecord {
  n: number;
  temperature: number;
  constrained: boolean;
  latencyMs: number;
  usage?: Usage;
  /** Raw model text (truncated), kept for the trace inspector and error analysis. */
  raw?: string;
  issues: ValidationIssue[];
  notes: string[];
  providerError?: { code: string; message: string; retryable: boolean };
  verdict: "accepted" | "rejected" | "provider_error";
}

export interface GenerationResult<T> {
  value: T;
  outcome: "accepted" | "repaired" | "fallback";
  attempts: AttemptRecord[];
  fallbackReason?: string;
}

const RAW_LIMIT = 6000;
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…[truncated]` : s);
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function asProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new ProviderError(message, true, "unknown");
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderError(`attempt timed out after ${ms} ms`, true, "timeout"));
    }, ms);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * The reliability loop: generate → extract JSON → normalize → validate
 * (schema, grounding, policy) → accept, or repair with the exact errors, up to
 * `maxAttempts` model calls and within `deadlineMs`; otherwise serve the
 * deterministic fallback. Transient provider errors back off and retry; a
 * decode-constraint failure degrades to unconstrained generation; fatal errors
 * go straight to the fallback. Every attempt is recorded.
 */
export async function generateValidated<T>(args: {
  provider: LLMProvider;
  messages: ChatMessage[];
  schema: JSONSchema;
  validate: (value: unknown) => Validated<T>;
  fallback: () => T;
  policy?: Partial<GenerationPolicy>;
  tracer: Tracer;
  hints?: ProviderHints;
  sleep?: (ms: number) => Promise<void>;
}): Promise<GenerationResult<T>> {
  const policy = { ...DEFAULT_POLICY, ...args.policy };
  const sleep = args.sleep ?? realSleep;
  const { provider, tracer } = args;
  const decodingSchema = toDecodingSchema(args.schema);
  const attempts: AttemptRecord[] = [];
  const started = tracer.time();
  let constrained = policy.constrained && provider.supportsJsonSchema;
  let messages = args.messages;
  let fallbackReason: string | undefined;

  for (let n = 1; n <= policy.maxAttempts; n++) {
    if (tracer.time() - started > policy.deadlineMs) {
      fallbackReason = "deadline_exceeded";
      break;
    }
    const temperature = policy.temperatures[Math.min(n - 1, policy.temperatures.length - 1)];
    const t0 = tracer.time();
    const attempt: AttemptRecord = { n, temperature, constrained, latencyMs: 0, issues: [], notes: [], verdict: "rejected" };
    attempts.push(attempt);

    let text: string;
    try {
      const result = await withTimeout(
        (signal) =>
          provider.generate({
            messages,
            jsonSchema: constrained ? (decodingSchema as Record<string, unknown>) : undefined,
            maxTokens: policy.maxTokens,
            temperature,
            signal,
            hints: args.hints,
          }),
        policy.attemptTimeoutMs,
      );
      text = result.text;
      attempt.usage = result.usage;
      attempt.raw = truncate(text, RAW_LIMIT);
    } catch (error) {
      const pe = asProviderError(error);
      attempt.latencyMs = tracer.time() - t0;
      attempt.verdict = "provider_error";
      attempt.providerError = { code: pe.code, message: pe.message, retryable: pe.retryable };
      tracer.record("llm.attempt", t0, { ...attempt }, "error");
      if (pe.code === "constraint") constrained = false; // degrade: retry without decode-time constraints
      if (!pe.retryable) {
        fallbackReason = `provider_${pe.code}`;
        break;
      }
      if (n < policy.maxAttempts) await sleep(policy.backoffMs(n));
      continue;
    }

    const extracted = extractJson(text);
    if (extracted.ok) {
      attempt.notes.push(...extracted.notes);
      const checked = args.validate(extracted.value);
      attempt.notes.push(...checked.notes);
      attempt.issues = checked.issues;
      if (checked.value !== null && checked.issues.length === 0) {
        attempt.verdict = "accepted";
        attempt.latencyMs = tracer.time() - t0;
        tracer.record("llm.attempt", t0, { ...attempt });
        return { value: checked.value, outcome: n === 1 ? "accepted" : "repaired", attempts };
      }
    } else {
      attempt.issues = [extracted.issue];
    }

    attempt.latencyMs = tracer.time() - t0;
    tracer.record("llm.attempt", t0, { ...attempt }, "error");
    messages = policy.feedback
      ? [...args.messages, { role: "assistant", content: truncate(text, RAW_LIMIT) }, buildRepairMessage(attempt.issues)]
      : args.messages;
  }

  const value = await tracer.span("fallback.compose", () => args.fallback(), {
    reason: fallbackReason ?? "validation_exhausted",
  });
  return { value, outcome: "fallback", attempts, fallbackReason: fallbackReason ?? "validation_exhausted" };
}
