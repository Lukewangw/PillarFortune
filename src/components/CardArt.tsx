import type { ReactNode } from "react";
import { getCard } from "../core/tarot/deck";
import type { CardData, Suit } from "../core/tarot/types";

/**
 * An original, procedurally drawn deck in the manner of a printed Marseille deck: black
 * line work on card stock, a numeral cartouche at the top and a title cartouche at the
 * bottom, and one vermilion element per major arcanum as its focal point. Everything is
 * SVG, so the whole deck costs a few kilobytes and has no image-licensing questions.
 */

const INK = "#1b1916";
const ACC = "#b93a26";
const FACE = "#fbf8f2";
const EDGE = "#cdc4b2";
const SERIF = "'Newsreader Variable', Georgia, serif";

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
const RANK_LABEL = ["", "ACE", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "PAGE", "KNIGHT", "QUEEN", "KING"];

/** Shared SVG definitions (the lattice printed on the card backs). Rendered once by the app shell. */
export function CardDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="pf-lattice" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 4.5h9M4.5 0v9" stroke={FACE} strokeOpacity="0.28" strokeWidth="0.55" />
        </pattern>
      </defs>
    </svg>
  );
}

const G = INK;
const A = ACC;

/* ---------- small primitives ---------- */

function rays(n: number, r1: number, r2: number, width = 1, offset = 0, color = G) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i / n) * 360 + offset) * (Math.PI / 180);
    return (
      <line
        key={i}
        x1={Math.cos(a) * r1}
        y1={Math.sin(a) * r1}
        x2={Math.cos(a) * r2}
        y2={Math.sin(a) * r2}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  });
}

function starPath(points: number, outer: number, inner: number, rotate = -90) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((i * 180) / points + rotate) * (Math.PI / 180);
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const Star = ({ x = 0, y = 0, r = 4, points = 8, fill = G }: { x?: number; y?: number; r?: number; points?: number; fill?: string }) => (
  <path d={starPath(points, r, r * 0.42)} transform={`translate(${x} ${y})`} fill={fill} />
);

const Lemniscate = ({ y = 0, s = 1, color = G }: { y?: number; s?: number; color?: string }) => (
  <path
    d="M0 0 C 4 -6, 12 -6, 12 0 C 12 6, 4 6, 0 0 C -4 -6, -12 -6, -12 0 C -12 6, -4 6, 0 0 Z"
    transform={`translate(0 ${y}) scale(${s})`}
    fill="none"
    stroke={color}
    strokeWidth={1.4 / s}
  />
);

/* ---------- suit symbols (drawn in a ~22 x 22 box around 0,0) ---------- */

