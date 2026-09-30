import { PROMPT_VERSION } from "../../src/core/llm/prompts";
import { SCHEMA_VERSION } from "../../src/core/llm/schemas";
import { newId } from "../../src/core/llm/trace";
import { FOCI, RequestError, runReading, type SessionState } from "../../src/core/orchestrate";
import { DrawError } from "../../src/core/tarot/engine";
import { getCard } from "../../src/core/tarot/deck";
import { ensureSchema, incrementCounter, insertMessage, insertReading, insertTrace, readCounter } from "./db";
import { getRouter, intFromEnv, makeProvider, providerName } from "./deps";
import type { Env } from "./env";
import { computeMetrics } from "./metrics";

import type { FollowUpResult } from "./session";

export { TarotSession } from "./session";

const API_VERSION = "2.0.0";
const SESSION_ID = /^ses_[0-9a-f]{16}$/;
const READING_ID = /^rdg_[0-9a-f]{16}$/;
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_BODY_BYTES = 16_384;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "*").split(",").map((s) => s.trim());
  const origin = request.headers.get("Origin") ?? "";
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large.");
  try {
    const value = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Body must be a JSON object.");
  }
}

async function clientKey(request: Request): Promise<string> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pillarfortune:${ip}`));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function enforceDailyLimit(env: Env, request: Request, kind: "readings" | "followups"): Promise<void> {
  const limit = kind === "readings" ? intFromEnv(env.PER_IP_DAILY_READINGS, 40) : intFromEnv(env.PER_IP_DAILY_FOLLOWUPS, 150);
  const count = await incrementCounter(env.DB, `ip:${await clientKey(request)}:${kind}`);
  if (count > limit) throw new HttpError(429, `Daily limit of ${limit} ${kind} reached for this network. Please come back tomorrow.`);
}

/** Global cost guard: past the daily budget of model calls, requests are served by the knowledge-base composer. */
async function modelBudgetAvailable(env: Env): Promise<boolean> {
  if (providerName(env) === "offline") return false;
  return (await readCounter(env.DB, "llm:attempts")) < intFromEnv(env.DAILY_LLM_BUDGET, 1500);
}

const sessionStub = (env: Env, sessionId: string) => env.TAROT_SESSION.get(env.TAROT_SESSION.idFromName(sessionId));

async function createReading(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readJson(request);
  await ensureSchema(env.DB);
  await enforceDailyLimit(env, request, "readings");
  const focus = body.focus === undefined || body.focus === "auto" ? "auto" : body.focus;
  if (focus !== "auto" && !FOCI.includes(focus as never)) throw new RequestError(`focus must be "auto" or one of ${FOCI.join(", ")}.`);

  const useModel = await modelBudgetAvailable(env);
  const envelope = await runReading(
    { provider: useModel ? makeProvider(env) : null, router: getRouter() },
    {
      question: body.question as string,
      spread: body.spread as never,
      seed: body.seed as string,
      picks: body.picks as number[] | undefined,
      focus: focus as never,
      acknowledgeSupport: body.acknowledgeSupport === true,
    },
  );

  if (envelope.status === "support") {
    // The question text is not stored for crisis-routed requests; only the routing trace.
    ctx.waitUntil(
      insertTrace(env.DB, { trace: envelope.trace, kind: "reading", readingId: null, sessionId: null, engine: null, outcome: "blocked", attempts: [], safety: "crisis" })
        .run()
        .catch((e) => console.error("trace insert failed", e)),
    );
    return json({ status: "support", route: envelope.route, support: envelope.support, trace: envelope.trace });
  }

  let { outcome, fallbackReason } = envelope;
  if (!useModel && providerName(env) !== "offline") {
    outcome = "fallback";
    fallbackReason = "daily_budget_exhausted";
  }

  const readingId = newId("rdg");
  const sessionId = newId("ses");
  const clientId = typeof body.clientId === "string" && CLIENT_ID.test(body.clientId) ? body.clientId : null;
  const question = (body.question as string).trim();
  const state: SessionState = {
    readingId,
    question,
    focus: envelope.route.focus,
    draw: envelope.draw,
    summary: envelope.interpretation.summary,
    memory: "",
    history: [],
    turns: 0,
  };
  await sessionStub(env, sessionId).initialize(state);

  ctx.waitUntil(
    Promise.all([
      env.DB.batch([
        insertReading(env.DB, {
          id: readingId,
          sessionId,
          clientId,
          question,
          draw: envelope.draw,
          route: envelope.route,
          interpretation: envelope.interpretation,
          outcome,
          engine: envelope.engine,
        }),
        insertTrace(env.DB, {
          trace: envelope.trace,
          kind: "reading",
          readingId,
          sessionId,
          engine: envelope.engine,
          outcome,
          attempts: envelope.attempts,
          fallbackReason,
          focus: envelope.route.focus,
          safety: envelope.route.safety,
        }),
      ]),
      envelope.attempts.length ? incrementCounter(env.DB, "llm:attempts", envelope.attempts.length) : null,
    ]).catch((e) => console.error("persist failed", e)),
  );

  return json({
    status: "ok",
    reading: {
      id: readingId,
      sessionId,
      createdAt: new Date().toISOString(),
      question,
      draw: envelope.draw,
      route: envelope.route,
      interpretation: envelope.interpretation,
      outcome,
      fallbackReason,
      engine: envelope.engine,
    },
    trace: envelope.trace,
  });
}

async function postMessage(request: Request, env: Env, ctx: ExecutionContext, sessionId: string): Promise<Response> {
  const body = await readJson(request);
  await ensureSchema(env.DB);
  await enforceDailyLimit(env, request, "followups");
  const useModel = await modelBudgetAvailable(env);
  // RPC results arrive wrapped in Disposable; the cast restores the discriminated union.
  const result = (await sessionStub(env, sessionId).followUp(String(body.message ?? ""), useModel)) as FollowUpResult;
  if (!result.ok) throw new HttpError(result.status, result.error);
  const envelope = result.envelope;
  if (envelope.status === "support") {
    return json({ status: "support", support: envelope.support, trace: envelope.trace });
  }

  let { outcome, fallbackReason } = envelope;
  if (!useModel && providerName(env) !== "offline") {
    outcome = "fallback";
    fallbackReason = "daily_budget_exhausted";
  }
  const history = envelope.state.history;
  ctx.waitUntil(
    Promise.all([
      env.DB.batch([
        insertMessage(env.DB, sessionId, "user", history.at(-2)?.content ?? ""),
        insertMessage(env.DB, sessionId, "assistant", envelope.answer.answer),
        insertTrace(env.DB, {
          trace: envelope.trace,
          kind: "followup",
          readingId: envelope.state.readingId,
          sessionId,
          engine: envelope.engine,
          outcome,
          attempts: envelope.attempts,
          fallbackReason,
          focus: envelope.state.focus,
        }),
      ]),
      envelope.attempts.length ? incrementCounter(env.DB, "llm:attempts", envelope.attempts.length) : null,
    ]).catch((e) => console.error("persist failed", e)),
  );

  return json({
    status: "ok",
    answer: envelope.answer,
    history,
    turns: envelope.state.turns,
    memoryCompressed: envelope.memoryCompressed,
    support: envelope.support,
    outcome,
    fallbackReason,
    engine: envelope.engine,
    trace: envelope.trace,
  });
}

async function getSession(env: Env, sessionId: string): Promise<Response> {
  const state = await sessionStub(env, sessionId).getState();
  if (!state) throw new HttpError(404, "Session not found or expired.");
  return json({ session: state });
}

async function listReadings(env: Env, url: URL): Promise<Response> {
  const clientId = url.searchParams.get("clientId") ?? "";
  if (!CLIENT_ID.test(clientId)) throw new HttpError(400, "clientId query parameter is required.");
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT id, session_id, created_at, question, spread, cards_json, outcome FROM readings
     WHERE client_id = ?1 ORDER BY created_at DESC LIMIT 20`,
  )
    .bind(clientId)
    .all<{ id: string; session_id: string; created_at: string; question: string; spread: string; cards_json: string; outcome: string }>();
  return json({
    readings: results.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      createdAt: r.created_at,
      question: r.question,
      spread: r.spread,
      outcome: r.outcome,
      cards: (JSON.parse(r.cards_json) as Array<{ cardId: string; orientation: string }>).map((c) => ({
        cardId: c.cardId,
        name: getCard(c.cardId).name,
        orientation: c.orientation,
      })),
    })),
  });
}

