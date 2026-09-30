import type { GenerationPolicy, AttemptRecord } from "./llm/generate";
import { answerFollowUp, interpretDraw, summarizeMemory, type EngineInfo } from "./llm/pipeline";
import { Tracer, type Trace } from "./llm/trace";
import type { ChatMessage, FollowUpAnswer, Focus, Interpretation, LLMProvider, Outcome, SafetyLabel } from "./llm/types";
import { matchCrisisRule } from "./router/crisis";
import type { QuestionRouter } from "./router/router";
import { drawCards, type Draw } from "./tarot/engine";
import { isSpreadId, type SpreadId } from "./tarot/spreads";

/**
 * One request path for every runtime: the Cloudflare Worker (live model), the
 * browser's offline engine, the demo engine with a simulated model, and the eval
 * harness all call these functions, so what is evaluated is what is served.
 *
 *   route (focus + safety) → [crisis? support card] → deterministic draw → interpret → validate/repair/fallback
 */

export const FOCI: Focus[] = ["general", "career", "love", "finance", "growth"];
export const QUESTION_LIMITS = { min: 3, max: 500 };
export const MESSAGE_LIMITS = { min: 2, max: 500 };
/** Messages kept verbatim in the session; older turns are compressed into `memory`. */
export const HISTORY_WINDOW = 8;

export class RequestError extends Error {
  override name = "RequestError";
}

export interface Deps {
  provider: LLMProvider | null;
  router: QuestionRouter | null;
  policy?: Partial<GenerationPolicy>;
}

export interface RouteInfo {
  focus: Focus;
  focusSource: "user" | "router" | "default";
  focusConfidence: number | null;
  safety: SafetyLabel;
  safetyConfidence: number | null;
  rule: string | null;
  /** Crisis gate: "hard" blocks the reading; "soft" shows support and lets the person continue. */
  gate: "hard" | "soft" | null;
  modelVersion: string | null;
}

export interface SupportMessage {
  title: string;
  body: string;
  resources: Array<{ label: string; href?: string }>;
  /** True when the detection is uncertain (soft gate): the person may choose to continue. */
  canContinue: boolean;
}

export const SUPPORT_MESSAGE: SupportMessage = {
  title: "You deserve real support right now",
  body: "It sounds like you may be going through something really painful. A tarot reading isn't the right tool for this moment, and you don't have to carry it alone. Please reach out to someone who can help — talking to a person you trust or a trained counsellor can make a real difference.",
  resources: [
    { label: "If you are in immediate danger, call your local emergency number." },
    { label: "US: call or text 988 (Suicide & Crisis Lifeline)", href: "https://988lifeline.org" },
    { label: "UK & Ireland: Samaritans, call 116 123", href: "https://www.samaritans.org" },
    { label: "中国大陆：拨打 12356 心理援助热线" },
    { label: "Elsewhere: find a free, confidential line", href: "https://findahelpline.com" },
  ],
  canContinue: false,
};

export interface ReadingRequest {
  question: string;
  spread: SpreadId;
  seed: string;
  picks?: number[];
  /** "auto" (or omitted) lets the router choose. */
  focus?: Focus | "auto";
  /** Set after the person has seen the support card for a soft-gated question and chose to continue. */
  acknowledgeSupport?: boolean;
}

export type ReadingEnvelope =
  | {
      status: "ok";
      route: RouteInfo;
      draw: Draw;
      interpretation: Interpretation;
      outcome: Outcome;
      attempts: AttemptRecord[];
      fallbackReason?: string;
      engine: EngineInfo;
      trace: Trace;
    }
  | { status: "support"; route: RouteInfo; support: SupportMessage; trace: Trace };

export function validateQuestion(question: unknown): string {
  if (typeof question !== "string") throw new RequestError("question must be a string.");
  const trimmed = question.trim();
  if (trimmed.length < QUESTION_LIMITS.min || trimmed.length > QUESTION_LIMITS.max) {
    throw new RequestError(`question must be ${QUESTION_LIMITS.min}-${QUESTION_LIMITS.max} characters.`);
  }
  return trimmed;
}

export function route(router: QuestionRouter | null, text: string, requestedFocus?: Focus | "auto"): RouteInfo {
  const userFocus = requestedFocus && requestedFocus !== "auto" && FOCI.includes(requestedFocus) ? requestedFocus : null;
  if (!router) {
    const match = matchCrisisRule(text);
    return {
      focus: userFocus ?? "general",
      focusSource: userFocus ? "user" : "default",
      focusConfidence: null,
      safety: match ? "crisis" : "none",
      safetyConfidence: match ? 1 : null,
      rule: match?.rule ?? null,
      gate: match?.tier ?? null,
      modelVersion: null,
    };
  }
  const result = router.route(text);
  return {
    focus: userFocus ?? result.focus.label,
    focusSource: userFocus ? "user" : "router",
    focusConfidence: userFocus ? null : result.focus.confidence,
    safety: result.safety.label,
    safetyConfidence: result.safety.confidence,
    rule: result.safety.rule,
    gate: result.safety.gate,
    modelVersion: result.modelVersion,
  };
}