export function SuitSymbol({ suit, x = 0, y = 0, s = 1 }: { suit: Suit; x?: number; y?: number; s?: number }) {
  const stroke = { stroke: G, strokeWidth: 1.3 / s, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: ReactNode;
  switch (suit) {
    case "wands":
      body = (
        <>
          <path d="M0 -11 V 11" {...stroke} />
          <circle cx="0" cy="-11.5" r="1.6" fill={G} />
          <path d="M0 -5 q 4 -3 5 -7 q -4 1 -5 5" {...stroke} />
          <path d="M0 1 q -4 -3 -5 -7 q 4 1 5 5" {...stroke} />
          <path d="M0 7 q 3.5 -2.5 4.5 -6" {...stroke} />
        </>
      );
      break;
    case "cups":
      body = (
        <>
          <path d="M-7 -9 H 7 Q 7 1 0 3 Q -7 1 -7 -9 Z" {...stroke} />
          <path d="M-5.5 -5.5 H 5.5" {...stroke} strokeOpacity={0.55} />
          <path d="M0 3 V 8 M -5 10 H 5 M -3 8 H 3" {...stroke} />
        </>
      );
      break;
    case "swords":
      body = (
        <>
          <path d="M0 -12 L 2.2 -8 V 4 H -2.2 V -8 Z" {...stroke} />
          <path d="M-6.5 4.5 H 6.5 M 0 4.5 V 9.5" {...stroke} />
          <circle cx="0" cy="11" r="1.4" fill={G} />
        </>
      );
      break;
    case "pentacles":
      body = (
        <>
          <circle r="9" {...stroke} />
          <path d={starPath(5, 7, 2.7)} {...stroke} strokeWidth={1 / s} />
        </>
      );
      break;
  }
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{body}</g>;
}

/* ---------- major arcana emblems (box roughly x ±30, y ±38) ---------- */

const line = { stroke: G, strokeWidth: 1.45, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const thin = { ...line, strokeWidth: 0.9 };
const red = { ...line, stroke: A };

const MAJOR_EMBLEMS: Array<() => ReactNode> = [
  // 0 The Fool — an open circle, a small sun, the edge of a cliff
  () => (
    <>
      <circle r="17" {...line} />
      <g transform="translate(17 -24)">
        <circle r="3.5" fill={A} />
        {rays(8, 5.5, 8.5, 1, 0, A)}
      </g>
      <path d="M-28 30 H 6 L 10 36 M 10 36 L 28 36" {...line} />
      <path d="M-3 -3 l 6 6 M 3 -3 l -6 6" {...thin} />
    </>
  ),
  // I The Magician — lemniscate over a wand, the four suits on the table
  () => (
    <>
      <Lemniscate y={-28} s={1.1} color={A} />
      <path d="M0 -18 V 14" {...line} />
      <circle cx="0" cy="-18" r="1.8" fill={G} />
      <circle cx="0" cy="14" r="1.8" fill={G} />
      <path d="M-28 22 H 28" {...line} />
      <SuitSymbol suit="wands" x={-21} y={31} s={0.42} />
      <SuitSymbol suit="cups" x={-7} y={31} s={0.42} />
      <SuitSymbol suit="swords" x={7} y={31} s={0.42} />
      <SuitSymbol suit="pentacles" x={21} y={31} s={0.42} />
    </>
  ),
  // II The High Priestess — a black and a white pillar, a crescent, a scroll
  () => (
    <>
      <rect x="-26" y="-34" width="8" height="68" rx="1" fill={G} stroke={G} strokeWidth={1.4} />
      <rect x="18" y="-34" width="8" height="68" rx="1" {...line} fill={FACE} />
      <path d="M-6 -24 a 11 11 0 1 0 12 0 a 8.5 8.5 0 1 1 -12 0 Z" fill={A} />
      <rect x="-9" y="6" width="18" height="12" rx="1.5" {...line} />
      <path d="M-5 11 H 5 M -5 14 H 3" {...thin} />
    </>
  ),
  // III The Empress — Venus, crowned with stars
  () => (
    <>
      <circle cy="-6" r="12" {...line} />
      <path d="M0 6 V 32 M -9 21 H 9" {...line} />
      {[-24, -12, 0, 12, 24].map((x, i) => (
        <Star key={x} x={x} y={-31 + Math.abs(i - 2) * 3} r={2.6} points={6} fill={A} />
      ))}
    </>
  ),
  // IV The Emperor — orb and cross over a throne, ram-horn spirals
  () => (
    <>
      <rect x="-17" y="-6" width="34" height="36" rx="1" {...line} />
      <path d="M-17 4 H 17" {...thin} />
      <circle cy="-17" r="6" {...red} />
      <path d="M0 -23 V -32 M -4 -28.5 H 4" {...red} />
      <path d="M-17 -6 c -8 0 -10 -9 -4 -11 c 4 -1 5 3 2 4" {...line} />
      <path d="M17 -6 c 8 0 10 -9 4 -11 c -4 -1 -5 3 -2 4" {...line} />
    </>
  ),
  // V The Hierophant — triple cross over crossed keys
  () => (
    <>
      <path d="M0 -34 V 14 M -12 -24 H 12 M -9 -15 H 9 M -6 -6 H 6" {...red} />
      <g transform="translate(0 24) rotate(35)">
        <path d="M0 -14 V 12 M 0 10 h 4 M 0 6 h 3" {...line} />
        <circle cy="-16" r="3" {...line} />
      </g>
      <g transform="translate(0 24) rotate(-35)">
        <path d="M0 -14 V 12 M 0 10 h -4 M 0 6 h -3" {...line} />
        <circle cy="-16" r="3" {...line} />
      </g>
    </>
  ),
  // VI The Lovers — two circles joined beneath a sun
  () => (
    <>
      <path d="M0 -0.5 a 14 14 0 0 1 0 21 a 14 14 0 0 1 0 -21" fill={A} />
      <circle cx="-8" cy="10" r="14" {...line} />
      <circle cx="8" cy="10" r="14" {...line} />
      <g transform="translate(0 -24)">
        <circle r="4.5" fill={G} />
        {rays(12, 7, 11, 1)}
      </g>
    </>
  ),
  // VII The Chariot — a starred canopy over a car and two wheels
  () => (
    <>
      <path d="M-24 -16 Q 0 -30 24 -16" {...line} />
      {[-16, -6, 4, 14].map((x) => (
        <Star key={x} x={x} y={-19 - (x > -10 && x < 10 ? 4 : 1)} r={1.8} points={6} />
      ))}
      <rect x="-16" y="-10" width="32" height="26" rx="1" {...line} />
      <Star y={3} r={7} points={8} fill={A} />
      <circle cx="-17" cy="24" r="8" {...line} />
      <circle cx="17" cy="24" r="8" {...line} />
      {[-17, 17].map((cx) => (
        <g key={cx} transform={`translate(${cx} 24)`}>
          {rays(6, 0, 8, 0.8)}
        </g>
      ))}
    </>
  ),
  // VIII Strength — lemniscate above a radiant mane
  () => (
    <>
      <Lemniscate y={-28} s={1} color={A} />
      <circle cy="8" r="11" {...line} />
      <g transform="translate(0 8)">{rays(16, 14, 21, 1.1)}</g>
      <path d="M-4 6 h 0.1 M 4 6 h 0.1" stroke={G} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M-4 12 q 4 3 8 0" {...thin} />
    </>
  ),
  // IX The Hermit — a lantern holding a six-pointed star, on a staff
  () => (
    <>
      <path d="M-18 -34 V 36" {...line} />
      <path d="M-18 -22 H -4" {...thin} />
      <path d="M-4 -24 v 4 M -10 -20 h 20 l -3 30 h -14 Z" {...line} />
      <path d={starPath(6, 7, 3.6)} transform="translate(0 -5)" fill={A} />
      <path d="M-7 14 h 14" {...line} />
    </>
  ),
  // X Wheel of Fortune — eight spokes, hub and rim
  () => (
    <>
      <circle r="26" {...line} />
      <circle r="20" {...thin} />
      {rays(8, 6, 20, 1.2)}
      <circle r="5.5" fill={A} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        return <circle key={i} cx={Math.cos(a) * 23} cy={Math.sin(a) * 23} r="1.4" fill={G} />;
      })}
    </>
  ),
  // XI Justice — balanced scales
  () => (
    <>
      <path d="M0 -30 V 30 M -12 30 H 12 M -24 -18 H 24" {...line} />
      <circle cy="-32" r="2.8" fill={A} />
      <path d="M-24 -18 L -32 6 M -24 -18 L -16 6 M 24 -18 L 16 6 M 24 -18 L 32 6" {...thin} />
      <path d="M-33 6 Q -24 16 -15 6 Z" {...line} />
      <path d="M15 6 Q 24 16 33 6 Z" {...line} />
    </>
  ),
  // XII The Hanged Man — a tau cross, an inverted triangle, a halo
  () => (
    <>
      <path d="M-24 -30 H 24 M 0 -30 V -18" {...line} />
      <path d="M-12 -18 H 12 L 0 6 Z" {...line} />
      <circle cy="18" r="9" {...line} />
      <g transform="translate(0 18)">{rays(12, 11.5, 15.5, 1, 0, A)}</g>
    </>
  ),
  // XIII Death — a five-petalled rose over a rising sun
  () => (
    <>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        return <circle key={i} cx={Math.cos(a) * 8} cy={-8 + Math.sin(a) * 8} r="8" {...line} />;
      })}
      <circle cy="-8" r="4.2" fill={A} />
      <path d="M-28 30 H 28" {...line} />
      <path d="M-12 30 a 12 12 0 0 1 24 0" {...line} />
      <g transform="translate(0 30)">{rays(7, 15, 20, 0.9, 180)}</g>
    </>
  ),
  // XIV Temperance — water flowing between two cups
  () => (
    <>
      <SuitSymbol suit="cups" x={-15} y={-14} s={1.1} />
      <SuitSymbol suit="cups" x={15} y={16} s={1.1} />
      <path d="M-9 -22 C 10 -34, 20 -6, 14 4" {...red} strokeDasharray="2 2.5" />
      <path d={starPath(4, 5, 1.6, 0)} transform="translate(-14 26)" fill={G} />
      <path d="M-26 34 H 26" {...thin} />
    </>
  ),
  // XV The Devil — horns over a chain of three links
  () => (
    <>
      <path d="M-14 -34 Q -14 -20 0 -20 Q 14 -20 14 -34" {...line} />
      <circle cy="-15.5" r="3.2" fill={A} />
      <ellipse cy="-2" rx="7" ry="10" {...line} />
      <ellipse cy="14" rx="7" ry="10" {...line} />
      <ellipse cy="30" rx="7" ry="10" {...line} />
    </>
  ),
  // XVI The Tower — a struck tower and a falling crown
  () => (
    <>
      <path d="M-12 36 V -18 H -14 V -26 H -8 V -21 H -3 V -26 H 3 V -21 H 8 V -26 H 14 V -18 H 12 V 36 Z" {...line} />
      <rect x="-3" y="-6" width="6" height="10" rx="3" {...thin} />
      <path d="M-4 16 h 8" {...thin} />
      <path d="M28 -36 L 14 -16 H 22 L 8 4" {...red} strokeWidth={1.7} />
      <path d="M-26 -8 l -3 -6 l 4 2 l 2 -5 l 2 5 l 4 -2 l -3 6 Z" transform="rotate(-25 -24 -10)" fill={G} />
    </>
  ),
  // XVII The Star — a great star, seven small ones, water
  () => (
    <>
      <Star y={-8} r={16} points={8} fill={A} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * 2 * Math.PI - Math.PI / 2;
        return <Star key={i} x={Math.cos(a) * 26} y={-8 + Math.sin(a) * 24} r={3} points={8} />;
      })}
      <path d="M-26 30 q 6 -4 13 0 t 13 0 t 13 0 t 13 0" {...thin} />
      <path d="M-20 35 q 6 -4 13 0 t 13 0 t 13 0" {...thin} />
    </>
  ),
  // XVIII The Moon — a crescent, falling drops, a path between towers
  () => (
    <>
      <path d="M-4 -34 a 18 18 0 1 0 14 30 a 14 14 0 1 1 -14 -30 Z" fill={G} />
      {[-18, -8, 4, 16].map((x, i) => (
        <path key={x} d={`M${x} ${2 + (i % 2) * 5} q 2 4 0 6 q -2 -2 0 -6`} fill={A} />
      ))}
      <path d="M-26 36 V 20 h 6 v 16 M 20 36 V 20 h 6 v 16" {...line} />
      <path d="M-4 36 q 4 -8 0 -16 q -3 -5 2 -8" {...thin} />
    </>
  ),
  // XIX The Sun — a radiant disc
  () => (
    <>
      <circle r="13" fill={A} />
      {rays(16, 17, 29, 1.4)}
      {rays(16, 17, 23, 1, 11.25)}
    </>
  ),
  // XX Judgement — a horn sounding over a rising disc
  () => (
    <>
      <path d="M-24 -26 L 8 -6 L 12 -14 Q 4 -22 -24 -30 Z" {...line} />
      <path d="M14 -18 a 10 10 0 0 1 4 14 M 18 -24 a 17 17 0 0 1 7 22" {...thin} />
      <path d="M-4 -17 V -9 M -8 -13 H 0" {...thin} />
      <path d="M-26 34 H 26" {...line} />
      <path d="M-14 34 a 14 14 0 0 1 28 0" fill={A} />
      <g transform="translate(0 34)">{rays(9, 17, 22, 0.9, 180)}</g>
    </>
  ),
  // XXI The World — a laurel wreath around a star
  () => (
    <>
      <ellipse rx="18" ry="30" {...thin} />
      {Array.from({ length: 14 }, (_, i) => {
        const t = (i / 14) * 2 * Math.PI;
        const x = Math.cos(t) * 18;
        const y = Math.sin(t) * 30;
        return <ellipse key={i} cx={x} cy={y} rx="2" ry="4" transform={`rotate(${(t * 180) / Math.PI + 90} ${x} ${y})`} fill={G} />;
      })}
      <Star r={8} points={8} fill={A} />
      <path d="M-4 -30 l 4 -4 l 4 4 l -4 4 Z M -4 30 l 4 -4 l 4 4 l -4 4 Z" fill={G} />
    </>
  ),
];

