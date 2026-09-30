import type { Orientation } from "../../core/tarot/types";
import { CardBack, CardFace } from "../../components/CardArt";

/** A card that can flip from its back to its face; reversed cards show their face upside down. */
export function TarotCard({
  cardId,
  orientation = "upright",
  revealed,
  className = "w-24",
  glow = false,
}: {
  cardId: string | null;
  orientation?: Orientation;
  revealed: boolean;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={`${className} aspect-[3/5] [perspective:1100px]`}>
      <div
        className={`relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] [transform-style:preserve-3d] ${
          revealed ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className={`absolute inset-0 rounded-[7%] shadow-[var(--shadow-card)] [backface-visibility:hidden] ${glow ? "ring-1 ring-gold-400/40" : ""}`}>
          <CardBack className="h-full w-full" />
        </div>
        <div className="absolute inset-0 rounded-[7%] shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {cardId && (
            <div className={`h-full w-full ${orientation === "reversed" ? "rotate-180" : ""}`}>
              <CardFace cardId={cardId} className="h-full w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
