import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { EngineInfo } from "../core/llm/pipeline";
import type { Trace, TraceSpan } from "../core/llm/trace";
import type { Outcome, ValidationIssue } from "../core/llm/types";

export const OUTCOME_META: Record<Outcome, { label: string; mark: string }> = {
  accepted: { label: "Accepted first try", mark: "bg-ok" },
  repaired: { label: "Repaired after validation", mark: "bg-warn" },
  fallback: { label: "Knowledge-base fallback", mark: "bg-bad" },
  offline: { label: "Offline composer", mark: "bg-ink-3" },
  blocked: { label: "Routed to support", mark: "bg-accent" },
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const meta = OUTCOME_META[outcome];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] font-medium uppercase leading-none tracking-[0.06em] text-ink-2">
      <span className={`h-1.5 w-1.5 ${meta.mark}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.max(0, Math.round(ms))} ms`);

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function Timeline({ trace }: { trace: Trace }) {
  const total = Math.max(trace.durationMs, 1);
  return (
    <div className="space-y-2">
      {trace.spans.map((span, i) => {
        const left = (span.startMs / total) * 100;
        const width = Math.max((span.durationMs / total) * 100, 0.8);
        const label = span.name === "llm.attempt" ? `attempt ${String(span.attrs.n)}` : span.name;
        const color =
          span.status === "error"
            ? "bg-bad"
            : span.name === "llm.attempt"
              ? span.attrs.verdict === "accepted"
                ? "bg-ok"
                : "bg-bad"
              : span.name.startsWith("fallback")
                ? "bg-warn"
                : "bg-ink";
        return (
          <div key={i} className="grid grid-cols-[7rem_1fr_3.75rem] items-center gap-3 font-mono text-[0.7rem]">
            <span className="truncate text-ink-2">{label}</span>
            <div className="relative h-1.5 bg-paper-3">
              <div className={`absolute h-full ${color}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
            </div>
            <span className="text-right tabular-nums text-ink-3">{fmtMs(span.durationMs)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <ul className="mt-3 space-y-2 border-l-2 border-bad pl-3">
      {issues.map((issue, i) => (
        <li key={i} className="text-[0.88rem] leading-snug">
          <span className="mr-2 font-mono text-[0.65rem] font-medium uppercase tracking-[0.06em] text-bad">{issue.stage}</span>
          <span className="font-mono text-[0.78rem] text-ink">{issue.path}</span> <span className="text-ink-2">— {issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

function AttemptCard({ span }: { span: TraceSpan }) {
  const a = span.attrs as {
    n: number;
    temperature: number;
    constrained: boolean;
    latencyMs: number;
    usage?: { promptTokens?: number; completionTokens?: number };
    raw?: string;
    issues: ValidationIssue[];
    notes: string[];
    providerError?: { code: string; message: string };
    verdict: string;
  };
  const accepted = a.verdict === "accepted";
  return (
    <div className="border-t border-rule py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[1.05rem] text-ink">
          Attempt {a.n} — <span className={accepted ? "text-ok" : "text-bad"}>{a.verdict.replace("_", " ")}</span>
        </span>
        <span className="font-mono text-[0.68rem] text-ink-3">
          {fmtMs(a.latencyMs)} · T={a.temperature} · {a.constrained ? "schema-constrained" : "unconstrained"}
          {a.usage?.completionTokens !== undefined && ` · ${a.usage.promptTokens ?? "?"} → ${a.usage.completionTokens} tokens`}
        </span>
      </div>
      {a.providerError && (
        <p className="mt-2 text-[0.88rem] text-bad">
          Provider error ({a.providerError.code}): {a.providerError.message}
        </p>
      )}
      {a.issues.length > 0 && <IssueList issues={a.issues} />}
      {a.notes.length > 0 && (
        <p className="mt-2 text-[0.82rem] text-ink-3">
          Normalized: <span className="font-mono text-[0.72rem]">{a.notes.join(", ")}</span>
        </p>
      )}
      {a.raw && (
        <details className="mt-2">
          <summary className="label cursor-pointer transition-colors hover:!text-ink">Raw model output</summary>
          <pre className="scrollbar-thin mt-2 max-h-72 overflow-auto bg-paper-3/70 p-3 font-mono text-[0.7rem] leading-relaxed text-ink-2">{pretty(a.raw)}</pre>
        </details>
      )}
    </div>
  );
}

export function TraceDrawer({
  trace,
  engine,
  outcome,
  verified,
  onClose,
}: {
  trace: Trace;
  engine?: EngineInfo;
  outcome?: Outcome;
  verified?: boolean | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const attempts = trace.spans.filter((s) => s.name === "llm.attempt");
  const route = trace.spans.find((s) => s.name === "route")?.attrs as Record<string, unknown> | undefined;
  const draw = trace.spans.find((s) => s.name === "draw")?.attrs as { seed?: string; picks?: number[]; cards?: string[]; algorithm?: string } | undefined;
  const fallback = trace.spans.find((s) => s.name === "fallback.compose");
  const tokens = attempts.reduce(
    (acc, s) => {
      const usage = (s.attrs as { usage?: { promptTokens?: number; completionTokens?: number } }).usage;
      return { prompt: acc.prompt + (usage?.promptTokens ?? 0), completion: acc.completion + (usage?.completionTokens ?? 0) };
    },
    { prompt: 0, completion: 0 },
  );
  const json = JSON.stringify({ engine, outcome, trace }, null, 2);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Pipeline trace">
      <button type="button" className="absolute inset-0 bg-ink/25" onClick={onClose} aria-label="Close trace" />
      <aside className="scrollbar-thin relative h-full w-full max-w-[40rem] animate-rise overflow-y-auto border-l border-rule bg-paper-2 px-5 py-6 shadow-[var(--shadow-sheet)] sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Under the hood</p>
            <h2 className="display mt-2 text-[2.1rem]">Pipeline trace</h2>
            <p className="mt-1 font-mono text-[0.68rem] text-ink-3">{trace.id}</p>
          </div>
          <button type="button" onClick={onClose} className="-mr-2 p-2 text-ink-3 transition-colors hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 border-t border-ink sm:grid-cols-3">
          {[
            ["Outcome", outcome ? <OutcomeBadge key="o" outcome={outcome} /> : "—"],
            ["Engine", engine ? `${engine.provider} · ${engine.model.split("/").pop()}` : "—"],
            ["Contract", engine ? `${engine.promptVersion} · ${engine.schemaVersion}` : "—"],
            ["Total latency", fmtMs(trace.durationMs)],
            ["Model calls", String(attempts.length)],
            ["Tokens", tokens.prompt + tokens.completion ? `${tokens.prompt} in · ${tokens.completion} out` : "—"],
          ].map(([label, value]) => (
            <div key={label as string} className="border-b border-rule py-3 pr-3">
              <dt className="label">{label}</dt>
              <dd className="mt-1.5 break-words text-[0.95rem] leading-snug text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="label mt-8 !text-ink">Timeline</h3>
        <div className="mt-3">
          <Timeline trace={trace} />
        </div>

        {route && (
          <>
            <h3 className="label mt-8 !text-ink">Routing</h3>
            <p className="mt-2 text-[0.98rem] text-ink-2">
              {route.focus !== undefined && (
                <>
                  Focus <strong className="font-medium text-ink">{String(route.focus)}</strong> ({String(route.focusSource)}
                  {typeof route.focusConfidence === "number" ? `, ${Math.round(route.focusConfidence * 100)}%` : ""}) ·{" "}
                </>
              )}
              safety <strong className="font-medium text-ink">{String(route.safety)}</strong>
              {route.rule ? ` (rule: ${String(route.rule)})` : ""}
              {route.gate ? ` · ${String(route.gate)} gate` : ""}
            </p>
          </>
        )}

        {draw?.cards && (
          <>
            <h3 className="label mt-8 flex items-center gap-2 !text-ink">
              Deterministic draw
              {verified && (
                <span className="seal !h-[1.1rem] !w-[1.1rem] !text-[0.65rem]" aria-hidden="true">
                  验
                </span>
              )}
            </h3>
            <p className="mt-2 text-[0.95rem] text-ink-2">
              <span className="font-mono text-[0.75rem] text-ink">{draw.algorithm}</span> · seed <span className="break-all font-mono text-[0.75rem]">{draw.seed}</span> ·
              picks [{draw.picks?.join(", ")}]
            </p>
            <ul className="mt-2 grid gap-x-4 gap-y-0.5 font-mono text-[0.72rem] text-ink-2 sm:grid-cols-2">
              {draw.cards.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            {verified !== undefined && verified !== null && (
              <p className={`mt-2 text-[0.9rem] ${verified ? "text-ok" : "text-bad"}`}>
                {verified
                  ? "Recomputed in your browser from the seed and picks: identical to the cards that were interpreted."
                  : "The recomputed draw does not match the interpreted cards."}
              </p>
            )}
          </>
        )}

        {attempts.length > 0 && (
          <>
            <h3 className="label mt-8 !text-ink">Model attempts</h3>
            <div className="mt-2">
              {attempts.map((span, i) => (
                <AttemptCard key={i} span={span} />
              ))}
            </div>
          </>
        )}
        {fallback && (
          <p className="mt-4 border-l-2 border-warn pl-3 text-[0.95rem] text-ink-2">
            Fallback served ({String(fallback.attrs.reason)}): a deterministic reading composed from the card knowledge base, which passes the same validator.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-2 border-t border-rule pt-6">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              navigator.clipboard?.writeText(json).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <a className="btn btn-secondary" href={`data:application/json;charset=utf-8,${encodeURIComponent(json)}`} download={`${trace.id}.json`}>
            Download
          </a>
        </div>
      </aside>
    </div>
  );
}