/* ---------- minor arcana ---------- */

const PIPS: Record<number, Array<[number, number]>> = {
  2: [[0, -20], [0, 20]],
  3: [[0, -26], [0, 0], [0, 26]],
  4: [[-13, -17], [13, -17], [-13, 17], [13, 17]],
  5: [[-13, -20], [13, -20], [0, 0], [-13, 20], [13, 20]],
  6: [[-13, -24], [13, -24], [-13, 0], [13, 0], [-13, 24], [13, 24]],
  7: [[-13, -26], [13, -26], [0, -13], [-13, 0], [13, 0], [-13, 26], [13, 26]],
  8: [[-13, -30], [13, -30], [-13, -10], [13, -10], [-13, 10], [13, 10], [-13, 30], [13, 30]],
  9: [[-13, -30], [13, -30], [-13, -10], [13, -10], [0, 0], [-13, 10], [13, 10], [-13, 30], [13, 30]],
  10: [[-14, -32], [14, -32], [0, -21], [-14, -11], [14, -11], [-14, 11], [14, 11], [0, 21], [-14, 32], [14, 32]],
};

function Court({ rank, suit }: { rank: number; suit: Suit }) {
  let crest: ReactNode;
  if (rank === 11) crest = <Star y={-24} r={7} points={4} />;
  if (rank === 12)
    crest = (
      <g transform="translate(0 -23)">
        <path d="M7 10 H -7 L -5.5 5 Q -8 2 -10 -2.5 L -8.5 -5.5 Q -5 -7.5 -2.5 -7.5 L -1.5 -12 L 1 -8.5 Q 7.5 -6 8 1.5 Q 8 6 7 10 Z" {...line} />
        <circle cx="-4.2" cy="-4" r="0.9" fill={G} />
        <path d="M2.5 -6 Q 5.5 -2 5 4" {...thin} />
      </g>
    );
  if (rank === 13)
    crest = (
      <g transform="translate(0 -22)">
        <path d="M-12 6 L -12 -4 L -6 2 L 0 -8 L 6 2 L 12 -4 L 12 6 Z" {...line} />
        {[-12, 0, 12].map((x) => (
          <circle key={x} cx={x} cy={x === 0 ? -10 : -6} r="1.8" fill={G} />
        ))}
      </g>
    );
  if (rank === 14)
    crest = (
      <g transform="translate(0 -21)">
        <path d="M-13 6 L -13 -6 L -7 1 L -3 -8 L 0 -3 L 3 -8 L 7 1 L 13 -6 L 13 6 Z" {...line} />
        <path d="M0 -10 V -18 M -3.5 -14.5 H 3.5" {...line} />
      </g>
    );
  return (
    <>
      {crest}
      <circle cy="12" r="20" {...thin} strokeOpacity={0.5} />
      <SuitSymbol suit={suit} y={12} s={1.7} />
    </>
  );
}

