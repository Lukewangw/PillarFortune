import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Orientation } from "../../core/tarot/types";
import { CARD_ASPECT, CardBack, CardFace } from "../../components/CardArt";

const BURST = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.3;
  const d = i % 2 === 0 ? 78 : 56;
  return { dx: `${Math.cos(a) * d}%`, dy: `${Math.sin(a) * d * 0.62}%`, size: i % 3 === 0 ? 14 : 9, delay: (i % 4) * 40 };
});

/**
 * A card that flips from its back to its face (reversed cards show their face upside
 * down). It tilts toward the pointer with a gold sheen, and turning it over releases a
 * small burst of stars. Tilt is off under reduced motion and for coarse pointers.
 */
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
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number; mx: number; my: number } | null>(null);
  const [burst, setBurst] = useState(0);
  const wasRevealed = useRef(revealed);

  useEffect(() => {
    if (revealed && !wasRevealed.current) setBurst((b) => b + 1);
    wasRevealed.current = revealed;
  }, [revealed]);

  const canTilt = () =>
    typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      ref={ref}
      className={`${className} relative [perspective:1100px]`}
      style={{ aspectRatio: CARD_ASPECT }}
      onPointerMove={(e) => {
        if (!canTilt() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        setTilt({ rx: (0.5 - py) * 16, ry: (px - 0.5) * 18, mx: px * 100, my: py * 100 });
      }}
      onPointerLeave={() => setTilt(null)}
    >
      <div
        className="h-full w-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: tilt ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(8px)` : undefined }}
      >
        <div
          className={`relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] [transform-style:preserve-3d] ${
            revealed ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div
            className={`absolute inset-0 rounded-[5%] transition-shadow duration-300 [backface-visibility:hidden] ${
              glow || tilt ? "shadow-[var(--shadow-lift)]" : "shadow-[var(--shadow-card)]"
            }`}
          >
            <CardBack className="h-full w-full" />
          </div>
          <div
            className={`absolute inset-0 rounded-[5%] transition-shadow duration-300 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              tilt ? "shadow-[var(--shadow-lift)]" : "shadow-[var(--shadow-card)]"
            }`}
          >
            {cardId && (
              <div className={`relative h-full w-full ${orientation === "reversed" ? "rotate-180" : ""}`}>
                <CardFace cardId={cardId} className="h-full w-full" />
              </div>
            )}
          </div>
        </div>
        {tilt && (
          <span
            className="pointer-events-none absolute inset-0 rounded-[5%] mix-blend-screen"
            style={{ background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgb(255 238 196 / 0.38), rgb(255 238 196 / 0.08) 35%, transparent 60%)` }}
            aria-hidden="true"
          />
        )}
      </div>
      {burst > 0 && (
        <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden="true">
          {BURST.map((b, i) => (
            <svg
              key={i}
              viewBox="0 0 10 10"
              className="absolute left-1/2 top-1/2 animate-burst opacity-0"
              style={{ width: b.size, height: b.size, animationDelay: `${120 + b.delay}ms`, "--dx": b.dx, "--dy": b.dy } as CSSProperties}
            >
              <path d="M5 0 L5.9 4.1 L10 5 L5.9 5.9 L5 10 L4.1 5.9 L0 5 L4.1 4.1 Z" fill="#f6e6bb" />
            </svg>
          ))}
        </span>
      )}
    </div>
  );
}
