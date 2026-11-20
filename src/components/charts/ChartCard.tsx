"use client";
import { Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

export interface TableView {
  columns: string[];
  rows: (string | number | null)[][];
}

/** Card wrapper for charts with an accessible table view toggle. */
export function ChartCard({
  title,
  description,
  table,
  children,
  className,
  legend,
}: {
  title: string;
  description?: string;
  table?: TableView;
  children: ReactNode;
  className?: string;
  legend?: { label: string; color: string }[];
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader
        title={title}
        description={description}
        action={
          table && (
            <button
              onClick={() => setShowTable((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] transition-colors",
                showTable ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink-2",
              )}
              aria-pressed={showTable}
            >
              <Table2 size={13} /> Table
            </button>
          )
        }
      />
      {legend && legend.length > 1 && !showTable && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pt-3">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[12px] text-ink-2">
              <span className="h-[2px] w-3 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex-1 px-3 pb-4 pt-3 sm:px-4">
        {showTable && table ? (
          <div className="max-h-[260px] overflow-auto px-1">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-surface text-muted">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c} className="py-1.5 pr-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular text-ink-2">
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    {r.map((cell, j) => (
                      <td key={j} className="py-1.5 pr-3">
                        {cell ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}
