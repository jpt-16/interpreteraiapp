"use client";

interface Item {
  name?: string | number;
  value?: number | string | null | readonly (string | number)[];
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
}

export function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: readonly Item[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-lg border border-line-strong bg-surface-2 px-3 py-2 shadow-xl shadow-black/40">
      {label !== undefined && <div className="mb-1.5 text-[12px] font-medium text-ink">{label}</div>}
      <div className="space-y-1">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p) => (
            <div key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4 text-[12px]">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="tabular font-medium text-ink">
                {String(p.value)}
                {suffix}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
