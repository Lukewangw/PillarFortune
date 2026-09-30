import { Check, ClipboardCopy, Download, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { EngineInfo } from "../core/llm/pipeline";
import type { Trace, TraceSpan } from "../core/llm/trace";
import type { Outcome, ValidationIssue } from "../core/llm/types";

export const OUTCOME_META: Record<Outcome, { label: string; tone: string }> = {
  accepted: { label: "Accepted first try", tone: "text-ok-400 border-ok-400/30 bg-ok-400/10" },
  repaired: { label: "Repaired after validation", tone: "text-warn-400 border-warn-400/30 bg-warn-400/10" },
  fallback: { label: "Knowledge-base fallback", tone: "text-bad-400 border-bad-400/30 bg-bad-400/10" },
  offline: { label: "Offline composer", tone: "text-mist-300 border-white/15 bg-white/5" },
  blocked: { label: "Routed to support", tone: "text-rose-300 border-rose-300/30 bg-rose-300/10" },
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const meta = OUTCOME_META[outcome];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${meta.tone}`}>{meta.label}</span>;
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
    <div className="space-y-1.5">
      {trace.spans.map((span, i) => {
        const left = (span.startMs / total) * 100;
        const width = Math.max((span.durationMs / total) * 100, 0.8);
        const label = span.name === "llm.attempt" ? `attempt ${String(span.attrs.n)}` : span.name;
        const color =
          span.status === "error" ? "bg-bad-400/70" : span.name === "llm.attempt" ? "bg-ok-400/70" : span.name.startsWith("fallback") ? "bg-warn-400/70" : "bg-lilac-400/60";
        return (
          <div key={i} className="grid grid-cols-[7.5rem_1fr_4rem] items-center gap-2 text-xs">
            <span className="truncate font-mono text-mist-400">{label}</span>
            <div className="relative h-2.5 rounded-full bg-white/5">
              <div className={`absolute h-full rounded-full ${color}`} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
            </div>
            <span className="text-right tabular-nums text-mist-500">{fmtMs(span.durationMs)}</span>
          </div>
        );
      })}
    </div>
  );
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {issues.map((issue, i) => (
        <li key={i} className="rounded-lg bg-bad-400/[0.06] px-2.5 py-1.5 text-xs">
          <span className="mr-2 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-bad-400">{issue.stage}</span>
          <span className="font-mono text-mist-300">{issue.path}</span> <span className="text-mist-400">— {issue.message}</span>
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
    <div className={`rounded-xl border p-3 ${accepted ? "border-ok-400/25 bg-ok-400/[0.03]" : "border-bad-400/25 bg-bad-400/[0.03]"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className={`font-medium ${accepted ? "text-ok-400" : "text-bad-400"}`}>
          Attempt {a.n} · {a.verdict.replace("_", " ")}
        </span>
        <span className="text-mist-500">{fmtMs(a.latencyMs)}</span>
        <span className="text-mist-500">T={a.temperature}</span>
        <span className="text-mist-500">{a.constrained ? "schema-constrained decoding" : "unconstrained"}</span>
        {a.usage?.completionTokens !== undefined && (
          <span className="text-mist-500">
            {a.usage.promptTokens ?? "?"} → {a.usage.completionTokens} tokens
          </span>
        )}
      </div>
      {a.providerError && <p className="mt-2 text-xs text-bad-400">Provider error ({a.providerError.code}): {a.providerError.message}</p>}
      {a.issues.length > 0 && <IssueList issues={a.issues} />}
      {a.notes.length > 0 && (
        <p className="mt-2 text-[11px] text-mist-500">
          Normalized: <span className="font-mono">{a.notes.join(", ")}</span>
        </p>
      )}
      {a.raw && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-mist-400 hover:text-mist-200">Raw model output</summary>
          <pre className="scrollbar-thin mt-2 max-h-72 overflow-auto rounded-lg bg-ink-950/80 p-3 font-mono text-[11px] leading-relaxed text-mist-300">{pretty(a.raw)}</pre>
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
      <button type="button" className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} aria-label="Close trace" />
      <aside className="scrollbar-thin relative h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-ink-900/95 p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Under the hood</p>
            <h2 className="display mt-1 text-3xl">Pipeline trace</h2>
            <p className="mt-1 font-mono text-[11px] text-mist-500">{trace.id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-mist-400 hover:bg-white/5 hover:text-mist-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Outcome", outcome ? <OutcomeBadge key="o" outcome={outcome} /> : "—"],
            ["Engine", engine ? `${engine.provider} · ${engine.model.split("/").pop()}` : "—"],
            ["Contract", engine ? `${engine.promptVersion} · ${engine.schemaVersion}` : "—"],
            ["Total latency", fmtMs(trace.durationMs)],
            ["Model calls", String(attempts.length)],
            ["Tokens", tokens.prompt + tokens.completion ? `${tokens.prompt} in · ${tokens.completion} out` : "—"],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <dt className="text-[11px] uppercase tracking-wider text-mist-500">{label}</dt>
              <dd className="mt-1 break-words text-sm text-mist-100">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="eyebrow mt-8">Timeline</h3>
        <div className="mt-3">
          <Timeline trace={trace} />
        </div>

        {route && (
          <>
            <h3 className="eyebrow mt-8">Routing</h3>
            <p className="mt-2 text-sm text-mist-300">
              {route.focus !== undefined && (
                <>
                  Focus <strong className="text-mist-100">{String(route.focus)}</strong> ({String(route.focusSource)}
                  {typeof route.focusConfidence === "number" ? `, ${Math.round(route.focusConfidence * 100)}%` : ""}) ·{" "}
                </>
              )}
              safety <strong className="text-mist-100">{String(route.safety)}</strong>
              {route.rule ? ` (rule: ${String(route.rule)})` : ""}
              {route.gate ? ` · ${String(route.gate)} gate` : ""}
            </p>
          </>
        )}

        {draw?.cards && (
          <>
            <h3 className="eyebrow mt-8 flex items-center gap-2">
              Deterministic draw {verified && <ShieldCheck className="h-3.5 w-3.5 text-ok-400" />}
            </h3>
            <p className="mt-2 text-sm text-mist-300">
              <span className="font-mono text-xs text-mist-400">{draw.algorithm}</span> · seed <span className="font-mono text-xs">{draw.seed}</span> · picks [
              {draw.picks?.join(", ")}]
            </p>
            <ul className="mt-2 grid gap-1 font-mono text-xs text-mist-400 sm:grid-cols-2">
              {draw.cards.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            {verified !== undefined && verified !== null && (
              <p className={`mt-2 text-xs ${verified ? "text-ok-400" : "text-bad-400"}`}>
                {verified
                  ? "Recomputed in your browser from the seed and picks: identical to the cards that were interpreted."
                  : "The recomputed draw does not match the interpreted cards."}
              </p>
            )}
          </>
        )}

        {attempts.length > 0 && (
          <>
            <h3 className="eyebrow mt-8">Model attempts</h3>
            <div className="mt-3 space-y-3">
              {attempts.map((span, i) => (
                <AttemptCard key={i} span={span} />
              ))}
            </div>
          </>
        )}
        {fallback && (
          <p className="mt-4 rounded-xl border border-warn-400/25 bg-warn-400/[0.05] p-3 text-sm text-warn-400">
            Fallback served ({String(fallback.attrs.reason)}): a deterministic reading composed from the card knowledge base, which passes the same validator.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              navigator.clipboard?.writeText(json).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? <Check className="h-4 w-4 text-ok-400" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? "Copied" : "Copy JSON"}
          </button>
          <a className="btn-ghost text-sm" href={`data:application/json;charset=utf-8,${encodeURIComponent(json)}`} download={`${trace.id}.json`}>
            <Download className="h-4 w-4" /> Download
          </a>
        </div>
      </aside>
    </div>
  );
}
