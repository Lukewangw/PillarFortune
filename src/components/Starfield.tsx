import { useEffect, useRef } from "react";

/** A quiet, twinkling night sky on a single canvas (static when reduced motion is requested). */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Array<{ x: number; y: number; r: number; phase: number; speed: number; warm: boolean }> = [];
    let frame = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((window.innerWidth * window.innerHeight) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.1 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
        warm: Math.random() < 0.18,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of stars) {
        const alpha = reduce ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(s.phase + (t / 1000) * s.speed));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.warm ? `rgba(243, 227, 184, ${alpha})` : `rgba(226, 222, 255, ${alpha})`;
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (t - last > 50) {
        draw(t);
        last = t;
      }
      frame = requestAnimationFrame(loop);
    };

    resize();
    draw(0);
    if (!reduce) frame = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
