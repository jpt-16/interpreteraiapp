"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge, SampleBadge, scoreTone } from "@/components/ui/Badge";
import { EXERCISE_TYPES, langPairLabel, SUBJECTS } from "@/lib/exercises/catalog";
import type { PracticeSession } from "@/lib/types";

export function formatDate(iso: string, withTime = false) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function SessionList({ sessions, compact = false }: { sessions: PracticeSession[]; compact?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/analytics/${encodeURIComponent(s.id)}`}
            className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2/60"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13.5px] text-ink">{s.exerciseTitle}</span>
                {s.isSample && <SampleBadge />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <span>{EXERCISE_TYPES[s.config.type].short}</span>
                <span className="text-faint">·</span>
                <span>{langPairLabel(s.config.sourceLang, s.config.targetLang)}</span>
                {!compact && (
                  <>
                    <span className="text-faint">·</span>
                    <span>{SUBJECTS[s.config.subject].label}</span>
                    <span className="text-faint">·</span>
                    <span>Level {s.config.difficulty}</span>
                  </>
                )}
                <span className="text-faint">·</span>
                <span>{formatDate(s.createdAt)}</span>
              </div>
            </div>
            <Badge tone={scoreTone(s.evaluation.overallScore)} className="tabular min-w-[2.25rem] justify-center text-[12px]">
              {s.evaluation.overallScore}
            </Badge>
            <ChevronRight size={15} className="text-faint transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
