import { useEffect, useRef, useState } from "react";
import { ENGINE_INFO, type EngineMode } from "../lib/engine";
import { useEngine } from "../lib/engineContext";

const MARK: Record<EngineMode, string> = { live: "bg-ok", demo: "bg-warn", offline: "bg-ink-3" };
const SHORT: Record<EngineMode, string> = { live: "Live", demo: "Sim", offline: "Offline" };

/** The interpretation engine switch: a quiet text control in the header that opens a small menu. */
export function EngineBadge() {
  const { mode, setMode, live } = useEngine();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    mode === "live" ? (live.health?.model.split("/").pop()?.replace("-instruct-fp8-fast", "").replace("llama-", "Llama ") ?? "Live") : mode === "demo" ? "Simulated" : "Offline";
  const liveNote =
    live.status === "up"
      ? `Connected · ${live.health?.model ?? ""}`
      : live.status === "checking"
        ? "Checking the API…"
        : live.status === "down"
          ? "The API is unreachable right now."
          : "This static build has no API configured.";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="label flex items-center gap-2 py-1 transition-colors hover:!text-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Interpretation engine"
      >
        <span className={`h-1.5 w-1.5 ${MARK[mode]}`} aria-hidden="true" />
        <span className="hidden sm:inline">Engine:</span>
        <span className="hidden max-w-[9rem] truncate text-ink sm:inline">{label}</span>
        <span className="text-ink sm:hidden">{SHORT[mode]}</span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div role="menu" className="sheet absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] animate-rise p-1.5 shadow-[var(--shadow-lift)]">
          <p className="label px-3 pb-1 pt-2">Interpretation engine</p>
          {(["live", "demo", "offline"] as EngineMode[]).map((option) => {
            const disabled = option === "live" && live.status !== "up";
            const selected = mode === option;
            return (
              <button
                key={option}
                role="menuitemradio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => {
                  setMode(option);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-paper-3/60 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className={`mt-1.5 flex h-3 w-3 shrink-0 items-center justify-center border ${selected ? "border-ink" : "border-rule-2"}`} aria-hidden="true">
                  {selected && <span className="h-1.5 w-1.5 bg-accent" />}
                </span>
                <span className="flex-1">
                  <span className="block text-[0.95rem] leading-snug text-ink">{ENGINE_INFO[option].title}</span>
                  <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-3">{option === "live" ? liveNote : ENGINE_INFO[option].detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
