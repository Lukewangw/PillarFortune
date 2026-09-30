import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* Small, dependency-free SVG charts following the dataviz specs: thin marks, hairline
   grids, a legend for multi-series charts, direct labels used sparingly, and a hover layer
   (crosshair or per-mark tooltip) whose values are also available in a table view. */

function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x + 14, 8), width - 190);
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-white/10 bg-ink-900/95 px-3 py-2 text-xs shadow-xl"
      style={{ left, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  );
}

export function LineKey({ color }: { color: string }) {
  return <span className="inline-block h-0.5 w-3.5 rounded-full align-middle" style={{ background: color }} />;
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  /** Continuous curve (e.g. the analytic prediction). */
  line: Array<{ x: number; y: number }>;
  /** Measured points (e.g. simulation results), drawn as dots and used by the crosshair. */
  dots: Array<{ x: number; y: number }>;
}

export function LineChart({
  series,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  formatX,
  formatY,
  xLabel,
  height = 280,
  dotsLabel = "measured",
  lineLabel = "predicted",
}: {
  series: LineSeries[];
  xDomain: [number, number];
  yDomain: [number, number];
  xTicks: number[];
  yTicks: number[];
  formatX: (v: number) => string;
  formatY: (v: number) => string;
  xLabel: string;
  height?: number;
  dotsLabel?: string;
  lineLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 12, right: 64, bottom: 38, left: 44 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;
  const sx = (v: number) => m.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * w;
  const sy = (v: number) => m.top + h - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * h;
  const xs = [...new Set(series.flatMap((s) => s.dots.map((d) => d.x)))].sort((a, b) => a - b);
  const hoverX = hover === null ? null : xs[hover];

  return (
    <div ref={ref} className="viz relative w-full min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--viz-text-2)]">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <LineKey color={s.color} /> {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[var(--viz-muted)]">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill="var(--viz-text-2)" />
          </svg>
          {dotsLabel} · lines = {lineLabel}
        </span>
      </div>
      <div className="relative">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        role="img"
        aria-label={`${xLabel} line chart`}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = e.clientX - rect.left;
          let best = 0;
          xs.forEach((x, i) => {
            if (Math.abs(sx(x) - px) < Math.abs(sx(xs[best]) - px)) best = i;
          });
          setHover(best);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + w} y1={sy(t)} y2={sy(t)} stroke="var(--viz-grid)" strokeWidth="1" />
            <text x={m.left - 8} y={sy(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--viz-muted)" className="tabular-nums">
              {formatY(t)}
            </text>
          </g>
        ))}
        <line x1={m.left} x2={m.left + w} y1={m.top + h} y2={m.top + h} stroke="var(--viz-axis)" strokeWidth="1" />
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={m.top + h + 18} textAnchor="middle" fontSize="11" fill="var(--viz-muted)" className="tabular-nums">
            {formatX(t)}
          </text>
        ))}
        <text x={m.left + w / 2} y={height - 4} textAnchor="middle" fontSize="11" fill="var(--viz-text-2)">
          {xLabel}
        </text>
        {hoverX !== null && <line x1={sx(hoverX)} x2={sx(hoverX)} y1={m.top} y2={m.top + h} stroke="var(--viz-axis)" strokeWidth="1" />}
        {series.map((s) => (
          <g key={s.key}>
            <polyline
              points={s.line.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.dots.map((d) => (
              <circle key={d.x} cx={sx(d.x)} cy={sy(d.y)} r={hoverX === d.x ? 5 : 4} fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />
            ))}
            {s.line.length > 0 && (
              <text x={m.left + w + 8} y={sy(s.line[s.line.length - 1].y)} dy="0.32em" fontSize="11" fill="var(--viz-text-2)">
                {s.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hoverX !== null && (
        <Tooltip x={sx(hoverX)} y={m.top + 6} width={width}>
          <p className="mb-1 text-[var(--viz-muted)]">
            {xLabel}: {formatX(hoverX)}
          </p>
          {series.map((s) => {
            const d = s.dots.find((p) => p.x === hoverX);
            return (
              <p key={s.key} className="flex items-center gap-2">
                <LineKey color={s.color} />
                <strong className="font-semibold text-[var(--viz-text)]">{d ? formatY(d.y) : "—"}</strong>
                <span className="text-[var(--viz-text-2)]">{s.label}</span>
              </p>
            );
          })}
        </Tooltip>
      )}
      </div>
    </div>
  );
}

export function BarList({
  rows,
  max = 1,
  format,
  color = "var(--viz-s1)",
}: {
  rows: Array<{ label: string; value: number; note?: string }>;
  max?: number;
  format: (v: number) => string;
  color?: string;
}) {
  return (
    <ul className="viz space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[7.5rem_1fr_3.25rem] items-center gap-3 text-xs" title={row.note}>
          <span className="truncate text-[var(--viz-text-2)]">{row.label}</span>
          <span className="relative h-3">
            <span className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${(row.value / max) * 100}%`, background: color }} />
          </span>
          <span className="text-right font-medium tabular-nums text-[var(--viz-text)]">{format(row.value)}</span>
        </li>
      ))}
    </ul>
  );
}

const RAMP = ["#1a1936", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef"];

/** Confusion matrix, row-normalized (recall per true class). */
export function ConfusionMatrix({ labels, matrix, display }: { labels: string[]; matrix: number[][]; display?: (label: string) => string }) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const name = display ?? ((l: string) => l);
  return (
    <div className="viz overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-[11px]">
        <thead>
          <tr>
            <th className="px-1 text-left font-normal text-[var(--viz-muted)]">true ↓ / predicted →</th>
            {labels.map((l) => (
              <th key={l} className="px-1 font-normal text-[var(--viz-muted)]">
                {name(l)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const total = row.reduce((a, b) => a + b, 0) || 1;
            return (
              <tr key={labels[i]}>
                <th className="pr-2 text-right font-normal text-[var(--viz-text-2)]">{name(labels[i])}</th>
                {row.map((count, j) => {
                  const share = count / total;
                  const bg = count === 0 ? "rgb(255 255 255 / 0.03)" : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(share * (RAMP.length - 1)))];
                  const light = share > 0.55;
                  const active = hover?.[0] === i && hover?.[1] === j;
                  return (
                    <td
                      key={j}
                      tabIndex={0}
                      onPointerEnter={() => setHover([i, j])}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover([i, j])}
                      onBlur={() => setHover(null)}
                      title={`${name(labels[i])} → ${name(labels[j])}: ${count} (${Math.round(share * 100)}% of row)`}
                      className={`h-9 min-w-12 rounded-[4px] text-center tabular-nums outline-none ${active ? "ring-1 ring-white/60" : ""}`}
                      style={{ background: bg, color: light ? "#06050d" : "var(--viz-text)" }}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Histogram({
  values,
  labels,
  reference,
  referenceLabel,
  height = 150,
}: {
  values: number[];
  labels: string[];
  reference: number;
  referenceLabel: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 24, right: 8, bottom: 20, left: 40 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;
  const max = Math.max(...values, reference) * 1.08;
  const slot = w / values.length;
  const barW = Math.max(1, Math.min(24, slot - 2));
  const sy = (v: number) => m.top + h - (v / max) * h;
  return (
    <div ref={ref} className="viz relative w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label="Histogram" onPointerLeave={() => setHover(null)}>
        {[0, reference].map((t) => (
          <text key={t} x={m.left - 6} y={sy(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--viz-muted)" className="tabular-nums">
            {t.toLocaleString()}
          </text>
        ))}
        {values.map((v, i) => (
          <rect
            key={i}
            x={m.left + i * slot + (slot - barW) / 2}
            y={sy(v)}
            width={barW}
            height={Math.max(0, m.top + h - sy(v))}
            rx="1.5"
            fill={hover === i ? "var(--viz-ord-2)" : "var(--viz-s1)"}
            onPointerEnter={() => setHover(i)}
          />
        ))}
        <line x1={m.left} x2={m.left + w} y1={m.top + h} y2={m.top + h} stroke="var(--viz-axis)" strokeWidth="1" />
        <line x1={m.left} x2={m.left + w} y1={sy(reference)} y2={sy(reference)} stroke="var(--viz-text-2)" strokeOpacity="0.7" strokeWidth="1" />
        <text x={m.left + 4} y={sy(reference) - 18} fontSize="10" fill="var(--viz-text-2)">
          {referenceLabel}
        </text>
      </svg>
      {hover !== null && (
        <Tooltip x={m.left + hover * slot} y={m.top} width={width}>
          <p>
            <strong className="font-semibold text-[var(--viz-text)]">{values[hover].toLocaleString()}</strong>{" "}
            <span className="text-[var(--viz-text-2)]">{labels[hover]}</span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}

export function StatTile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="panel p-5">
      <p className="text-xs text-mist-400">{label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold text-mist-100">{value}</p>
      {caption && <p className="mt-2 text-xs leading-relaxed text-mist-500">{caption}</p>}
    </div>
  );
}
