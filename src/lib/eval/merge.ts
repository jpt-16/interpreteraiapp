import { recommendFromScores } from "@/lib/coach/recommend";
import type { Evaluation, ExerciseConfig, ScoreKey, ScoreSet } from "@/lib/types";

/** Combine per-turn evaluations (dialogue interpreting) into one weighted result. */
export function mergeEvaluations(parts: { evaluation: Evaluation; weight: number; label: string }[], config: ExerciseConfig): Evaluation {
  if (parts.length === 1) return parts[0].evaluation;
  const keys: ScoreKey[] = ["semanticAccuracy", "informationRetention", "completeness", "fidelity", "numbersDates", "terminology", "fluency"];
  const scores = {} as ScoreSet;
  for (const k of keys) {
    let sum = 0;
    let w = 0;
    for (const p of parts) {
      const v = p.evaluation.scores[k];
      if (v === null) continue;
      sum += v * p.weight;
      w += p.weight;
    }
    scores[k] = w ? Math.round(sum / w) : null;
  }
  const totalW = parts.reduce((a, p) => a + p.weight, 0) || 1;
  const overall = Math.round(parts.reduce((a, p) => a + p.evaluation.overallScore * p.weight, 0) / totalW);
  const tag = <T extends object>(label: string, items: T[], field: keyof T) =>
    items.map((it) => ({ ...it, [field]: `${label}: ${String(it[field])}` }));
  const first = parts[0].evaluation;
  const wpms = parts.map((p) => p.evaluation.fluency.wordsPerMinute).filter((v): v is number => v !== null);
  return {
    ...first,
    overallScore: overall,
    scores,
    summary: parts.map((p) => `${p.label}: ${p.evaluation.summary}`).join(" "),
    unitResults: parts.flatMap((p) => p.evaluation.unitResults),
    omissions: parts.flatMap((p) => tag(p.label, p.evaluation.omissions, "content")),
    errors: parts.flatMap((p) => tag(p.label, p.evaluation.errors, "source")),
    additions: parts.flatMap((p) => tag(p.label, p.evaluation.additions, "rendered")),
    acceptableVariations: parts.flatMap((p) => p.evaluation.acceptableVariations),
    fluency: {
      wordsPerMinute: wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : null,
      fillerCount: parts.reduce((a, p) => a + p.evaluation.fluency.fillerCount, 0),
      restarts: parts.reduce((a, p) => a + p.evaluation.fluency.restarts, 0),
      notes: [...new Set(parts.flatMap((p) => p.evaluation.fluency.notes))].slice(0, 6),
    },
    strengths: [...new Set(parts.flatMap((p) => p.evaluation.strengths))].slice(0, 5),
    recommendations: recommendFromScores(scores, config),
    generatedAt: new Date().toISOString(),
  };
}
