import { Loader2, X } from "lucide-react";
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
      <button type="button" className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} aria-label="Close history" />
      <aside className="scrollbar-thin relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-ink-900/95 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">{mode === "live" ? "Linked to this browser, anonymously" : "Stored in this browser"}</p>
            <h2 className="display mt-1 text-3xl">Past readings</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-mist-400 hover:bg-white/5" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!items && !error && (
          <p className="mt-8 flex items-center gap-2 text-sm text-mist-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {error && <p className="mt-8 text-sm text-bad-400">{error}</p>}
        {items?.length === 0 && <p className="mt-8 text-sm text-mist-400">No readings yet with this engine.</p>}
        <ul className="mt-6 space-y-3">
          {items?.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => onOpen(item.id)} className="panel w-full p-4 text-left transition hover:!border-gold-400/40">
                <p className="text-xs text-mist-500">
                  {new Date(item.createdAt).toLocaleString()} · {isSpreadId(item.spread) ? SPREADS[item.spread].name : item.spread}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-mist-100">{item.question}</p>
                <p className="mt-2 text-xs text-mist-400">{item.cards.map((c) => `${c.name}${c.orientation === "reversed" ? " (r)" : ""}`).join(" · ")}</p>
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
