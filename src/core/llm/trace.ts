export interface TraceSpan {
  name: string;
  /** Milliseconds since the trace started. */
  startMs: number;
  durationMs: number;
  status: "ok" | "error";
  attrs: Record<string, unknown>;
}

export interface Trace {
  id: string;
  kind: string;
  startedAt: string;
  durationMs: number;
  spans: TraceSpan[];
}

const defaultNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function newId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Minimal span recorder. Every request through the pipeline produces a trace that
 * is returned to the client (the "inspect" drawer), stored for monitoring, and
 * aggregated by the eval harness.
 */
export class Tracer {
  readonly id: string;
  private readonly t0: number;
  private readonly startedAt = new Date().toISOString();
  private readonly spans: TraceSpan[] = [];

  constructor(
    readonly kind: string,
    private readonly now: () => number = defaultNow,
  ) {
    this.id = newId("trc");
    this.t0 = now();
  }

  elapsed(): number {
    return this.now() - this.t0;
  }

  async span<T>(name: string, fn: (attrs: Record<string, unknown>) => Promise<T> | T, attrs: Record<string, unknown> = {}): Promise<T> {
    const start = this.now();
    const bag = { ...attrs };
    try {
      const result = await fn(bag);
      this.spans.push({ name, startMs: start - this.t0, durationMs: this.now() - start, status: "ok", attrs: bag });
      return result;
    } catch (error) {
      bag.error = error instanceof Error ? error.message : String(error);
      this.spans.push({ name, startMs: start - this.t0, durationMs: this.now() - start, status: "error", attrs: bag });
      throw error;
    }
  }

  record(name: string, startAbs: number, attrs: Record<string, unknown>, status: TraceSpan["status"] = "ok"): void {
    this.spans.push({ name, startMs: startAbs - this.t0, durationMs: this.now() - startAbs, status, attrs });
  }

  time(): number {
    return this.now();
  }

  finish(): Trace {
    return { id: this.id, kind: this.kind, startedAt: this.startedAt, durationMs: this.elapsed(), spans: [...this.spans] };
  }
}
