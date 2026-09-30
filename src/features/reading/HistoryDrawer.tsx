import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { OutcomeBadge } from "../../components/TraceDrawer";
import type { HistoryItem } from "../../core/contracts";
import type { Outcome } from "../../core/llm/types";
import { SPREADS, isSpreadId } from "../../core/tarot/spreads";
import { useEngine } from "../../lib/engineContext";

export function HistoryDrawer({ onClose, onOpen }: { onClose: () => void; onOpen: (id: string) => void }) {
  const { engine, mode } = useEngine();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    engine
      .history()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Past readings">
      <button type="button" className="absolute inset-0 bg-ink/25" onClick={onClose} aria-label="Close history" />
      <aside className="scrollbar-thin relative h-full w-full max-w-md animate-rise overflow-y-auto border-l border-rule bg-paper-2 px-6 py-7 shadow-[var(--shadow-sheet)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="label">{mode === "live" ? "Linked to this browser, anonymously" : "Stored in this browser"}</p>
            <h2 className="display mt-2 text-[2.1rem]">Past readings</h2>
          </div>
          <button type="button" onClick={onClose} className="-mr-2 p-2 text-ink-3 transition-colors hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!items && !error && <p className="label mt-8">Loading…</p>}
        {error && <p className="mt-8 text-[0.95rem] text-bad">{error}</p>}
        {items?.length === 0 && <p className="mt-8 text-[1rem] italic text-ink-3">No readings yet with this engine.</p>}
        <ul className="mt-6 border-t border-ink">
          {items?.map((item) => (
            <li key={item.id} className="border-b border-rule">
              <button type="button" onClick={() => onOpen(item.id)} className="group w-full py-4 text-left">
                <p className="label">
                  {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                  {isSpreadId(item.spread) ? SPREADS[item.spread].name : item.spread}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[1.05rem] leading-snug text-ink transition-colors group-hover:text-accent">“{item.question}”</p>
                <p className="mt-1.5 text-[0.88rem] italic text-ink-3">{item.cards.map((c) => `${c.name}${c.orientation === "reversed" ? " (reversed)" : ""}`).join(" · ")}</p>
                <div className="mt-2">
                  <OutcomeBadge outcome={item.outcome as Outcome} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