export async function runReading(deps: Deps, request: ReadingRequest): Promise<ReadingEnvelope> {
  const question = validateQuestion(request.question);
  if (!isSpreadId(request.spread)) throw new RequestError("spread must be one of: single, three, cross.");
  const tracer = new Tracer("reading");

  const routeInfo = await tracer.span("route", (attrs) => {
    const info = route(deps.router, question, request.focus);
    Object.assign(attrs, info);
    return info;
  });

  if (routeInfo.safety === "crisis" && (routeInfo.gate === "hard" || !request.acknowledgeSupport)) {
    const support = { ...SUPPORT_MESSAGE, canContinue: routeInfo.gate === "soft" };
    return { status: "support", route: routeInfo, support, trace: tracer.finish() };
  }

  const draw = await tracer.span("draw", (attrs) => {
    const result = drawCards({ seed: request.seed, spread: request.spread, picks: request.picks });
    Object.assign(attrs, {
      algorithm: result.algorithm,
      seed: result.seed,
      picks: result.picks,
      cards: result.cards.map((c) => `${c.position}:${c.cardId}:${c.orientation}`),
    });
    return result;
  });

  const result = await interpretDraw(
    deps.provider,
    { draw, question, focus: routeInfo.focus, safety: routeInfo.safety },
    { tracer, policy: deps.policy },
  );

  return {
    status: "ok",
    route: routeInfo,
    draw,
    interpretation: result.interpretation,
    outcome: result.outcome,
    attempts: result.attempts,
    fallbackReason: result.fallbackReason,
    engine: result.engine,
    trace: tracer.finish(),
  };
}

/** Conversation state of one reading session (held by a Durable Object, or by the browser offline). */
export interface SessionState {
  readingId: string;
  question: string;
  focus: Focus;
  draw: Draw;
  summary: string;
  memory: string;
  history: ChatMessage[];
  turns: number;
}

export type FollowUpEnvelope =
  | {
      status: "ok";
      state: SessionState;
      answer: FollowUpAnswer;
      outcome: Outcome;
      attempts: AttemptRecord[];
      fallbackReason?: string;
      engine: EngineInfo;
      memoryCompressed: boolean;
      /** Present when the message showed warning signs (soft gate): resources shown alongside the answer. */
      support?: SupportMessage;
      trace: Trace;
    }
  | { status: "support"; state: SessionState; support: SupportMessage; trace: Trace };

export function validateMessage(message: unknown): string {
  if (typeof message !== "string") throw new RequestError("message must be a string.");
  const trimmed = message.trim();
  if (trimmed.length < MESSAGE_LIMITS.min || trimmed.length > MESSAGE_LIMITS.max) {
    throw new RequestError(`message must be ${MESSAGE_LIMITS.min}-${MESSAGE_LIMITS.max} characters.`);
  }
  return trimmed;
}

export async function runFollowUp(deps: Deps, state: SessionState, rawMessage: string): Promise<FollowUpEnvelope> {
  const message = validateMessage(rawMessage);
  const tracer = new Tracer("followup");

  const routed = await tracer.span("route", (attrs) => {
    const info = route(deps.router, message, state.focus);
    Object.assign(attrs, { safety: info.safety, rule: info.rule, gate: info.gate, safetyConfidence: info.safetyConfidence });
    return info;
  });
  if (routed.safety === "crisis" && routed.gate === "hard") {
    return { status: "support", state, support: SUPPORT_MESSAGE, trace: tracer.finish() };
  }

  const result = await answerFollowUp(
    deps.provider,
    { draw: state.draw, question: state.question, summary: state.summary, memory: state.memory, history: state.history, message },
    { tracer, policy: deps.policy },
  );

  let history: ChatMessage[] = [...state.history, { role: "user", content: message }, { role: "assistant", content: result.answer.answer }];
  let memory = state.memory;
  let memoryCompressed = false;
  if (history.length > HISTORY_WINDOW) {
    const overflow = history.slice(0, history.length - HISTORY_WINDOW);
    history = history.slice(history.length - HISTORY_WINDOW);
    memory = (await summarizeMemory(deps.provider, { draw: state.draw, turns: overflow, previous: state.memory }, { tracer })).memory;
    memoryCompressed = true;
  }

  return {
    status: "ok",
    state: { ...state, history, memory, turns: state.turns + 1 },
    answer: result.answer,
    outcome: result.outcome,
    attempts: result.attempts,
    fallbackReason: result.fallbackReason,
    engine: result.engine,
    memoryCompressed,
    support: routed.safety === "crisis" ? { ...SUPPORT_MESSAGE, canContinue: true } : undefined,
    trace: tracer.finish(),
  };
}
