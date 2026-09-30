import type { ReactNode } from "react";
import { SPREADS, type SpreadId } from "../../core/tarot/spreads";

/** Places one node per spread position on the spread's grid (e.g. the five-card cross). */
export function SpreadLayout({ spread, render, gap = "gap-3 sm:gap-5" }: { spread: SpreadId; render: (index: number) => ReactNode; gap?: string }) {
  const def = SPREADS[spread];
  return (
    <div
      className={`mx-auto grid w-fit ${gap}`}
      style={{ gridTemplateColumns: `repeat(${def.grid.cols}, minmax(0, auto))`, gridTemplateRows: `repeat(${def.grid.rows}, auto)` }}
    >
      {def.positions.map((position, i) => (
        <div key={position.id} style={{ gridColumn: position.slot.col + 1, gridRow: position.slot.row + 1 }} className="flex flex-col items-center">
          {render(i)}
        </div>
      ))}
    </div>
  );
}

export function SpreadDiagram({ spread, active = false }: { spread: SpreadId; active?: boolean }) {
  const def = SPREADS[spread];
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${def.grid.cols}, 14px)`, gridTemplateRows: `repeat(${def.grid.rows}, 22px)` }}>
      {def.positions.map((p) => (
        <div
          key={p.id}
          style={{ gridColumn: p.slot.col + 1, gridRow: p.slot.row + 1 }}
          className={`rounded-[3px] border ${active ? "border-gold-300 bg-gold-400/25" : "border-mist-500/60 bg-white/5"}`}
        />
      ))}
    </div>
  );
}
