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

/** Follow-up questions as a transcript: the session keeps the question, the cards and the conversation. */
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
  const endRef = useRef<HTMLDivElement>(null);
  // Follow the conversation only when it grows, never on mount (a reopened reading starts at the top).
  const seen = useRef(entries.length);
  useEffect(() => {
    if (entries.length > seen.current || busy) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    seen.current = entries.length;
  }, [entries.length, busy]);

  const send = (message: string) => {
    const trimmed = message.trim();
    if (trimmed.length < MESSAGE_LIMITS.min || busy || disabledReason) return;
    onSend(trimmed);
    setText("");
  };
  const unused = suggestions.filter((s) => !entries.some((e) => e.role === "user" && e.content === s));

  return (
    <section aria-label="Follow-up conversation" className="relative">
      <div className="text-center">
        <p className="label">✦ &nbsp;Continue the reading&nbsp; ✦</p>
        <h2 className="display mt-3 text-[1.9rem]">Ask a follow-up</h2>
        <p className="mx-auto mt-2 max-w-md text-[0.95rem] text-star-3">Answers stay grounded in the cards you drew, and the session remembers the conversation.</p>
      </div>

      {entries.length > 0 && (
        <ol className="mt-6 space-y-6">
          {entries.map((entry, i) =>
            entry.role === "user" ? (
              <li key={i} data-entry="user" className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3">
                <span className="label pt-1 !text-star-3">You</span>
                <p className="text-[1.05rem] italic leading-relaxed text-star">{entry.content}</p>
              </li>
            ) : (
              <li key={i} data-entry="assistant" className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3">
                <span className={`label pt-1 ${entry.error ? "!text-bad" : "!text-gold"}`}>{entry.error ? "Error" : "Reply"}</span>
                <div className="min-w-0">
                  {entry.support && <SupportCard support={entry.support} compact />}
                  <p className={`text-[1.02rem] leading-relaxed ${entry.error ? "text-bad" : "text-star-2"} ${entry.support ? "mt-3" : ""}`}>{entry.content}</p>
                  {!entry.error && (entry.refs?.length || entry.trace || (entry.outcome && entry.outcome !== "accepted" && entry.outcome !== "offline")) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {entry.refs?.map((ref) => {
                        const drawn = draw.cards.find((c) => c.cardId === ref.cardId);
                        return (
                          <span key={ref.cardId} className="tag">
                            {getCard(ref.cardId).name}
                            {drawn ? ` · ${drawn.positionLabel}` : ""}
                          </span>
                        );
                      })}
                      {entry.outcome && entry.outcome !== "accepted" && entry.outcome !== "offline" && <OutcomeBadge outcome={entry.outcome} />}
                      {entry.trace && (
                        <button type="button" onClick={() => onInspect(entry)} className="label transition-colors hover:!text-gold">
                          Trace →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ),
          )}
          {busy && (
            <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3">
              <span className="label pt-1 !text-gold">Reply</span>
              <p className="flex items-center gap-2 text-[1rem] italic text-star-3">
                <span className="inline-block h-2 w-2 animate-pulse bg-gold" aria-hidden="true" /> Consulting the cards…
              </p>
            </li>
          )}
        </ol>
      )}
      <div ref={endRef} />

      {unused.length > 0 && !disabledReason && (
        <div className="mt-6">
          <p className="label">You might ask</p>
          <ul className="mt-2 space-y-1">
            {unused.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => send(s)} disabled={busy} className="text-left text-[1rem] italic leading-snug text-star-2 transition-colors hover:text-gold disabled:opacity-50">
                  “{s}”
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {disabledReason ? (
        <p className="mt-6 text-[0.95rem] text-star-3">{disabledReason}</p>
      ) : (
        <form
          className="mt-6 flex gap-2"
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
            className="field flex-1 text-[1.02rem]"
            autoComplete="off"
          />
          <button type="submit" disabled={busy || text.trim().length < MESSAGE_LIMITS.min} className="btn btn-primary" aria-label="Send">
            Send
          </button>
        </form>
      )}
    </section>
  );
}
