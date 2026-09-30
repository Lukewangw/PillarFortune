/** A gold crescent cradling a star inside a ring of rays: the mark on the card backs, in small. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const rays = Array.from({ length: 16 }, (_, k) => {
    const a = (k * Math.PI) / 8;
    const r2 = k % 2 === 0 ? 30 : 26.5;
    return <line key={k} x1={Math.cos(a) * 22.5} y1={Math.sin(a) * 22.5} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} strokeWidth={k % 2 === 0 ? 2 : 1.3} />;
  });
  return (
    <svg viewBox="-32 -32 64 64" className={className} aria-hidden="true" stroke="#d6b370" fill="none" strokeLinecap="round">
      {rays}
      <circle r="19.5" strokeWidth="1.8" />
      <path d="M3 -13 A13 13 0 1 0 3 13 A7.5 13 0 1 1 3 -13 Z" fill="#e9d39b" stroke="none" />
      <path d="M5.5 -4.5 L6.6 -1.1 L10 0 L6.6 1.1 L5.5 4.5 L4.4 1.1 L1 0 L4.4 -1.1 Z" fill="#f3e2b3" stroke="none" />
    </svg>
  );
}
