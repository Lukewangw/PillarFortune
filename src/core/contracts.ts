/** Wire contracts shared by the Worker API, the browser engines and the UI. */
import type { EngineInfo } from "./llm/pipeline";
import type { Trace } from "./llm/trace";
import type { ChatMessage, FollowUpAnswer, Interpretation, Outcome } from "./llm/types";
import type { RouteInfo, SupportMessage } from "./orchestrate";
import type { Draw } from "./tarot/engine";

export interface ReadingDTO {
  id: string;
  sessionId: string;
  createdAt: string;
  question: string;
  draw: Draw;
  route: RouteInfo;
  interpretation: Interpretation;
  outcome: Outcome;
  fallbackReason?: string;
  engine: EngineInfo;
}

export type ReadingResponse =
  | { status: "ok"; reading: ReadingDTO; trace: Trace }
  | { status: "support"; route: RouteInfo; support: SupportMessage; trace: Trace };

export type MessageResponse =
  | {
      status: "ok";
      answer: FollowUpAnswer;
      history: ChatMessage[];
      turns: number;
      memoryCompressed: boolean;
      support?: SupportMessage;
      outcome: Outcome;
      fallbackReason?: string;
      engine: EngineInfo;
      trace: Trace;
    }
  | { status: "support"; support: SupportMessage; trace: Trace };

export interface HistoryItem {
  id: string;
  sessionId: string;
  createdAt: string;
  question: string;
  spread: string;
  outcome: string;
  cards: Array<{ cardId: string; name: string; orientation: string }>;
}

export interface HealthDTO {
  ok: boolean;
  version: string;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  routerVersion: string;
}
