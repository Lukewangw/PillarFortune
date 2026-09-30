import { useEffect, useRef } from "react";

/**
 * The night sky behind every page:
 *  - a star field in which some stars breathe, one star glints every second or two and a
 *    meteor crosses now and then (all static under prefers-reduced-motion);
 *  - a zodiac wheel in gold line work, like the chart embroidered on a reading cloth,
 *    turning once every twelve minutes;
 *  - a few constellations, a vignette and a faint velvet grain.
 */
export function CelestialBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <StarCanvas />
      <div className="absolute left-1/2 top-[-26vmin] w-[min(1300px,155vmin)] -translate-x-1/2 opacity-[0.16]">
        <ZodiacWheel className="w-full animate-orbit" />
      </div>
      <Constellations />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_45%,rgb(3_5_12_/_0.72)_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ---------- star field ---------- */

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  twinkle: number;
  phase: number;
  color: string;
}
interface Glint {
  x: number;
  y: number;
  size: number;
  start: number;
  life: number;
  tilt: number;
}
interface Meteor {
  x: number;
  y: number;
  dx: number;
  dy: number;
  start: number;
  life: number;
}

function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let glints: Glint[] = [];
    let meteor: Meteor | null = null;
    let nextGlint = 0;
    let nextMeteor = 0;
    let frame = 0;
    let last = 0;
    let w = 0;
    let h = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(520, Math.round((w * h) / 4200));
      stars = Array.from({ length: count }, () => {
        const bright = Math.random() < 0.08;
        const pick = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: bright ? rand(1.0, 1.6) : rand(0.25, 0.95),
          a: bright ? rand(0.7, 1) : rand(0.18, 0.7),
          twinkle: Math.random() < 0.4 ? rand(0.5, 1.6) : 0,
          phase: Math.random() * Math.PI * 2,
          color: pick < 0.74 ? "255 246 224" : pick < 0.9 ? "214 228 255" : "240 220 170",
        };
      });
      if (reduce) draw(0);
    };

    const drawGlint = (g: Glint, t: number) => {
      const p = (t - g.start) / g.life;
      if (p < 0 || p > 1) return;
      const k = Math.sin(Math.PI * p);
      const s = g.size * (0.55 + 0.45 * k);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.tilt);
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.9);
      halo.addColorStop(0, `rgb(255 244 214 / ${0.55 * k})`);
      halo.addColorStop(1, "rgb(255 244 214 / 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
      ctx.fill();
      for (const [len, width, rot] of [
        [s * 2.2, 1.1, 0],
        [s * 2.2, 1.1, Math.PI / 2],
        [s * 1.1, 0.7, Math.PI / 4],
        [s * 1.1, 0.7, -Math.PI / 4],
      ] as const) {
        ctx.save();
        ctx.rotate(rot);
        const grad = ctx.createLinearGradient(-len, 0, len, 0);
        grad.addColorStop(0, "rgb(255 240 200 / 0)");
        grad.addColorStop(0.5, `rgb(255 248 228 / ${0.95 * k})`);
        grad.addColorStop(1, "rgb(255 240 200 / 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };

    const drawMeteor = (m: Meteor, t: number) => {
      const p = (t - m.start) / m.life;
      if (p < 0 || p > 1) return;
      const head = { x: m.x + m.dx * p, y: m.y + m.dy * p };
      const tail = { x: head.x - m.dx * 0.28, y: head.y - m.dy * 0.28 };
      const fade = Math.sin(Math.PI * p);
      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, "rgb(240 220 170 / 0)");
      grad.addColorStop(1, `rgb(255 248 230 / ${0.85 * fade})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const alpha = s.twinkle && !reduce ? s.a * (0.55 + 0.45 * Math.sin(s.phase + (t / 1000) * s.twinkle)) : s.a;
        ctx.fillStyle = `rgb(${s.color} / ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (reduce) return;
      for (const g of glints) drawGlint(g, t);
      if (meteor) drawMeteor(meteor, t);
    };

    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      if (t - last < 33) return; // ~30 fps is plenty for a sky
      last = t;
      if (t >= nextGlint && stars.length) {
        const candidates = stars.filter((s) => s.r > 0.8);
        const s = candidates[Math.floor(Math.random() * candidates.length)] ?? stars[0];
        glints.push({ x: s.x, y: s.y, size: rand(6, 13), start: t, life: rand(900, 1500), tilt: rand(-0.3, 0.3) });
        nextGlint = t + rand(700, 2200);
      }
      glints = glints.filter((g) => t - g.start < g.life);
      if (t >= nextMeteor) {
        if (nextMeteor > 0) {
          const angle = rand(0.35, 0.65);
          const len = rand(220, 360);
          meteor = { x: rand(w * 0.1, w * 0.8), y: rand(0, h * 0.45), dx: Math.cos(angle) * len, dy: Math.sin(angle) * len, start: t, life: rand(700, 1000) };
        }
        nextMeteor = t + rand(14000, 28000);
      }
      if (meteor && t - meteor.start > meteor.life) meteor = null;
      draw(t);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduce) frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduce) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0" />;
}

/* ---------- zodiac wheel ---------- */

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const GOLD = "#d6b370";
const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
};