function MinorEmblem({ card }: { card: CardData }) {
  const suit = card.suit!;
  if (card.number === 1) {
    return (
      <>
        {rays(24, 24, 30, 0.8, 0, A)}
        <SuitSymbol suit={suit} s={2.3} />
      </>
    );
  }
  if (card.number >= 11) return <Court rank={card.number} suit={suit} />;
  const scale = card.number <= 4 ? 1.3 : card.number <= 7 ? 1.05 : 0.88;
  return (
    <>
      {PIPS[card.number].map(([x, y], i) => (
        <SuitSymbol key={i} suit={suit} x={x} y={y} s={scale} />
      ))}
    </>
  );
}

/* ---------- full card ---------- */

function CardStock({ children }: { children: ReactNode }) {
  return (
    <>
      <rect x="0.5" y="0.5" width="119" height="199" rx="6" fill={FACE} stroke={EDGE} strokeWidth="1" />
      {children}
    </>
  );
}

export function CardFace({ cardId, className }: { cardId: string; className?: string }) {
  const card = getCard(cardId);
  const top = card.arcana === "major" ? ROMAN[card.number] : RANK_LABEL[card.number];
  const title = (card.arcana === "major" ? card.name.replace(/^The /, "") : card.name).toUpperCase();
  const Emblem = card.arcana === "major" ? MAJOR_EMBLEMS[card.number] : null;
  return (
    <svg viewBox="0 0 120 200" className={className} role="img" aria-label={card.name}>
      <CardStock>
        <rect x="7" y="7" width="106" height="186" fill="none" stroke={INK} strokeWidth="1" />
        <path d="M7 33 H 113 M 7 167 H 113" stroke={INK} strokeWidth="0.8" />
        <text x="60" y="24.5" textAnchor="middle" fill={INK} fontSize="10.5" letterSpacing="1.6" fontFamily={SERIF} fontWeight="500">
          {top}
        </text>
        <g transform={`translate(60 100) scale(${Emblem ? 1.22 : 1.12})`}>{Emblem ? <Emblem /> : <MinorEmblem card={card} />}</g>
        <text
          x="60"
          y="183.5"
          textAnchor="middle"
          fill={INK}
          fontSize={title.length > 17 ? 6.3 : title.length > 13 ? 7.4 : 8.6}
          letterSpacing={title.length > 17 ? 0.35 : title.length > 13 ? 0.7 : 1.3}
          fontFamily={SERIF}
          fontWeight="500"
        >
          {title}
        </text>
      </CardStock>
    </svg>
  );
}

export function CardBack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 200" className={className} aria-hidden="true">
      <CardStock>
        <rect x="7" y="7" width="106" height="186" rx="1.5" fill={ACC} />
        <rect x="7" y="7" width="106" height="186" rx="1.5" fill="url(#pf-lattice)" />
        <rect x="11" y="11" width="98" height="178" fill="none" stroke={FACE} strokeOpacity="0.75" strokeWidth="0.7" />
        <g transform="translate(60 100)">
          <circle r="25" fill={ACC} stroke={FACE} strokeWidth="1.1" />
          <circle r="20" fill="none" stroke={FACE} strokeOpacity="0.6" strokeWidth="0.6" />
          <path d={starPath(8, 17, 6.8)} fill="none" stroke={FACE} strokeWidth="1.1" strokeLinejoin="round" />
          <circle r="2.6" fill={FACE} />
        </g>
        <path d="M60 20 l 3 5 l -3 5 l -3 -5 Z M 60 170 l 3 5 l -3 5 l -3 -5 Z" fill={FACE} />
      </CardStock>
    </svg>
  );
}
