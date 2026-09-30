import type { ReactNode } from "react";
import { SPREADS, type SpreadId } from "../../core/tarot/spreads";

/** Places one node per spread position on the spread's grid (e.g. the five-card cross). */
export function SpreadLayout({ spread, render, gap = "gap-3 sm:gap-6" }: { spread: SpreadId; render: (index: number) => ReactNode; gap?: string }) {
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

/** A miniature of the spread's layout: one outlined card per position, filled when selected. */
export function SpreadDiagram({ spread, active = false }: { spread: SpreadId; active?: boolean }) {
  const def = SPREADS[spread];
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${def.grid.cols}, 12px)`, gridTemplateRows: `repeat(${def.grid.rows}, 20px)` }}>
      {def.positions.map((p) => (
        <div
          key={p.id}
          style={{ gridColumn: p.slot.col + 1, gridRow: p.slot.row + 1 }}
          className={`rounded-[1.5px] border transition-colors ${active ? "border-accent bg-accent" : "border-ink-3 bg-paper-2"}`}
        />
      ))}
    </div>
  );
}
