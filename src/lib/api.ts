import type { HealthDTO, HistoryItem, MessageResponse, ReadingDTO, ReadingResponse } from "../core/contracts";
import type { SessionState } from "../core/orchestrate";
import { API_BASE } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 90_000): Promise<T> {
  if (API_BASE === null) throw new ApiError(0, "No live backend is configured for this build.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new ApiError(response.status, body.error ?? `Request failed (${response.status}).`);
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const aborted = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError(0, aborted ? "The request timed out." : "Could not reach the PillarFortune API.");
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => request<HealthDTO>("/api/health", {}, 5000),
  createReading: (body: Record<string, unknown>) => request<ReadingResponse>("/api/readings", { method: "POST", body: JSON.stringify(body) }),
  sendMessage: (sessionId: string, message: string) =>
    request<MessageResponse>(`/api/sessions/${sessionId}/messages`, { method: "POST", body: JSON.stringify({ message }) }),
  getSession: (sessionId: string) => request<{ session: SessionState }>(`/api/sessions/${sessionId}`),
  listReadings: (clientId: string) => request<{ readings: HistoryItem[] }>(`/api/readings?clientId=${encodeURIComponent(clientId)}`),
  getReading: (readingId: string) => request<{ reading: ReadingDTO }>(`/api/readings/${readingId}`),
  metrics: (days = 7) => request<Record<string, unknown>>(`/api/metrics?days=${days}`),
};
