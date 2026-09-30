import { ProviderError, type GenerateRequest, type GenerateResult, type LLMProvider } from "../types";

/**
 * Any OpenAI-compatible chat-completions endpoint: OpenAI, vLLM, llama.cpp's
 * llama-server, Ollama, LM Studio… Used by the eval harness to compare models.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly id = "openai-compatible";
  readonly model: string;
  readonly supportsJsonSchema: boolean;

  constructor(
    private readonly options: {
      baseUrl: string;
      model: string;
      apiKey?: string;
      supportsJsonSchema?: boolean;
      fetchImpl?: typeof fetch;
    },
  ) {
    this.model = options.model;
    this.supportsJsonSchema = options.supportsJsonSchema ?? true;
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    };
    if (request.jsonSchema) {
      body.response_format = { type: "json_schema", json_schema: { name: "output", schema: request.jsonSchema, strict: false } };
    }
    const fetchImpl = this.options.fetchImpl ?? fetch;
    let response: Response;
    try {
      response = await fetchImpl(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.options.apiKey ? { Authorization: `Bearer ${this.options.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (error) {
      throw new ProviderError(`network error: ${(error as Error).message}`, true, "network");
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const status = response.status;
      const code = status === 429 ? "rate_limited" : status >= 500 ? "server" : status === 401 || status === 403 ? "auth" : "bad_request";
      throw new ProviderError(`HTTP ${status}: ${detail.slice(0, 300)}`, status === 429 || status >= 500, code);
    }
    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: json.choices?.[0]?.message?.content ?? "",
      usage: json.usage ? { promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens } : undefined,
    };
  }
}
