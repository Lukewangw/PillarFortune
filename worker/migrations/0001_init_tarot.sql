CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tarot_readings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT NOT NULL,
  question TEXT NOT NULL,
  focus_area TEXT NOT NULL,
  spread_type TEXT NOT NULL,
  cards_json TEXT NOT NULL,
  interpretation_json TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_created ON tarot_readings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_session ON tarot_readings(session_id);

CREATE TABLE IF NOT EXISTS tarot_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tarot_messages_session_created ON tarot_messages(session_id, created_at ASC);
