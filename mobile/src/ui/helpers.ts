import { router } from "expo-router";
import { configToRecord } from "@/lib/exercises/builder";
import type { ExerciseConfig } from "@/lib/types";

export function startExercise(config: ExerciseConfig) {
  router.push({ pathname: "/exercise", params: configToRecord(config) });
}

export function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
