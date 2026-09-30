import { DurableObject } from "cloudflare:workers";
import { runFollowUp, RequestError, type FollowUpEnvelope, type SessionState } from "../../src/core/orchestrate";
import { getRouter, makeProvider } from "./deps";
import type { Env } from "./env";

/** Sessions expire a week after their last activity. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_FOLLOW_UPS = 30;

export type FollowUpResult =
  | { ok: true; envelope: FollowUpEnvelope }
  | { ok: false; status: 400 | 404 | 429; error: string };

/**
 * One Durable Object per reading session. It owns the conversation state — the
 * original question, the drawn cards, the reading summary, the recent turns and a
 * compressed memory of older turns — and processes follow-ups one at a time, so
 * concurrent messages to the same session can never interleave or lose turns
 * (model calls are I/O, during which a Durable Object would otherwise accept
 * other requests).
 */
export class TarotSession extends DurableObject<Env> {
  private queue: Promise<unknown> = Promise.resolve();

  async initialize(state: SessionState): Promise<void> {
    await this.ctx.storage.put("state", state);
    await this.ctx.storage.setAlarm(Date.now() + SESSION_TTL_MS);
  }

  async getState(): Promise<SessionState | null> {
    return (await this.ctx.storage.get<SessionState>("state")) ?? null;
  }

  async followUp(message: string, useModel: boolean): Promise<FollowUpResult> {
    const task = async (): Promise<FollowUpResult> => {
      const state = await this.getState();
      if (!state) return { ok: false, status: 404, error: "Session not found or expired." };
      if (state.turns >= MAX_FOLLOW_UPS) {
        return { ok: false, status: 429, error: `This reading has reached its limit of ${MAX_FOLLOW_UPS} follow-up questions.` };
      }
      try {
        const envelope = await runFollowUp({ provider: useModel ? makeProvider(this.env) : null, router: getRouter() }, state, message);
        if (envelope.status === "ok") {
          await this.ctx.storage.put("state", envelope.state);
          await this.ctx.storage.setAlarm(Date.now() + SESSION_TTL_MS);
        }
        return { ok: true, envelope };
      } catch (error) {
        if (error instanceof RequestError) return { ok: false, status: 400, error: error.message };
        throw error;
      }
    };
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  override async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
