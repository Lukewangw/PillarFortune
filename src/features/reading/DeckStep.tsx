import { ArrowLeft, ArrowRight, Dices } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CardBack } from "../../components/CardArt";
import { DECK_SIZE } from "../../core/tarot/deck";
import { SHUFFLE_ALGORITHM } from "../../core/tarot/engine";
import { SPREADS, type SpreadId } from "../../core/tarot/spreads";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ShuffleAnimation() {
  return (
    <div className="relative mx-auto h-44 w-28" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0 animate-riffle"
          style={{ zIndex: i, animationDelay: `${i * 12}ms`, "--dir": i % 2 === 0 ? -1 : 1, "--y0": `${-i * 0.8}px` } as React.CSSProperties}
        >
          <CardBack className="h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.7)]" />
        </div>
      ))}
    </div>
  );
}

/** The shuffled deck, face down, fanned on an arc. The user picks one card per spread position. */
export function DeckStep({
  spread,
  seed,
  picks,
  onPick,
  onPickForMe,
  onBack,
  onDone,
}: {
  spread: SpreadId;
  seed: string;
  picks: number[];
  onPick: (slot: number) => void;
  onPickForMe: () => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const positions = SPREADS[spread].positions;
  const [fanned, setFanned] = useState(false);
  const [shuffling, setShuffling] = useState(true);
  const [ref, width] = useWidth<HTMLDivElement>();
  const complete = picks.length >= positions.length;

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const t1 = setTimeout(() => setShuffling(false), reduce ? 0 : 1450);
    const t2 = setTimeout(() => setFanned(true), reduce ? 20 : 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [seed]);

  useEffect(() => {
    if (!complete) return;
    const t = setTimeout(onDone, 750);
    return () => clearTimeout(t);
  }, [complete, onDone]);

  // Arc geometry: card centres sit on a circle of radius R around a pivot below the container.
  const narrow = width < 640;
  const cardW = narrow ? 44 : 64;
  const cardH = cardW * (5 / 3);
  const maxAngle = (36 * Math.PI) / 180;
  const R = Math.max(160, (width - cardW - 24) / (2 * Math.sin(maxAngle)));
  const sagitta = R * (1 - Math.cos(maxAngle));
  const height = cardH + sagitta + 44;
  const pivotY = 30 + R + cardH / 2;
  const lift = narrow ? 14 : 22;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn-ghost !px-3 text-sm">
          <ArrowLeft className="h-4 w-4" /> Question
        </button>
        <p className="font-mono text-[11px] text-mist-500" title={`Deterministic shuffle: ${SHUFFLE_ALGORITHM}`}>
          seed {seed.slice(0, 8)}…{seed.slice(-4)}
        </p>
      </div>

      <div className="mt-6 text-center">
        <p className="eyebrow">{shuffling ? "Shuffling" : complete ? "Your spread is ready" : `Choose ${positions.length - picks.length} more`}</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">
          {shuffling ? "The deck is being shuffled…" : complete ? "Laying out the cards" : "Draw from the deck"}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-mist-400">
          {shuffling
            ? "Your seed fixes the order of all 78 cards, so this exact draw can be replayed and verified later."
            : "Hold your question in mind and choose the cards that call to you. Each pick fills the next position of the spread."}
        </p>
      </div>

      {/* Spread tray */}
      <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-5">
        {positions.map((position, i) => {
          const filled = i < picks.length;
          return (
            <div key={position.id} className="flex w-16 flex-col items-center gap-2 sm:w-20">
              <div className="relative aspect-[3/5] w-full">
                <div className="absolute inset-0 rounded-lg border border-dashed border-gold-400/30 bg-white/[0.02]" />
                {filled && (
                  <div className="absolute inset-0 animate-deal-in">
                    <CardBack className="h-full w-full drop-shadow-[0_8px_14px_rgba(0,0,0,0.6)]" />
                  </div>
                )}
              </div>
              <span className={`text-center text-[11px] uppercase tracking-wider ${filled ? "text-gold-300" : "text-mist-500"}`}>{position.label}</span>
            </div>
          );
        })}
      </div>

      {/* Deck */}
      <div ref={ref} className="relative mt-6 w-full" style={{ height: shuffling ? 200 : height }}>
        {shuffling ? (
          <div className="pt-4">
            <ShuffleAnimation />
          </div>
        ) : (
          Array.from({ length: DECK_SIZE }, (_, slot) => {
            const t = slot / (DECK_SIZE - 1);
            const angle = -maxAngle + 2 * maxAngle * t;
            const cx = width / 2 + R * Math.sin(angle);
            const cy = pivotY - R * Math.cos(angle);
            const picked = picks.includes(slot);
            const deg = (angle * 180) / Math.PI;
            return (
              <button
                key={slot}
                type="button"
                disabled={picked || complete}
                onClick={() => onPick(slot)}
                aria-label={`Card ${slot + 1} of ${DECK_SIZE}, face down`}
                className="group absolute rounded-md outline-offset-2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] disabled:cursor-default"
                style={
                  {
                    left: (fanned ? cx : width / 2) - cardW / 2,
                    top: (fanned ? cy : pivotY - R) - cardH / 2,
                    width: cardW,
                    height: cardH,
                    zIndex: slot,
                    transitionDelay: fanned && !picked ? `${slot * 5}ms` : "0ms",
                    transitionProperty: "left, top, transform, opacity",
                    transform: picked
                      ? `translate(${Math.sin(angle) * lift * 4}px, ${-Math.cos(angle) * lift * 4}px) rotate(${deg}deg) scale(0.9)`
                      : `rotate(${fanned ? deg : 0}deg)`,
                    opacity: picked ? 0 : 1,
                    "--lift": `${-lift}px`,
                  } as React.CSSProperties
                }
              >
                <span className="block h-full w-full transition-transform duration-200 group-enabled:group-hover:[transform:translateY(var(--lift))] group-enabled:group-focus-visible:[transform:translateY(var(--lift))]">
                  <CardBack className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.65)]" />
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-2 flex flex-col items-center gap-3">
        {!shuffling && !complete && (
          <button type="button" onClick={onPickForMe} className="btn-ghost text-sm">
            <Dices className="h-4 w-4" /> Draw for me
          </button>
        )}
        {complete && (
          <button type="button" onClick={onDone} className="btn-primary">
            Reveal the spread <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
