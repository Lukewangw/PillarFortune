import { getCard } from "../core/tarot/deck";

/**
 * The deck: card faces are Pamela Colman Smith's illustrations for the 1909
 * Rider–Waite–Smith tarot (public domain; see public/cards/CREDITS.txt), set in a gold
 * foil border with a slightly antique finish. The back is an original gold-on-midnight
 * celestial design, rendered once to an SVG data URL and shared by all 78 cards.
 */

/** Width / height of a card (the scans are 286 × 513). */
export const CARD_ASPECT = "286 / 513";

export const cardImageUrl = (cardId: string) => `${import.meta.env.BASE_URL}cards/${cardId}.webp`;

/** Warm the browser cache for cards that are about to be turned over. */
export function preloadCards(cardIds: string[]) {
  for (const id of cardIds) {
    const img = new Image();
    img.decoding = "async";
    img.src = cardImageUrl(id);
  }
}

export function CardFace({ cardId, className = "" }: { cardId: string; className?: string }) {
  const card = getCard(cardId);
  return (
    <div
      className={`${className} relative overflow-hidden rounded-[5%] bg-[linear-gradient(145deg,#8f6d31_0%,#e9d39b_28%,#c9a45c_52%,#f3e2b3_74%,#a8843f_100%)] p-[3.4%]`}
      role="img"
      aria-label={card.name}
    >
      <img
        src={cardImageUrl(cardId)}
        alt=""
        width={286}
        height={513}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full rounded-[3%] object-cover [filter:sepia(0.16)_saturate(0.92)_contrast(1.03)_brightness(0.97)]"
      />
      <span className="pointer-events-none absolute inset-[3.4%] rounded-[3%] shadow-[inset_0_0_14px_rgb(58_36_8_/_0.45)]" aria-hidden="true" />
    </div>
  );
}

/* ---------- card back: an SVG built once ---------- */

const W = 286;
const H = 513;
const CX = W / 2;
const CY = H / 2;
const GOLD = "#d6b370";
const f = (n: number) => n.toFixed(2);

function star4(x: number, y: number, r: number, fill = GOLD, opacity = 1) {
  const i = r * 0.22;
  return `<path d="M${f(x)} ${f(y - r)} L${f(x + i)} ${f(y - i)} L${f(x + r)} ${f(y)} L${f(x + i)} ${f(y + i)} L${f(x)} ${f(y + r)} L${f(x - i)} ${f(y + i)} L${f(x - r)} ${f(y)} L${f(x - i)} ${f(y - i)} Z" fill="${fill}" opacity="${opacity}"/>`;
}

function star8(x: number, y: number, r: number) {
  const pts: string[] = [];
  for (let k = 0; k < 16; k++) {
    const rr = k % 2 === 0 ? r : r * 0.42;
    const a = (k * Math.PI) / 8 - Math.PI / 2;
    pts.push(`${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`);
  }
  return `<path d="M${pts.join(" L")} Z" fill="${GOLD}"/>`;
}

/** A lunar phase glyph: 0 new … 0.5 full … 1 new (waxing lights the right side). */
function moon(x: number, y: number, r: number, phase: number) {
  const outline = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.8"/>`;
  if (Math.abs(phase - 0.5) < 1e-6) return outline + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${GOLD}"/>`;
  const waxing = phase < 0.5;
  const lit = waxing ? phase * 2 : (1 - phase) * 2; // 0 → 1 toward full
  const sweepOuter = waxing ? 1 : 0;
  const rx = Math.abs(1 - 2 * lit) * r;
  const sweepInner = lit > 0.5 ? sweepOuter : 1 - sweepOuter;
  const d = `M${f(x)} ${f(y - r)} A${f(r)} ${f(r)} 0 0 ${sweepOuter} ${f(x)} ${f(y + r)} A${f(rx)} ${f(r)} 0 0 ${sweepInner} ${f(x)} ${f(y - r)} Z`;
  return outline + `<path d="${d}" fill="${GOLD}"/>`;
}

