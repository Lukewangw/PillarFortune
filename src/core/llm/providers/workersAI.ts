import { ProviderError, type GenerateRequest, type GenerateResult, type LLMProvider } from "../types";

/** Calls a Workers AI model: `env.AI.run` inside a Worker, or the REST API from Node (evals). */
export type WorkersAIRunner = (model: string, inputs: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;

export const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function classifyWorkersAIError(error: unknown, status?: number): ProviderError {
  if (error instanceof ProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/json mode couldn'?t be met|response_format|json_schema/i.test(message)) return new ProviderError(message, true, "constraint");
  if (/daily free allocation|neurons|quota/i.test(message)) return new ProviderError(message, false, "rate_limited");
  if (status === 429 || /rate limit|too many requests|capacity|\b3040\b/i.test(message)) return new ProviderError(message, true, "rate_limited");
  if (status === 401 || status === 403 || /authenticat|unauthori[sz]ed|forbidden/i.test(message)) return new ProviderError(message, false, "auth");
  if (/timeout|timed out|\b3007\b/i.test(message)) return new ProviderError(message, true, "timeout");
  if ((status !== undefined && status >= 500) || /internal|upstream|unavailable|overloaded/i.test(message)) {
    return new ProviderError(message, true, "server");
  }
  if (status === 400 || /invalid input|no such model|\b500[67]\b/i.test(message)) return new ProviderError(message, false, "bad_request");
  if (/network|fetch failed|ECONN|ENOTFOUND/i.test(message)) return new ProviderError(message, true, "network");
  return new ProviderError(message, true, "unknown");
}

function toResult(out: unknown): GenerateResult {
  const o = (out ?? {}) as {
    response?: unknown;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const response = o.response ?? o.choices?.[0]?.message?.content;
  // In JSON mode Workers AI may return the already-parsed object.
  const text = typeof response === "string" ? response : response == null ? "" : JSON.stringify(response);
  const usage = o.usage ? { promptTokens: o.usage.prompt_tokens, completionTokens: o.usage.completion_tokens } : undefined;
  return { text, usage };
}

export class WorkersAIProvider implements LLMProvider {
  readonly id = "workers-ai";
  readonly supportsJsonSchema = true;

  constructor(
    private readonly run: WorkersAIRunner,
    readonly model: string = DEFAULT_WORKERS_AI_MODEL,
  ) {}

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const inputs: Record<string, unknown> = {
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    };
    if (request.jsonSchema) inputs.response_format = { type: "json_schema", json_schema: request.jsonSchema };
    try {
      return toResult(await this.run(this.model, inputs, request.signal));
    } catch (error) {
      throw classifyWorkersAIError(error);
    }
  }
}

/** Runner for the Workers AI REST API (used by the eval harness outside a Worker). */
export function workersAIRestRunner(accountId: string, apiToken: string, fetchImpl: typeof fetch = fetch): WorkersAIRunner {
  return async (model, inputs, signal) => {
    let response: Response;
    try {
      response = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
        signal,
      });
    } catch (error) {
      throw new ProviderError(`network error: ${(error as Error).message}`, true, "network");
    }
    const body = (await response.json().catch(() => null)) as
      | { success?: boolean; result?: unknown; errors?: Array<{ code?: number; message?: string }> }
      | null;
    if (!response.ok || !body?.success) {
      const detail = body?.errors?.map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim()).join("; ");
      throw classifyWorkersAIError(new Error(detail || `HTTP ${response.status}`), response.status);
    }
    return body.result;
  };
}
