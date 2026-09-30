import type { HistoryItem, MessageResponse, ReadingDTO, ReadingResponse } from "../core/contracts";
import { newId } from "../core/llm/trace";
import { FAULT_PROFILES, FaultInjectionProvider } from "../core/llm/providers/faultInjection";
import type { Focus, LLMProvider } from "../core/llm/types";
import { runFollowUp, runReading, type SessionState } from "../core/orchestrate";
import { getCard } from "../core/tarot/deck";
import { randomSeed } from "../core/tarot/rng";
import type { SpreadId } from "../core/tarot/spreads";
import { api } from "./api";
import { loadRouter } from "./routerClient";
import { clientId, readJSON, writeJSON } from "./storage";

export type EngineMode = "live" | "offline" | "demo";

export interface ReadingInput {
  question: string;
  spread: SpreadId;
  seed: string;
  picks: number[];
  focus: Focus | "auto";
  acknowledgeSupport?: boolean;
}

export interface Engine {
  mode: EngineMode;
  createReading(input: ReadingInput): Promise<ReadingResponse>;
  sendMessage(sessionId: string, message: string): Promise<MessageResponse>;
  history(): Promise<HistoryItem[]>;
  openReading(readingId: string): Promise<{ reading: ReadingDTO; session: SessionState | null }>;
}

export const ENGINE_INFO: Record<EngineMode, { title: string; detail: string }> = {
  live: {
    title: "Live model",
    detail: "Llama 3.3 70B on Cloudflare Workers AI, with Durable Object sessions and D1 persistence.",
  },
  demo: {
    title: "Simulated faults",
    detail: "Runs the real pipeline in your browser against a simulated model that fails ~35% of attempts, so you can watch validation, repair and fallback.",
  },
  offline: {
    title: "Offline",
    detail: "Runs in your browser with the knowledge-base composer: same draw engine, router and validators, no language model.",
  },
};

class LiveEngine implements Engine {
  readonly mode = "live" as const;

  createReading(input: ReadingInput) {
    return api.createReading({ ...input, clientId: clientId() });
  }

  sendMessage(sessionId: string, message: string) {
    return api.sendMessage(sessionId, message);
  }

  async history() {
    return (await api.listReadings(clientId())).readings;
  }

  async openReading(readingId: string) {
    const { reading } = await api.getReading(readingId);
    const session = await api
      .getSession(reading.sessionId)
      .then((r) => r.session)
      .catch(() => null);
    return { reading, session };
  }
}

interface LocalRecord {
  reading: ReadingDTO;
  session: SessionState;
}

const LOCAL_KEY = "pf.local.readings";
const LOCAL_LIMIT = 12;

/** Runs the same orchestration code as the Worker, entirely in the browser. */
class LocalEngine implements Engine {
  constructor(readonly mode: "offline" | "demo") {}

  private provider(): LLMProvider | null {
    return this.mode === "demo" ? new FaultInjectionProvider(FAULT_PROFILES.flaky, randomSeed()) : null;
  }

  private records(): LocalRecord[] {
    return readJSON<LocalRecord[]>(LOCAL_KEY, []);
  }

  private save(record: LocalRecord) {
    const rest = this.records().filter((r) => r.reading.id !== record.reading.id);
    writeJSON(LOCAL_KEY, [record, ...rest].slice(0, LOCAL_LIMIT));
  }

  async createReading(input: ReadingInput): Promise<ReadingResponse> {
    const router = await loadRouter().catch(() => null);
    const envelope = await runReading({ provider: this.provider(), router }, input);
    if (envelope.status === "support") return envelope;
    const reading: ReadingDTO = {
      id: newId("rdg"),
      sessionId: newId("ses"),
      createdAt: new Date().toISOString(),
      question: input.question.trim(),
      draw: envelope.draw,
      route: envelope.route,
      interpretation: envelope.interpretation,
      outcome: envelope.outcome,
      fallbackReason: envelope.fallbackReason,
      engine: envelope.engine,
    };
    this.save({
      reading,
      session: {
        readingId: reading.id,
        question: reading.question,
        focus: envelope.route.focus,
        draw: envelope.draw,
        summary: envelope.interpretation.summary,
        memory: "",
        history: [],
        turns: 0,
      },
    });
    return { status: "ok", reading, trace: envelope.trace };
  }

  async sendMessage(sessionId: string, message: string): Promise<MessageResponse> {
    const record = this.records().find((r) => r.reading.sessionId === sessionId);
    if (!record) throw new Error("This reading's session is no longer stored in this browser.");
    const router = await loadRouter().catch(() => null);
    const envelope = await runFollowUp({ provider: this.provider(), router }, record.session, message);
    if (envelope.status === "support") return envelope;
    this.save({ ...record, session: envelope.state });
    return {
      status: "ok",
      answer: envelope.answer,
      history: envelope.state.history,
      turns: envelope.state.turns,
      memoryCompressed: envelope.memoryCompressed,
      support: envelope.support,
      outcome: envelope.outcome,
      fallbackReason: envelope.fallbackReason,
      engine: envelope.engine,
      trace: envelope.trace,
    };
  }

  async history(): Promise<HistoryItem[]> {
    return this.records().map(({ reading }) => ({
      id: reading.id,
      sessionId: reading.sessionId,
      createdAt: reading.createdAt,
      question: reading.question,
      spread: reading.draw.spread,
      outcome: reading.outcome,
      cards: reading.draw.cards.map((c) => ({ cardId: c.cardId, name: getCard(c.cardId).name, orientation: c.orientation })),
    }));
  }

  async openReading(readingId: string) {
    const record = this.records().find((r) => r.reading.id === readingId);
    if (!record) throw new Error("Reading not found in this browser.");
    return { reading: record.reading, session: record.session };
  }
}

const engines: Partial<Record<EngineMode, Engine>> = {};

export function getEngine(mode: EngineMode): Engine {
  engines[mode] ??= mode === "live" ? new LiveEngine() : new LocalEngine(mode);
  return engines[mode]!;
}
