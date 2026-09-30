import { useEffect, useRef } from "react";

/**
 * The night sky behind every page:
 *  - a star field in which some stars breathe, bursts of glints flare at random places, a
 *    meteor crosses now and then and the pointer leaves stardust (static under reduced motion);
 *  - a zodiac wheel in gold line work, like the chart embroidered on a reading cloth,
 *    turning once every six minutes;
 *  - a few constellations and a soft vignette.
 */
export function CelestialBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <StarCanvas />
      <div className="absolute left-1/2 top-[-26vmin] w-[min(1300px,155vmin)] -translate-x-1/2 opacity-50">
        <ZodiacWheel className="w-full animate-orbit" />
      </div>
      <Constellations />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,transparent_40%,rgb(1_2_8_/_0.8)_100%)]" />
    </div>
  );
}

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
  warm: boolean;
}
interface Meteor {
  x: number;
  y: number;
  dx: number;
  dy: number;
  start: number;
  life: number;
}
interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  start: number;
  life: number;
}

/**
 * Stars breathe; every second or two a burst of 2–6 glints flares at random places (a few
 * large); a bright meteor crosses every 6–14 s; and moving the pointer leaves a trail of
 * stardust. Everything is static under prefers-reduced-motion and pauses in hidden tabs.
 */
function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let glints: Glint[] = [];
    let meteors: Meteor[] = [];
    let dust: Dust[] = [];
    let nextBurst = 0;
    let nextMeteor = 0;
    let frame = 0;
    let last = 0;
    let w = 0;
    let h = 0;
    let lastPointer: { x: number; y: number; t: number } | null = null;

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
      const count = Math.min(560, Math.round((w * h) / 3800));
      stars = Array.from({ length: count }, () => {
        const bright = Math.random() < 0.09;
        const pick = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: bright ? rand(0.9, 1.4) : rand(0.25, 0.85),
          a: bright ? rand(0.55, 0.8) : rand(0.15, 0.5),
          twinkle: Math.random() < 0.45 ? rand(0.6, 1.8) : 0,
          phase: Math.random() * Math.PI * 2,
          color: pick < 0.72 ? "255 247 228" : pick < 0.9 ? "210 226 255" : "243 222 168",
        };
      });
      if (reduce) draw(0);
    };

    const flare = (x: number, y: number, size: number, k: number, tilt: number, warm: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.globalCompositeOperation = "lighter";
      const tint = warm ? "255 226 160" : "220 232 255";
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.3);
      halo.addColorStop(0, `rgb(255 250 235 / ${0.45 * k})`);
      halo.addColorStop(0.25, `rgb(${tint} / ${0.18 * k})`);
      halo.addColorStop(1, `rgb(${tint} / 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
      ctx.fill();
      for (const [len, width, rot] of [
        [size * 2.4, 1.1, 0],
        [size * 2.4, 1.1, Math.PI / 2],
        [size * 1.1, 0.6, Math.PI / 4],
        [size * 1.1, 0.6, -Math.PI / 4],
      ] as const) {
        ctx.save();
        ctx.rotate(rot);
        const grad = ctx.createLinearGradient(-len, 0, len, 0);
        grad.addColorStop(0, `rgb(${tint} / 0)`);
        grad.addColorStop(0.5, `rgb(255 250 232 / ${0.6 * k})`);
        grad.addColorStop(1, `rgb(${tint} / 0)`);
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

    const drawGlint = (g: Glint, t: number) => {
      const p = (t - g.start) / g.life;
      if (p < 0 || p > 1) return;
      const k = Math.sin(Math.PI * p) ** 1.5;
      flare(g.x, g.y, g.size * (0.5 + 0.5 * k), k, g.tilt + p * 0.6, g.warm);
    };

    const drawMeteor = (m: Meteor, t: number) => {
      const p = (t - m.start) / m.life;
      if (p < 0 || p > 1) return;
      const head = { x: m.x + m.dx * p, y: m.y + m.dy * p };
      const tail = { x: head.x - m.dx * 0.35, y: head.y - m.dy * 0.35 };
      const fade = Math.min(1, Math.sin(Math.PI * p) * 1.4);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, "rgb(240 220 170 / 0)");
      grad.addColorStop(0.7, `rgb(250 236 200 / ${0.3 * fade})`);
      grad.addColorStop(1, `rgb(255 250 235 / ${0.7 * fade})`);
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      ctx.restore();
      flare(head.x, head.y, 4, fade * 0.7, 0, true);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const alpha = s.twinkle && !reduce ? s.a * (0.5 + 0.5 * Math.sin(s.phase + (t / 1000) * s.twinkle)) : s.a;
        ctx.fillStyle = `rgb(${s.color} / ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (reduce) return;
      for (const d of dust) {
        const p = (t - d.start) / d.life;
        if (p < 0 || p > 1) continue;
        const k = 1 - p;
        flare(d.x + d.vx * p * 40, d.y + d.vy * p * 40, d.size * k, k * 0.45, p * 2, true);
      }
      for (const g of glints) drawGlint(g, t);
      for (const m of meteors) drawMeteor(m, t);
    };

    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      if (t - last < 30) return;
      last = t;
      if (t >= nextBurst) {
        const n = 1 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          const big = Math.random() < 0.1;
          glints.push({
            x: rand(0.02, 0.98) * w,
            y: rand(0.02, 0.95) * h,
            size: big ? rand(11, 15) : rand(5, 9),
            start: t + rand(0, 700),
            life: rand(900, 1600),
            tilt: rand(-0.4, 0.4),
            warm: Math.random() < 0.7,
          });
        }
        nextBurst = t + rand(1200, 3000);
      }
      glints = glints.filter((g) => t - g.start < g.life);
      if (t >= nextMeteor) {
        if (nextMeteor > 0) {
          const angle = rand(0.3, 0.7);
          const len = rand(380, 620);
          const fromLeft = Math.random() < 0.5;
          meteors.push({
            x: fromLeft ? rand(0, w * 0.55) : rand(w * 0.45, w),
            y: rand(-20, h * 0.4),
            dx: Math.cos(angle) * len * (fromLeft ? 1 : -1),
            dy: Math.sin(angle) * len,
            start: t,
            life: rand(800, 1200),
          });
        }
        nextMeteor = t + rand(6000, 14000);
      }
      meteors = meteors.filter((m) => t - m.start < m.life);
      dust = dust.filter((d) => t - d.start < d.life);
      draw(t);
    };

    const onPointer = (e: PointerEvent) => {
      const t = performance.now();
      if (lastPointer && Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) < 14 && t - lastPointer.t < 60) return;
      lastPointer = { x: e.clientX, y: e.clientY, t };
      if (dust.length > 90) dust.shift();
      dust.push({ x: e.clientX + rand(-6, 6), y: e.clientY + rand(-6, 6), vx: rand(-0.4, 0.4), vy: rand(0.2, 0.9), size: rand(1.75, 3.85), start: t, life: rand(700, 1100) });
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduce) frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
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