async function getReading(env: Env, readingId: string): Promise<Response> {
  await ensureSchema(env.DB);
  const row = await env.DB.prepare(`SELECT * FROM readings WHERE id = ?1`).bind(readingId).first<Record<string, string>>();
  if (!row) throw new HttpError(404, "Reading not found.");
  const cards = JSON.parse(row.cards_json);
  return json({
    reading: {
      id: row.id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      question: row.question,
      draw: { seed: row.seed, spread: row.spread, picks: JSON.parse(row.picks_json), cards },
      route: { focus: row.focus, safety: row.safety },
      interpretation: JSON.parse(row.interpretation_json),
      outcome: row.outcome,
      engine: JSON.parse(row.engine_json),
    },
  });
}

async function handle(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = request.method;

  if (method === "GET" && pathname === "/api/health") {
    return json({
      ok: true,
      version: API_VERSION,
      provider: providerName(env),
      model: providerName(env) === "workers-ai" ? env.LLM_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast" : providerName(env),
      promptVersion: PROMPT_VERSION.reading,
      schemaVersion: SCHEMA_VERSION,
      routerVersion: getRouter().version,
      time: new Date().toISOString(),
    });
  }
  if (method === "POST" && pathname === "/api/readings") return createReading(request, env, ctx);
  if (method === "GET" && pathname === "/api/readings") return listReadings(env, url);
  if (method === "GET" && pathname === "/api/metrics") {
    await ensureSchema(env.DB);
    const days = Math.min(90, Math.max(1, intFromEnv(url.searchParams.get("days") ?? undefined, 7)));
    return json(await computeMetrics(env.DB, days));
  }

  const reading = /^\/api\/readings\/([^/]+)$/.exec(pathname);
  if (method === "GET" && reading) {
    if (!READING_ID.test(reading[1])) throw new HttpError(404, "Reading not found.");
    return getReading(env, reading[1]);
  }

  const session = /^\/api\/sessions\/([^/]+)(\/messages)?$/.exec(pathname);
  if (session) {
    if (!SESSION_ID.test(session[1])) throw new HttpError(404, "Session not found.");
    if (method === "GET" && !session[2]) return getSession(env, session[1]);
    if (method === "POST" && session[2]) return postMessage(request, env, ctx, session[1]);
  }

  throw new HttpError(404, "Not found.");
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      return withHeaders(await handle(request, env, ctx, new URL(request.url)), cors);
    } catch (error) {
      let status = 500;
      let message = "Something went wrong on our side. Please try again.";
      if (error instanceof HttpError) [status, message] = [error.status, error.message];
      else if (error instanceof RequestError || error instanceof DrawError) [status, message] = [400, error.message];
      else console.error("Unhandled error", error);
      return withHeaders(json({ error: message }, status), cors);
    }
  },
} satisfies ExportedHandler<Env>;
