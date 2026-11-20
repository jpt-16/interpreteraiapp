"use client";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { configToParams } from "@/lib/exercises/builder";
import type { ExerciseConfig, Weakness } from "@/lib/types";

const TREND = {
  improving: { icon: ArrowUpRight, label: "Improving", cls: "text-good" },
  stable: { icon: ArrowRight, label: "Stable", cls: "text-muted" },
  worsening: { icon: ArrowDownRight, label: "Worsening", cls: "text-bad" },
};

export function WeaknessList({ weaknesses, base, limit }: { weaknesses: Weakness[]; base: ExerciseConfig; limit?: number }) {
  return (
    <ul className="space-y-3">
      {weaknesses.slice(0, limit).map((w) => {
        const t = TREND[w.trend];
        const cfg = { ...base, ...w.recommendation.config } as ExerciseConfig;
        return (
          <li key={w.key} className="rounded-lg border border-line bg-surface-2/40 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-medium text-ink">{w.label}</span>
                  <Badge tone={w.severity === "high" ? "bad" : w.severity === "medium" ? "warn" : "neutral"}>
                    {w.severity === "high" ? "High priority" : w.severity === "medium" ? "Medium" : "Low"}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{w.description}</p>
                <p className="mt-1 text-[12px] text-faint">{w.evidence}</p>
              </div>
              <span className={`flex shrink-0 items-center gap-1 text-[12px] ${t.cls}`}>
                <t.icon size={13} /> {t.label}
              </span>
            </div>
            <Link
              href={`/exercise?${configToParams(cfg)}`}
              className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-strong hover:underline"
            >
              {w.recommendation.title} <ArrowRight size={13} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
