import { buildExercise } from "@/lib/exercises/builder";
import { seededRng } from "@/lib/exercises/generator";
import { evaluateHeuristic } from "@/lib/eval/heuristic";
import type { AudioLength, Difficulty, ExerciseConfig, ExerciseType, Lang, PracticeSession, Subject } from "@/lib/types";

/**
 * Deterministic SAMPLE history so a new user can see what the dashboard,
 * analytics and coach look like. Sample sessions are flagged `isSample`,
 * labelled in the UI, never written to the database, and can be hidden.
 *
 * Renditions are simulated from the target-language version of each passage
 * with realistic, length-dependent omissions and number slips, then scored by
 * the same heuristic evaluator the app uses in demo mode.
 */

const PLAN: { type: ExerciseType; subject: Subject; length: AudioLength; difficulty: Difficulty }[] = [
  { type: "consecutive", subject: "medical", length: "short", difficulty: 2 },
  { type: "memory", subject: "community", length: "short", difficulty: 1 },
  { type: "consecutive", subject: "business", length: "medium", difficulty: 3 },
  { type: "info-retention", subject: "legal", length: "short", difficulty: 2 },
  { type: "consecutive", subject: "legal", length: "medium", difficulty: 3 },
  { type: "memory", subject: "technical", length: "medium", difficulty: 3 },
  { type: "consecutive", subject: "medical", length: "long", difficulty: 4 },
  { type: "simultaneous", subject: "conference", length: "medium", difficulty: 3 },
  { type: "info-retention", subject: "business", length: "medium", difficulty: 3 },
  { type: "consecutive", subject: "technical", length: "medium", difficulty: 3 },
];

function simulateRendition(segments: string[], rng: () => number, dropBase: number, numberSlip: number) {
  const out: string[] = [];
  segments.forEach((seg, i) => {
    const fatigue = i / Math.max(1, segments.length - 1); // later segments are lost more often
    if (rng() < dropBase + fatigue * dropBase * 1.6) return;
    let s = seg;
    if (rng() < numberSlip * (0.6 + fatigue)) {
      s = s.replace(/\d+/, (d) => String(Math.max(2, Number(d) + (rng() < 0.5 ? -1 : 1) * Math.ceil(Number(d) * 0.2 + 1))));
    }
    // keep sentences roughly intact but drop a trailing clause sometimes
    if (rng() < dropBase * 0.8 && s.includes(",")) s = s.slice(0, s.lastIndexOf(","));
    out.push(s);
  });
  const fillers = ["eh,", "um,", "este...", "uh,"];
  if (rng() < 0.6 && out.length) out.splice(1, 0, fillers[Math.floor(rng() * fillers.length)]);
  return out.join(" ");
}

let cache: PracticeSession[] | null = null;

export function getSampleSessions(): PracticeSession[] {
  if (cache) return cache;
  const rng = seededRng(20261120);
  const sessions: PracticeSession[] = [];
  const total = 28;
  const now = Date.now();
  for (let i = 0; i < total; i++) {
    const progress = i / (total - 1);
    const plan = PLAN[i % PLAN.length];
    const dir: [Lang, Lang] = i % 3 === 2 ? ["es", "en"] : ["en", "es"];
    const config: ExerciseConfig = {
      type: plan.type,
      sourceLang: dir[0],
      targetLang: plan.type === "memory" ? dir[0] : dir[1],
      subject: plan.subject,
      length: plan.length,
      difficulty: plan.difficulty,
      contentSource: plan.type === "info-retention" ? "generated" : "library",
    };
    const seed = 1000 + i;
    const exercise = buildExercise(config, { seed });
    const mirror = buildExercise({ ...config, sourceLang: config.targetLang }, { seed });

    const lengthPenalty = plan.length === "long" ? 0.12 : plan.length === "medium" ? 0.06 : 0;
    const simulPenalty = plan.type === "simultaneous" ? 0.1 : 0;
    const dropBase = Math.max(0.03, 0.17 + lengthPenalty + simulPenalty - progress * 0.12);
    const numberSlip = Math.max(0.08, 0.45 + lengthPenalty * 2 - progress * 0.25);
    const transcript = simulateRendition(mirror.segments, rng, dropBase, numberSlip);
    const words = transcript.split(/\s+/).length;
    const responseSec = Math.round(words / (2.1 + rng() * 0.6));

    const evaluation = evaluateHeuristic({
      exercise,
      response: { transcript, durationSec: responseSec, transcriptionSource: "demo" },
    });
    evaluation.disclaimer = "SAMPLE DATA — simulated session for demonstration. " + evaluation.disclaimer;

    const daysAgo = Math.round((1 - progress) * 41) + (i % 2 ? 0.3 : 0);
    const createdAt = new Date(now - daysAgo * 86_400_000 - (i % 5) * 3_600_000).toISOString();
    sessions.push({
      id: `sample-${i}`,
      createdAt,
      config: exercise.config,
      exerciseTitle: exercise.title,
      sourceText: exercise.text,
      wordCount: exercise.wordCount,
      unitCount: exercise.units.length,
      durationSec: exercise.estimatedDurationSec + responseSec + 20,
      response: { transcript, durationSec: responseSec, transcriptionSource: "demo" },
      evaluation,
      isSample: true,
    });
  }
  cache = sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return cache;
}