function cardBackSvg(): string {
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">`);
  parts.push(`<defs>
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8f6d31"/><stop offset="0.3" stop-color="#e9d39b"/><stop offset="0.55" stop-color="#c9a45c"/><stop offset="0.78" stop-color="#f3e2b3"/><stop offset="1" stop-color="#a8843f"/>
    </linearGradient>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#18264a"/><stop offset="0.55" stop-color="#0f1832"/><stop offset="1" stop-color="#0a1024"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${GOLD}" stop-opacity="0.22"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
  </defs>`);
  // Gold foil border and the midnight field
  parts.push(`<rect width="${W}" height="${H}" rx="14" fill="url(#foil)"/>`);
  parts.push(`<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="9" fill="url(#field)"/>`);
  parts.push(`<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="5" fill="none" stroke="${GOLD}" stroke-width="1.1" opacity="0.8"/>`);
  parts.push(`<rect x="21" y="21" width="${W - 42}" height="${H - 42}" rx="3" fill="none" stroke="${GOLD}" stroke-width="0.5" opacity="0.45"/>`);

  // Corner ornaments: a quarter arc and a four-pointed star
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const x0 = sx > 0 ? 21 : W - 21;
    const y0 = sy > 0 ? 21 : H - 21;
    const r = 30;
    const sweep = sx * sy > 0 ? 0 : 1;
    parts.push(
      `<path d="M${f(x0)} ${f(y0 + sy * r)} A${r} ${r} 0 0 ${sweep} ${f(x0 + sx * r)} ${f(y0)}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.7"/>`,
    );
    parts.push(star4(x0 + sx * 11, y0 + sy * 11, 7));
  }

  // A sparse, symmetric star field
  const field: Array<[number, number, number, number]> = [
    [52, 150, 2.2, 0.8], [230, 132, 1.6, 0.7], [70, 210, 1.1, 0.6], [212, 214, 2.6, 0.9], [44, 300, 1.4, 0.6],
    [244, 318, 1.8, 0.75], [64, 372, 2.4, 0.85], [226, 390, 1.2, 0.6], [100, 452, 1.3, 0.55], [190, 58, 1.3, 0.55],
    [98, 64, 1.8, 0.7], [252, 452, 1.5, 0.6], [34, 458, 1.2, 0.5], [256, 60, 1.0, 0.5],
  ];
  for (const [x, y, r, o] of field) parts.push(star4(x, y, r * 2.4, GOLD, o));
  // Two faint constellations
  const constellations = [
    [[40, 236], [58, 252], [48, 276], [70, 290], [62, 318]],
    [[222, 256], [246, 240], [262, 262], [240, 284]],
  ];
  for (const c of constellations) {
    parts.push(`<polyline points="${c.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${GOLD}" stroke-width="0.5" opacity="0.4"/>`);
    for (const [x, y] of c) parts.push(`<circle cx="${x}" cy="${y}" r="1.3" fill="${GOLD}" opacity="0.75"/>`);
  }

  // Central medallion: rays, rings, a crescent cradling a star
  parts.push(`<circle cx="${CX}" cy="${CY}" r="96" fill="url(#halo)"/>`);
  for (let k = 0; k < 48; k++) {
    const a = (k * Math.PI * 2) / 48;
    const long = k % 2 === 0;
    const r1 = 60;
    const r2 = long ? 86 : 72;
    parts.push(
      `<line x1="${f(CX + Math.cos(a) * r1)}" y1="${f(CY + Math.sin(a) * r1)}" x2="${f(CX + Math.cos(a) * r2)}" y2="${f(CY + Math.sin(a) * r2)}" stroke="${GOLD}" stroke-width="${long ? 1.2 : 0.7}" stroke-linecap="round" opacity="${long ? 0.95 : 0.6}"/>`,
    );
  }
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI * 2) / 24 + Math.PI / 24;
    parts.push(`<circle cx="${f(CX + Math.cos(a) * 100)}" cy="${f(CY + Math.sin(a) * 100)}" r="1.4" fill="${GOLD}" opacity="0.8"/>`);
  }
  parts.push(`<circle cx="${CX}" cy="${CY}" r="56" fill="#0e1731" stroke="${GOLD}" stroke-width="1.6"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="50" fill="none" stroke="${GOLD}" stroke-width="0.6" opacity="0.7"/>`);
  // Crescent: an outer arc and an inner arc offset to the right
  const R = 32;
  parts.push(
    `<path d="M${f(CX + 6)} ${f(CY - R)} A${R} ${R} 0 0 0 ${f(CX + 6)} ${f(CY + R)} A${f(R * 0.56)} ${R} 0 0 1 ${f(CX + 6)} ${f(CY - R)} Z" fill="${GOLD}"/>`,
  );
  parts.push(star8(CX + 10, CY, 10));

  // Moon phases above and below the medallion, and small diamonds on the axis
  const phases = [0.1, 0.25, 0.5, 0.75, 0.9];
  phases.forEach((p, i) => {
    const x = CX + (i - 2) * 30;
    parts.push(moon(x, 124, 8.5, p));
    parts.push(moon(x, H - 124, 8.5, 1 - p));
  });
  for (const y of [78, H - 78]) {
    parts.push(`<path d="M${CX} ${y - 7} L${CX + 4} ${y} L${CX} ${y + 7} L${CX - 4} ${y} Z" fill="${GOLD}"/>`);
    parts.push(`<line x1="${CX - 52}" y1="${y}" x2="${CX - 10}" y2="${y}" stroke="${GOLD}" stroke-width="0.7" opacity="0.7"/>`);
    parts.push(`<line x1="${CX + 10}" y1="${y}" x2="${CX + 52}" y2="${y}" stroke="${GOLD}" stroke-width="0.7" opacity="0.7"/>`);
  }
  parts.push(`</svg>`);
  return parts.join("");
}

const CARD_BACK_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cardBackSvg())}`;

export function CardBack({ className = "" }: { className?: string }) {
  return <img src={CARD_BACK_URL} alt="" aria-hidden="true" draggable={false} className={`${className} select-none`} />;
}
