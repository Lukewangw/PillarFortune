-- PillarFortune v2 schema: readings, messages, LLM traces (monitoring) and usage counters (cost guards).
-- The Worker also applies these statements idempotently at startup (worker/src/schema.ts).

CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    client_id TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    question TEXT NOT NULL,
    spread TEXT NOT NULL,
    seed TEXT NOT NULL,
    picks_json TEXT NOT NULL,
    cards_json TEXT NOT NULL,
    focus TEXT NOT NULL,
    safety TEXT NOT NULL,
    interpretation_json TEXT NOT NULL,
    outcome TEXT NOT NULL,
    engine_json TEXT NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_readings_client ON readings (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages (session_id, id);

CREATE TABLE IF NOT EXISTS llm_traces (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    reading_id TEXT,
    session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    outcome TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    first_attempt_valid INTEGER NOT NULL,
    issue_codes TEXT NOT NULL,
    fallback_reason TEXT,
    latency_ms INTEGER NOT NULL,
    model_latency_ms INTEGER NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    focus TEXT,
    safety TEXT,
    trace_json TEXT NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_traces_created ON llm_traces (created_at);

CREATE TABLE IF NOT EXISTS usage_counters (
    day TEXT NOT NULL,
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, key)
  );
