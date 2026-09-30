import { Activity, Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { OutcomeBadge } from "../../components/TraceDrawer";
import type { EngineInfo } from "../../core/llm/pipeline";
import type { Trace } from "../../core/llm/trace";
import type { Outcome } from "../../core/llm/types";
import { MESSAGE_LIMITS, type SupportMessage } from "../../core/orchestrate";
import { getCard } from "../../core/tarot/deck";
import type { Draw } from "../../core/tarot/engine";
import { SupportCard } from "./SupportCard";

export interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  outcome?: Outcome;
  trace?: Trace;
  engine?: EngineInfo;
  refs?: Array<{ cardId: string; position: string }>;
  support?: SupportMessage;
  error?: boolean;
}

export function ChatPanel({
  draw,
  entries,
  suggestions,
  busy,
  disabledReason,
  onSend,
  onInspect,
}: {
  draw: Draw;
  entries: ChatEntry[];
  suggestions: string[];
  busy: boolean;
  disabledReason?: string;
  onSend: (message: string) => void;
  onInspect: (entry: ChatEntry) => void;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [entries.length, busy]);

  const send = (message: string) => {
    const trimmed = message.trim();
    if (trimmed.length < MESSAGE_LIMITS.min || busy || disabledReason) return;
    onSend(trimmed);
    setText("");
  };
  const unused = suggestions.filter((s) => !entries.some((e) => e.role === "user" && e.content === s));

  return (
    <section className="panel p-5 sm:p-6" aria-label="Follow-up conversation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="display flex items-center gap-2 text-2xl">
          <MessageCircle className="h-5 w-5 text-gold-300" /> Ask a follow-up
        </h3>
        <p className="text-xs text-mist-500">Answers stay grounded in the cards you drew; the session remembers the conversation.</p>
      </div>

      <div ref={listRef} className="scrollbar-thin mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
        {entries.length === 0 && <p className="text-sm text-mist-500">Ask about a specific card, how two cards relate, or what to do next.</p>}
        {entries.map((entry, i) =>
          entry.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gold-400/15 px-4 py-2.5 text-sm text-gold-100">{entry.content}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%]">
              {entry.support && <SupportCard support={entry.support} compact />}
              <p className={`mt-2 rounded-2xl rounded-bl-md border px-4 py-3 text-sm leading-relaxed ${entry.error ? "border-bad-400/30 text-bad-400" : "border-white/5 bg-white/[0.03] text-mist-200"}`}>
                {entry.content}
              </p>
              {!entry.error && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1">
                  {entry.refs?.map((ref) => {
                    const drawn = draw.cards.find((c) => c.cardId === ref.cardId);
                    return (
                      <span key={ref.cardId} className="chip !py-0.5 !text-[11px]">
                        {getCard(ref.cardId).name}
                        {drawn ? ` · ${drawn.positionLabel}` : ""}
                      </span>
                    );
                  })}
                  {entry.outcome && entry.outcome !== "accepted" && entry.outcome !== "offline" && <OutcomeBadge outcome={entry.outcome} />}
                  {entry.trace && (
                    <button type="button" onClick={() => onInspect(entry)} className="inline-flex items-center gap-1 text-[11px] text-mist-500 hover:text-gold-200">
                      <Activity className="h-3 w-3" /> trace
                    </button>
                  )}
                </div>
              )}
            </div>
          ),
        )}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-mist-400">
            <Loader2 className="h-4 w-4 animate-spin text-gold-300" /> Consulting the cards…
          </p>
        )}
      </div>

      {unused.length > 0 && !disabledReason && (
        <div className="mt-4 flex flex-wrap gap-2">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="chip text-left transition hover:border-gold-400/40 hover:text-mist-100 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}

      {disabledReason ? (
        <p className="mt-4 text-sm text-mist-500">{disabledReason}</p>
      ) : (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor="followup" className="sr-only">
            Follow-up question
          </label>
          <input
            id="followup"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MESSAGE_LIMITS.max}
            placeholder="What does the card in the future position ask of me?"
            className="field flex-1 !rounded-full !py-2.5"
            autoComplete="off"
          />
          <button type="submit" disabled={busy || text.trim().length < MESSAGE_LIMITS.min} className="btn-primary !px-4" aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </section>
  );
}
