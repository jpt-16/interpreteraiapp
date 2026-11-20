"use client";
import { useEffect, useMemo, useRef } from "react";

/**
 * Scrolling live waveform driven by an amplitude source (mic analyser,
 * audio analyser, or synthetic speech activity).
 */
export function LiveWaveform({
  getLevel,
  active,
  color = "#5b8def",
  height = 72,
  bars = 72,
}: {
  getLevel: () => number;
  active: boolean;
  color?: string;
  height?: number;
  bars?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>(Array(bars).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 45) return;
      last = t;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hist = historyRef.current;
      hist.push(active ? getLevel() : 0);
      while (hist.length > bars) hist.shift();
      ctx.clearRect(0, 0, w, h);
      const gap = 3;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);
      hist.forEach((v, i) => {
        const x = i * (bw + gap);
        const bh = Math.max(2, v * (h - 6));
        const y = (h - bh) / 2;
        ctx.globalAlpha = 0.35 + 0.65 * (i / bars);
        ctx.fillStyle = v > 0.01 ? color : "#2b3445";
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, bw / 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getLevel, active, color, bars]);

  return <canvas ref={canvasRef} className="w-full" style={{ height }} aria-hidden />;
}

/**
 * Static "shape" of the passage (one bar per word, height from word length)
 * with playback progress. Gives a sense of passage length and position
 * without revealing any text.
 */
export function PassageWaveform({ text, progress, live, getLevel }: { text: string; progress: number; live: boolean; getLevel: () => number }) {
  const bars = useMemo(() => {
    const words = text.split(/\s+/).filter(Boolean);
    const step = Math.max(1, Math.ceil(words.length / 110));
    const out: number[] = [];
    for (let i = 0; i < words.length; i += step) {
      const chunk = words.slice(i, i + step);
      const len = chunk.reduce((a, w) => a + w.length, 0) / chunk.length;
      const punct = /[.,;:?!]$/.test(chunk[chunk.length - 1]) ? 0.55 : 1;
      out.push(Math.min(1, (0.25 + len / 11) * punct));
    }
    return out;
  }, [text]);
  const pulseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (pulseRef.current) pulseRef.current.style.transform = `scaleY(${live ? 0.4 + getLevel() * 0.9 : 0.4})`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, getLevel]);

  const playedIdx = Math.floor(progress * bars.length);
  return (
    <div className="relative flex h-20 items-center gap-[3px]" aria-label={`Playback ${Math.round(progress * 100)}%`} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
      {bars.map((b, i) => (
        <div
          key={i}
          ref={i === playedIdx && live ? pulseRef : undefined}
          className="flex-1 rounded-full transition-colors duration-200"
          style={{
            height: `${Math.round(b * 100)}%`,
            minWidth: 2,
            background: i < playedIdx ? "var(--color-accent)" : i === playedIdx && live ? "var(--color-accent-strong)" : "var(--color-surface-3)",
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}
