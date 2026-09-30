import { FAULT_PROFILES, FaultInjectionProvider } from "../../src/core/llm/providers/faultInjection";
import { DEFAULT_WORKERS_AI_MODEL, WorkersAIProvider, type WorkersAIRunner } from "../../src/core/llm/providers/workersAI";
import type { LLMProvider } from "../../src/core/llm/types";
import model from "../../src/core/router/model.json";
import { QuestionRouter, type RouterModelJSON } from "../../src/core/router/router";
import { randomSeed } from "../../src/core/tarot/rng";
import type { Env } from "./env";

let router: QuestionRouter | null = null;

export function getRouter(): QuestionRouter {
  router ??= new QuestionRouter(model as RouterModelJSON);
  return router;
}

export function providerName(env: Env): string {
  return env.LLM_PROVIDER ?? "workers-ai";
}

export function makeProvider(env: Env): LLMProvider | null {
  switch (providerName(env)) {
    case "offline":
      return null;
    case "fault-injection":
      return new FaultInjectionProvider(FAULT_PROFILES.flaky, randomSeed());
    default: {
      // The binding's types are keyed by model name; the model is configuration here.
      const run: WorkersAIRunner = (modelName, inputs) =>
        (env.AI.run as unknown as (m: string, i: Record<string, unknown>) => Promise<unknown>)(modelName, inputs);
      return new WorkersAIProvider(run, env.LLM_MODEL || DEFAULT_WORKERS_AI_MODEL);
    }
  }
}

export const intFromEnv = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
