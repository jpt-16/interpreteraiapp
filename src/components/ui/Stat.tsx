import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "./cn";

export function Stat({
  label,
  value,
  sub,
  delta,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number | null;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between text-muted">
        <span className="text-[12px] font-medium uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink">{value}</span>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span className={cn("tabular text-[12px] font-medium", delta > 0 ? "text-good" : "text-bad")}>
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-[12px] text-muted">{sub}</div>}
    </Card>
  );
}
