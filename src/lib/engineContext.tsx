import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { HealthDTO } from "../core/contracts";
import { api } from "./api";
import { API_BASE } from "./config";
import { getEngine, type Engine, type EngineMode } from "./engine";
import { readJSON, writeJSON } from "./storage";

export type LiveStatus = "checking" | "up" | "down" | "unconfigured";

interface EngineContextValue {
  mode: EngineMode;
  engine: Engine;
  setMode: (mode: EngineMode) => void;
  live: { status: LiveStatus; health: HealthDTO | null };
}

const EngineContext = createContext<EngineContextValue | null>(null);
const PREF_KEY = "pf.enginePref";

export function EngineProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<{ status: LiveStatus; health: HealthDTO | null }>({
    status: API_BASE === null ? "unconfigured" : "checking",
    health: null,
  });
  const [pref, setPref] = useState<EngineMode | null>(() => readJSON<EngineMode | null>(PREF_KEY, null));

  useEffect(() => {
    if (API_BASE === null) return;
    let cancelled = false;
    api
      .health()
      .then((health) => !cancelled && setLive({ status: "up", health }))
      .catch(() => !cancelled && setLive({ status: "down", health: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  const mode: EngineMode = pref && (pref !== "live" || live.status === "up") ? pref : live.status === "up" ? "live" : "offline";

  const setMode = useCallback((next: EngineMode) => {
    setPref(next);
    writeJSON(PREF_KEY, next);
  }, []);

  const value = useMemo(() => ({ mode, engine: getEngine(mode), setMode, live }), [mode, setMode, live]);
  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine(): EngineContextValue {
  const value = useContext(EngineContext);
  if (!value) throw new Error("useEngine must be used inside <EngineProvider>");
  return value;
}
