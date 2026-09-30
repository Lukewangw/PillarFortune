import { Check, ChevronDown, Cpu, FlaskConical, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ENGINE_INFO, type EngineMode } from "../lib/engine";
import { useEngine } from "../lib/engineContext";

const ICONS: Record<EngineMode, typeof Cpu> = { live: Cpu, demo: FlaskConical, offline: WifiOff };

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

  const dot = mode === "live" ? "bg-ok-400" : mode === "demo" ? "bg-warn-400" : "bg-mist-400";
  const label = mode === "live" ? live.health?.model.split("/").pop()?.replace("-instruct-fp8-fast", "") ?? "Live" : ENGINE_INFO[mode].title;
  const shortLabel = mode === "live" ? "Live" : mode === "demo" ? "Sim" : "Offline";
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
        className="btn-ghost !px-3 !py-1.5 text-xs"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`h-2 w-2 rounded-full ${dot} shadow-[0_0_10px_currentColor]`} />
        <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 sm:block" />
      </button>
      {open && (
        <div role="menu" className="panel absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] p-2 shadow-2xl">
          <p className="px-3 pb-2 pt-1 text-xs text-mist-400">Interpretation engine</p>
          {(["live", "demo", "offline"] as EngineMode[]).map((option) => {
            const Icon = ICONS[option];
            const disabled = option === "live" && live.status !== "up";
            return (
              <button
                key={option}
                role="menuitemradio"
                aria-checked={mode === option}
                disabled={disabled}
                onClick={() => {
                  setMode(option);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-mist-100">
                    {ENGINE_INFO[option].title}
                    {mode === option && <Check className="h-3.5 w-3.5 text-ok-400" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mist-400">
                    {option === "live" ? liveNote : ENGINE_INFO[option].detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
