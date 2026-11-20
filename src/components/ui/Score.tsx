import { cn } from "./cn";

export function scoreColor(score: number | null | undefined) {
  if (score === null || score === undefined) return "var(--color-faint)";
  if (score >= 85) return "var(--color-good)";
  if (score >= 70) return "var(--color-accent)";
  if (score >= 55) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function ScoreRing({ score, size = 88, stroke = 7, label }: { score: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink" style={{ fontSize: size * 0.28 }}>
          {Math.round(score)}
        </span>
        {label && <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>}
      </div>
    </div>
  );
}

export function ScoreBar({ label, score, hint, className }: { label: string; score: number | null; hint?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink-2" title={hint}>
          {label}
        </span>
        <span className="tabular text-[13px] font-medium text-ink">{score === null ? "—" : score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        {score !== null && (
          <div
            className="h-full rounded-full"
            style={{ width: `${score}%`, background: scoreColor(score), transition: "width 600ms cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        )}
      </div>
    </div>
  );
}
