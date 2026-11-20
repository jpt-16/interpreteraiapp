import { estimateDuration, countWords } from "@/lib/exercises/builder";
import { DIFFICULTY } from "@/lib/exercises/catalog";
import type { Scenario } from "@/lib/exercises/scenarios";
import type { Exercise, ExerciseConfig, Lang, MeaningUnit, Probe } from "@/lib/types";

/** A unit of listening + rendering. Single exercises have one turn; dialogues have many. */
export interface RunTurn {
  id: string;
  speaker?: string;
  sourceLang: Lang;
  targetLang: Lang;
  segments: string[];
  text: string;
  units: MeaningUnit[];
  wordCount: number;
}

export interface ExercisePlan {
  id: string;
  config: ExerciseConfig;
  title: string;
  context: string;
  turns: RunTurn[];
  probes?: Probe[];
  speechRate: number;
  estimatedDurationSec: number;
  origin: Exercise["origin"];
  parties?: Scenario["parties"];
}

export function planFromExercise(ex: Exercise): ExercisePlan {
  return {
    id: ex.id,
    config: ex.config,
    title: ex.title,
    context: ex.context,
    turns: [
      {
        id: "t0",
        sourceLang: ex.config.sourceLang,
        targetLang: ex.config.targetLang,
        segments: ex.segments,
        text: ex.text,
        units: ex.units,
        wordCount: ex.wordCount,
      },
    ],
    probes: ex.probes,
    speechRate: ex.speechRate,
    estimatedDurationSec: ex.estimatedDurationSec,
    origin: ex.origin,
  };
}

export function planFromScenario(s: Scenario, rateMultiplier = 1): ExercisePlan {
  const rate = Math.round(DIFFICULTY[s.difficulty].speechRate * rateMultiplier * 100) / 100;
  const turns: RunTurn[] = s.turns.map((t, i) => {
    const segments = t.text.match(/[^.?!]+[.?!]+/g)?.map((x) => x.trim()) ?? [t.text];
    return {
      id: `t${i}`,
      speaker: t.speaker,
      sourceLang: t.lang,
      targetLang: t.lang === "en" ? "es" : "en",
      segments,
      text: t.text,
      units: t.units.map((u) => ({ ...u, id: `${i}-${u.id}` })),
      wordCount: countWords(t.text),
    };
  });
  const totalWords = turns.reduce((a, t) => a + t.wordCount, 0);
  return {
    id: `scenario-${s.id}`,
    config: {
      type: "dialogue",
      sourceLang: s.parties[0].lang,
      targetLang: s.parties[1].lang,
      difficulty: s.difficulty,
      subject: s.subject,
      length: turns.length > 4 ? "long" : "medium",
      contentSource: "library",
      scenarioId: s.id,
    },
    title: s.title,
    context: s.setting,
    turns,
    speechRate: rate,
    estimatedDurationSec: estimateDuration(totalWords, "en", rate),
    origin: "library",
    parties: s.parties,
  };
}
