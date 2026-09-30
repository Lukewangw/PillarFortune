import type { TarotSession } from "./session";

export interface Env {
  AI: Ai;
  DB: D1Database;
  TAROT_SESSION: DurableObjectNamespace<TarotSession>;
  /** "workers-ai" (default) | "fault-injection" (simulated model, for demos/tests) | "offline". */
  LLM_PROVIDER?: string;
  LLM_MODEL?: string;
  /** Max model calls per UTC day across all users; beyond it readings use the knowledge-base fallback. */
  DAILY_LLM_BUDGET?: string;
  PER_IP_DAILY_READINGS?: string;
  PER_IP_DAILY_FOLLOWUPS?: string;
  /** Comma-separated origins allowed by CORS, or "*". */
  ALLOWED_ORIGINS?: string;
}
