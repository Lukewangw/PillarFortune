/** Small localStorage helpers; every access is guarded (private mode, blocked storage). */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: history simply isn't persisted */
  }
}

export function clientId(): string {
  const existing = readJSON<string | null>("pf.clientId", null);
  if (existing) return existing;
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const id = `c_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  writeJSON("pf.clientId", id);
  return id;
}