function ZodiacWheel({ className }: { className?: string }) {
  const ticks = Array.from({ length: 360 }, (_, d) => {
    const inner = d % 10 === 0 ? 452 : d % 5 === 0 ? 460 : 466;
    const [x1, y1] = pt(inner, d);
    const [x2, y2] = pt(474, d);
    return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={d % 10 === 0 ? 1.1 : 0.6} />;
  });
  const hexagram = [0, 60, 120, 180, 240, 300].map((d) => pt(300, d));
  const star12 = Array.from({ length: 12 }, (_, k) => pt(300, k * 150));
  return (
    <svg viewBox="-500 -500 1000 1000" className={className} fill="none" stroke={GOLD}>
      <defs>
        <path id="zodiac-ring" d={`M 0 -${412} A 412 412 0 1 1 -0.01 -${412}`} />
      </defs>
      <circle r="490" strokeWidth="1.4" />
      <circle r="480" strokeWidth="0.6" />
      <circle r="474" strokeWidth="0.8" />
      <g>{ticks}</g>
      <circle r="446" strokeWidth="1" />
      <circle r="380" strokeWidth="1" />
      <circle r="372" strokeWidth="0.5" />
      {Array.from({ length: 12 }, (_, k) => {
        const [x1, y1] = pt(380, k * 30);
        const [x2, y2] = pt(446, k * 30);
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.9" />;
      })}
      <g fill={GOLD} stroke="none" fontFamily="var(--font-display)" fontSize="19" letterSpacing="5">
        {SIGNS.map((sign, k) => (
          <text key={sign} textAnchor="middle" dominantBaseline="middle">
            <textPath href="#zodiac-ring" startOffset={`${((k * 30 + 15) / 360) * 100}%`}>
              {sign.toUpperCase()}
            </textPath>
          </text>
        ))}
      </g>
      {Array.from({ length: 12 }, (_, k) => {
        const [x, y] = pt(340, k * 30 + 15);
        return <path key={k} d={`M${x} ${y - 7} L${x + 1.8} ${y - 1.8} L${x + 7} ${y} L${x + 1.8} ${y + 1.8} L${x} ${y + 7} L${x - 1.8} ${y + 1.8} L${x - 7} ${y} L${x - 1.8} ${y - 1.8} Z`} fill={GOLD} stroke="none" />;
      })}
      <circle r="308" strokeWidth="0.8" />
      <polygon points={hexagram.filter((_, i) => i % 2 === 0).map((p) => p.join(",")).join(" ")} strokeWidth="0.8" />
      <polygon points={hexagram.filter((_, i) => i % 2 === 1).map((p) => p.join(",")).join(" ")} strokeWidth="0.8" />
      <polygon points={star12.map((p) => p.join(",")).join(" ")} strokeWidth="0.4" opacity="0.7" />
      <circle r="150" strokeWidth="0.8" />
      <circle r="142" strokeWidth="0.4" />
      {Array.from({ length: 32 }, (_, k) => {
        const [x1, y1] = pt(58, k * 11.25);
        const [x2, y2] = pt(k % 2 === 0 ? 96 : 78, k * 11.25);
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={k % 2 === 0 ? 1 : 0.6} />;
      })}
      <circle r="50" strokeWidth="1.2" />
      <path d="M 8 -34 A 34 34 0 1 0 8 34 A 20 34 0 1 1 8 -34 Z" fill={GOLD} stroke="none" />
    </svg>
  );
}

/* ---------- constellations ---------- */

const CONSTELLATIONS: Array<{ name: string; left: string; top: string; width: number; points: Array<[number, number]>; lines: Array<[number, number]> }> = [
  // Ursa Major (the Plough)
  {
    name: "Ursa Major",
    left: "3%",
    top: "58%",
    width: 220,
    points: [[10, 60], [48, 48], [84, 52], [112, 70], [120, 104], [168, 108], [176, 72]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  // Cassiopeia
  {
    name: "Cassiopeia",
    left: "82%",
    top: "22%",
    width: 170,
    points: [[10, 40], [44, 70], [78, 44], [112, 76], [148, 30]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  // Orion
  {
    name: "Orion",
    left: "86%",
    top: "66%",
    width: 150,
    points: [[20, 14], [98, 22], [48, 66], [60, 70], [72, 74], [26, 128], [104, 120], [58, 8]],
    lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 7], [7, 1]],
  },
];

function Constellations() {
  return (
    <>
      {CONSTELLATIONS.map((c) => (
        <svg
          key={c.name}
          viewBox="0 0 190 140"
          className="absolute hidden opacity-30 md:block"
          style={{ left: c.left, top: c.top, width: c.width }}
          fill="none"
          stroke={GOLD}
        >
          {c.lines.map(([a, b], i) => (
            <line key={i} x1={c.points[a][0]} y1={c.points[a][1]} x2={c.points[b][0]} y2={c.points[b][1]} strokeWidth="0.6" strokeDasharray="2 3" />
          ))}
          {c.points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.6} fill="#f0dcaa" stroke="none" />
          ))}
        </svg>
      ))}
    </>
  );
}
