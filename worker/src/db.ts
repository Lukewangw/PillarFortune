import type { AttemptRecord } from "../../src/core/llm/generate";
import type { EngineInfo } from "../../src/core/llm/pipeline";
import type { Trace } from "../../src/core/llm/trace";
import type { Interpretation, Outcome } from "../../src/core/llm/types";
import type { RouteInfo } from "../../src/core/orchestrate";
import type { Draw } from "../../src/core/tarot/engine";
import { SCHEMA_STATEMENTS } from "./schema";

let schemaReady: Promise<void> | null = null;

/** Apply the schema once per isolate (idempotent CREATE ... IF NOT EXISTS). */
export function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= db
    .batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)))
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function incrementCounter(db: D1Database, key: string, by = 1, day = utcDay()): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO usage_counters (day, key, count) VALUES (?1, ?2, ?3)
       ON CONFLICT (day, key) DO UPDATE SET count = count + ?3
       RETURNING count`,
    )
    .bind(day, key, by)
    .first<{ count: number }>();
  return row?.count ?? by;
}

export async function readCounter(db: D1Database, key: string, day = utcDay()): Promise<number> {
  const row = await db.prepare(`SELECT count FROM usage_counters WHERE day = ?1 AND key = ?2`).bind(day, key).first<{ count: number }>();
  return row?.count ?? 0;
}

export interface StoredReading {
  id: string;
  sessionId: string;
  clientId: string | null;
  question: string;
  draw: Draw;
  route: RouteInfo;
  interpretation: Interpretation;
  outcome: Outcome;
  engine: EngineInfo;
}

export function insertReading(db: D1Database, r: StoredReading): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO readings (id, session_id, client_id, question, spread, seed, picks_json, cards_json, focus, safety, interpretation_json, outcome, engine_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      r.id,
      r.sessionId,
      r.clientId,
      r.question,
      r.draw.spread,
      r.draw.seed,
      JSON.stringify(r.draw.picks),
      JSON.stringify(r.draw.cards),
      r.route.focus,
      r.route.safety,
      JSON.stringify(r.interpretation),
      r.outcome,
      JSON.stringify(r.engine),
    );
}

export function insertMessage(db: D1Database, sessionId: string, role: "user" | "assistant", content: string): D1PreparedStatement {
  return db.prepare(`INSERT INTO messages (session_id, role, content) VALUES (?1, ?2, ?3)`).bind(sessionId, role, content);
}

/** One row per pipeline run: the monitoring table behind /api/metrics. */
export function insertTrace(
  db: D1Database,
  t: {
    trace: Trace;
    kind: "reading" | "followup";
    readingId: string | null;
    sessionId: string | null;
    engine: EngineInfo | null;
    outcome: Outcome;
    attempts: AttemptRecord[];
    fallbackReason?: string;
    focus?: string;
    safety?: string;
  },
): D1PreparedStatement {
  const issueCodes = t.attempts.flatMap((a) => [...a.issues.map((i) => i.code), ...(a.providerError ? [`provider_${a.providerError.code}`] : [])]);
  const promptTokens = t.attempts.reduce((n, a) => n + (a.usage?.promptTokens ?? 0), 0);
  const completionTokens = t.attempts.reduce((n, a) => n + (a.usage?.completionTokens ?? 0), 0);
  const modelLatency = t.attempts.reduce((n, a) => n + a.latencyMs, 0);
  return db
    .prepare(
      `INSERT INTO llm_traces (id, kind, reading_id, session_id, provider, model, prompt_version, outcome, attempts, first_attempt_valid,
         issue_codes, fallback_reason, latency_ms, model_latency_ms, prompt_tokens, completion_tokens, focus, safety, trace_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`,
    )
    .bind(
      t.trace.id,
      t.kind,
      t.readingId,
      t.sessionId,
      t.engine?.provider ?? "none",
      t.engine?.model ?? "none",
      t.engine?.promptVersion ?? "none",
      t.outcome,
      t.attempts.length,
      t.attempts[0]?.verdict === "accepted" ? 1 : 0,
      JSON.stringify(issueCodes),
      t.fallbackReason ?? null,
      Math.round(t.trace.durationMs),
      Math.round(modelLatency),
      promptTokens || null,
      completionTokens || null,
      t.focus ?? null,
      t.safety ?? null,
      JSON.stringify(t.trace),
    );
}
