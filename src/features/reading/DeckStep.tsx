import { ArrowRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CARD_ASPECT, CardBack } from "../../components/CardArt";
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
const CARD_SHADOW = "drop-shadow-[0_2px_2px_rgb(0_0_0/0.5)] drop-shadow-[0_10px_12px_rgb(0_0_0/0.45)]";

function ShuffleAnimation() {
  return (
    <div className="relative mx-auto h-[11.5rem] w-[6.4rem]" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0 animate-riffle"
          style={{ zIndex: i, animationDelay: `${i * 12}ms`, "--dir": i % 2 === 0 ? -1 : 1, "--y0": `${-i * 0.8}px` } as React.CSSProperties}
        >
          <CardBack className={`h-full w-full ${CARD_SHADOW}`} />
        </div>
      ))}
    </div>
  );
}

/** The shuffled deck, face down, fanned on an arc. The user picks one card per spread position. */
export function DeckStep({
  spread,
  seed,
  question,
  picks,
  onPick,
  onPickForMe,
  onBack,
  onDone,
}: {
  spread: SpreadId;
  seed: string;
  question: string;
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
  const next = positions[Math.min(picks.length, positions.length - 1)];

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
  const cardW = narrow ? 50 : 64;
  const cardH = cardW * (513 / 286);
  const maxAngle = (36 * Math.PI) / 180;
  const R = Math.max(160, (width - cardW - 24) / (2 * Math.sin(maxAngle)));
  const sagitta = R * (1 - Math.cos(maxAngle));
  const height = cardH + sagitta + 44;
  const pivotY = 30 + R + cardH / 2;
  const lift = narrow ? 14 : 22;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="flex items-baseline justify-between gap-3">
        <button type="button" onClick={onBack} className="label transition-colors hover:!text-star">
          ← Edit the question
        </button>
        <p className="font-mono text-[0.7rem] text-star-3" title={`Deterministic shuffle: ${SHUFFLE_ALGORITHM}`}>
          seed {seed.slice(0, 8)}…{seed.slice(-4)}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl text-center">
        <p className="label">
          {shuffling ? "Shuffling 78 cards" : complete ? "The spread is complete" : `Card ${picks.length + 1} of ${positions.length} · ${next.label}`}
        </p>
        <h2 className="display mt-3 text-[2.1rem] sm:text-[2.7rem]">
          {shuffling ? "Shuffling the deck" : complete ? "Laying out the cards" : picks.length === 0 ? "Choose your cards" : "Choose the next card"}
        </h2>
        <p className="mt-3 text-[1.05rem] italic leading-snug text-star-2">“{question.trim()}”</p>
      </div>

      {/* Spread tray */}
      <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-5">
        {positions.map((position, i) => {
          const filled = i < picks.length;
          const current = i === picks.length && !shuffling;
          return (
            <div key={position.id} className="flex w-[3.75rem] flex-col items-center gap-2 sm:w-[4.5rem]">
              <div className="relative w-full" style={{ aspectRatio: CARD_ASPECT }}>
                <div className={`absolute inset-0 rounded-[5%] border border-dashed transition-colors ${current ? "border-gold" : "border-line-2"}`} />
                {filled && (
                  <div className="absolute inset-0 animate-deal-in">
                    <CardBack className={`h-full w-full ${CARD_SHADOW}`} />
                  </div>
                )}
              </div>
              <span className={`label text-center !text-[0.56rem] !tracking-[0.02em] sm:!text-[0.62rem] sm:!tracking-[0.08em] ${filled || current ? "!text-star" : ""}`}>
                {position.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Deck */}
      <div ref={ref} className="relative mt-4 w-full" style={{ height: shuffling ? 210 : height }}>
        {shuffling ? (
          <div className="pt-6">
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
                className="group absolute rounded-[5%] outline-offset-2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(.2,.7,.2,1)] disabled:cursor-default"
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
                <span className="block h-full w-full transition-transform duration-200 group-enabled:group-hover:[transform:translateY(var(--lift))] group-enabled:group-active:[transform:translateY(var(--lift))] group-enabled:group-focus-visible:[transform:translateY(var(--lift))] group-enabled:group-hover:[filter:drop-shadow(0_0_10px_rgb(240_220_170_/_0.75))]">
                  <CardBack className={`h-full w-full ${CARD_SHADOW}`} />
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-3 flex flex-col items-center gap-3">
        {!shuffling && !complete && (
          <>
            <button type="button" onClick={onPickForMe} className="btn btn-secondary">
              Draw for me
            </button>
            <p className="text-center text-sm text-star-3">Or pick the cards that call to you — each pick fills the next position.</p>
          </>
        )}
        {complete && (
          <button type="button" onClick={onDone} className="btn btn-primary">
            Reveal the spread <ArrowRight className="nudge" />
          </button>
        )}
      </div>
    </section>
  );
}
