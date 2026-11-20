import { EXERCISE_TYPES, SUBJECTS } from "@/lib/exercises/catalog";
import type { ExerciseType, PracticeSession, ScoreKey, Subject } from "@/lib/types";

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function metricMean(sessions: PracticeSession[], key: ScoreKey | "overall") {
  return mean(
    sessions
      .map((s) => (key === "overall" ? s.evaluation.overallScore : s.evaluation.scores[key]))
      .filter((v): v is number => typeof v === "number"),
  );
}

export function totals(sessions: PracticeSession[]) {
  const seconds = sessions.reduce((a, s) => a + (s.durationSec ?? 0), 0);
  return { count: sessions.length, seconds };
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** One point per day: mean of each metric over that day's sessions. */
export function dailySeries(sessions: PracticeSession[], keys: (ScoreKey | "overall")[]) {
  const byDay = new Map<string, PracticeSession[]>();
  for (const s of sessions) {
    const day = s.createdAt.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, ss]) => {
      const row: Record<string, string | number | null> = { day, label: formatDay(day), sessions: ss.length };
      for (const k of keys) row[k] = metricMean(ss, k);
      return row;
    });
}

function formatDay(day: string) {
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function byExerciseType(sessions: PracticeSession[]) {
  const types = Object.keys(EXERCISE_TYPES) as ExerciseType[];
  return types
    .map((t) => {
      const ss = sessions.filter((s) => s.config.type === t);
      return {
        key: t,
        label: EXERCISE_TYPES[t].short,
        sessions: ss.length,
        overall: metricMean(ss, "overall"),
        accuracy: metricMean(ss, "semanticAccuracy"),
        completeness: metricMean(ss, "completeness"),
      };
    })
    .filter((r) => r.sessions > 0);
}

export function bySubject(sessions: PracticeSession[]) {
  return (Object.keys(SUBJECTS) as Subject[])
    .map((sub) => {
      const ss = sessions.filter((s) => s.config.subject === sub);
      return {
        key: sub,
        label: SUBJECTS[sub].label,
        sessions: ss.length,
        overall: metricMean(ss, "overall"),
        terminology: metricMean(ss, "terminology"),
      };
    })
    .filter((r) => r.sessions > 0);
}

/** Change of a metric between the earlier and later half of a period. */
export function delta(sessions: PracticeSession[], key: ScoreKey | "overall") {
  const chrono = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (chrono.length < 4) return null;
  const half = Math.floor(chrono.length / 2);
  const a = metricMean(chrono.slice(0, half), key);
  const b = metricMean(chrono.slice(half), key);
  return a === null || b === null ? null : b - a;
}
