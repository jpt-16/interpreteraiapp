import type { Difficulty, ExerciseConfig, Recommendation, ScoreKey, ScoreSet } from "@/lib/types";

const clampDiff = (d: number) => Math.min(5, Math.max(1, d)) as Difficulty;

/**
 * Follow-up exercise recommendations derived from a single evaluation.
 * Longer-term, history-based coaching lives in ./analyze.ts.
 */
export function recommendFromScores(scores: ScoreSet, config: ExerciseConfig): Recommendation[] {
  const recs: Recommendation[] = [];
  const entries = (Object.entries(scores) as [ScoreKey, number | null][])
    .filter(([, v]) => v !== null)
    .sort((a, b) => (a[1] as number) - (b[1] as number));

  const scored = entries.filter(([, v]) => (v as number) < 75);
  for (const [key] of scored.slice(0, 2)) {
    switch (key) {
      case "numbersDates":
        recs.push({
          title: "Numerical retention drill",
          reason: "Figures and dates were lost or changed. Detail-dense passages isolate this skill.",
          config: { type: "info-retention", subject: config.subject, length: "short", difficulty: clampDiff(config.difficulty - 1) },
        });
        break;
      case "completeness":
        recs.push({
          title: "Progressive length: memory retention",
          reason: "Main ideas were omitted. Rebuild endurance with slightly shorter passages, then extend.",
          config: { type: "memory", length: config.length === "long" ? "medium" : "short", difficulty: config.difficulty },
        });
        break;
      case "informationRetention":
        recs.push({
          title: "Information retention set",
          reason: "Specific details (names, terms, figures) were not retained.",
          config: { type: "info-retention", subject: config.subject, difficulty: config.difficulty },
        });
        break;
      case "semanticAccuracy":
        recs.push({
          title: "Slower consecutive with analysis focus",
          reason: "Some meaning was distorted. Work at a lower speed and prioritise sense over form.",
          config: { type: "consecutive", difficulty: clampDiff(config.difficulty - 1), subject: config.subject },
        });
        break;
      case "fidelity":
        recs.push({
          title: "Fidelity focus: consecutive",
          reason: "Information not present in the source appeared in the rendition. Practise strict restraint.",
          config: { type: "consecutive", difficulty: config.difficulty, length: "short" },
        });
        break;
      case "terminology":
        recs.push({
          title: `${config.subject[0].toUpperCase()}${config.subject.slice(1)} terminology in context`,
          reason: "Domain terms were missing or approximated. Prepare a glossary and repeat in the same domain.",
          config: { type: "consecutive", subject: config.subject, difficulty: config.difficulty },
        });
        break;
      case "fluency":
        recs.push({
          title: "Delivery: shorter segments",
          reason: "Hesitations and restarts affected delivery. Short segments let you focus on smooth output.",
          config: { type: config.type === "simultaneous" ? "consecutive" : config.type, length: "short", difficulty: config.difficulty },
        });
        break;
    }
  }

  if (!recs.length) {
    const avg = entries.reduce((a, [, v]) => a + (v as number), 0) / Math.max(1, entries.length);
    recs.push(
      avg >= 85 && config.difficulty < 5
        ? {
            title: "Step up difficulty",
            reason: "Strong across all dimensions. Increase speed and density.",
            config: { ...config, difficulty: clampDiff(config.difficulty + 1) },
          }
        : {
            title: "Extend passage length",
            reason: "Consolidate at this level with longer passages.",
            config: { ...config, length: config.length === "short" ? "medium" : "long" },
          },
    );
  }
  return recs;
}
