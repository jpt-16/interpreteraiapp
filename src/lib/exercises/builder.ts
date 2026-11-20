import type { Exercise, ExerciseConfig, MeaningUnit, Probe } from "@/lib/types";
import { AUDIO_LENGTH, BASE_WPM, DIFFICULTY, EXERCISE_TYPES, SUBJECTS } from "./catalog";
import { generateDetailPassage } from "./generator";
import { LIBRARY, type LibraryPassage } from "./library";

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function normalizeConfig(config: ExerciseConfig): ExerciseConfig {
  if (config.type === "memory") return { ...config, targetLang: config.sourceLang };
  if (config.type === "info-retention") return { ...config, contentSource: config.contentSource === "ai" ? "ai" : "generated" };
  return config;
}

export function wordBudget(config: ExerciseConfig) {
  return Math.round(AUDIO_LENGTH[config.length].words * DIFFICULTY[config.difficulty].wordBudgetMultiplier);
}

export function speechRateFor(config: ExerciseConfig, multiplier = 1) {
  return Math.round(DIFFICULTY[config.difficulty].speechRate * multiplier * 100) / 100;
}

export function estimateDuration(words: number, lang: "en" | "es", rate: number) {
  return Math.round((words / (BASE_WPM[lang] * rate)) * 60);
}

function choosePassage(config: ExerciseConfig, seed: number, avoidIds: string[] = []): LibraryPassage {
  const bySubject = LIBRARY.filter((p) => p.subject === config.subject);
  const pool = bySubject.length ? bySubject : LIBRARY;
  const scored = pool
    .map((p) => ({ p, d:
        Math.abs(p.difficulty - config.difficulty) +
        (avoidIds.includes(p.id) || avoidIds.includes(p.title.en) || avoidIds.includes(p.title.es) ? 0.5 : 0),
    }))
    .sort((a, b) => a.d - b.d);
  const best = scored.filter((s) => s.d === scored[0].d);
  return best[seed % best.length].p;
}

export interface BuildOptions {
  seed?: number;
  rateMultiplier?: number;
  avoidPassageIds?: string[];
}

/** Builds a playable, evaluable exercise from a configuration. */
export function buildExercise(rawConfig: ExerciseConfig, opts: BuildOptions = {}): Exercise {
  const config = normalizeConfig(rawConfig);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const budget = wordBudget(config);
  const lang = config.sourceLang;
  const rate = speechRateFor(config, opts.rateMultiplier ?? 1);

  let title: string;
  let context: string;
  let segments: string[] = [];
  let units: MeaningUnit[] = [];
  let probes: Probe[] | undefined;
  let id: string;
  let origin: Exercise["origin"];

  if (config.type === "info-retention") {
    const sentences = Math.max(2, Math.round(budget / 19));
    const gen = generateDetailPassage(config.subject, sentences, seed);
    segments = gen.map((g) => g[lang]);
    units = gen.flatMap((g) => g.units);
    const allProbes = gen.flatMap((g) => g.probes);
    probes = allProbes.filter((_, i) => i % 2 === 0).slice(0, 5);
    title = `${SUBJECTS[config.subject].label} detail briefing`;
    context =
      lang === "en"
        ? "A dense briefing full of names, figures and dates."
        : "Un informe denso, con nombres, cifras y fechas.";
    id = `gen-${config.subject}-${seed}`;
    origin = "generated";
  } else {
    const passage = choosePassage(config, seed, opts.avoidPassageIds);
    let words = 0;
    for (const seg of passage.segments) {
      if (segments.length >= 2 && words >= budget) break;
      segments.push(seg[lang]);
      units.push(...seg.units);
      words += countWords(seg[lang]);
    }
    title = passage.title[lang];
    context = passage.context[lang];
    id = `${passage.id}-${segments.length}`;
    origin = "library";
  }

  const text = segments.join(" ");
  const wordCount = countWords(text);
  return {
    id,
    config,
    title,
    context,
    segments,
    text,
    units,
    wordCount,
    speechRate: rate,
    estimatedDurationSec: estimateDuration(wordCount, lang, rate),
    origin,
    probes,
  };
}

export function exerciseInstructions(config: ExerciseConfig) {
  return EXERCISE_TYPES[config.type].instructions;
}

/** Encode / decode a configuration in URL search params. */
export function configToParams(c: ExerciseConfig) {
  const p = new URLSearchParams({
    type: c.type,
    src: c.sourceLang,
    tgt: c.targetLang,
    diff: String(c.difficulty),
    subject: c.subject,
    len: c.length,
    content: c.contentSource,
  });
  if (c.scenarioId) p.set("scenario", c.scenarioId);
  return p.toString();
}

export function configFromParams(p: URLSearchParams): ExerciseConfig | null {
  const type = p.get("type") as ExerciseConfig["type"] | null;
  if (!type || !(type in EXERCISE_TYPES)) return null;
  const lang = (v: string | null, d: "en" | "es") => (v === "en" || v === "es" ? v : d);
  const diff = Number(p.get("diff"));
  const subject = (p.get("subject") ?? "medical") as ExerciseConfig["subject"];
  const len = (p.get("len") ?? "medium") as ExerciseConfig["length"];
  const content = (p.get("content") ?? "library") as ExerciseConfig["contentSource"];
  return normalizeConfig({
    type,
    sourceLang: lang(p.get("src"), "en"),
    targetLang: lang(p.get("tgt"), "es"),
    difficulty: (diff >= 1 && diff <= 5 ? diff : 2) as ExerciseConfig["difficulty"],
    subject: subject in SUBJECTS ? subject : "medical",
    length: len in AUDIO_LENGTH ? len : "medium",
    contentSource: ["library", "generated", "ai"].includes(content) ? content : "library",
    scenarioId: p.get("scenario") ?? undefined,
  });
}
