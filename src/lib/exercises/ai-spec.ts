import { z } from "zod";
import type { ExerciseConfig, MeaningUnit } from "@/lib/types";
import { wordBudget } from "./builder";
import { AUDIO_LENGTH, DIFFICULTY, EXERCISE_TYPES, LANGUAGES, SUBJECTS } from "./catalog";

/** Pure pieces of AI passage generation (schema, prompts, mapping). Value -1 means "not numeric". */
export const PassageSchema = z.object({
  title: z.string(),
  context: z.string(),
  segments: z.array(
    z.object({
      text: z.string(),
      units: z.array(
        z.object({
          category: z.enum(["idea", "number", "date", "name", "quantity", "term"]),
          label: z.string(),
          weight: z.number(),
          value: z.number(),
          cues_en: z.string(),
          cues_es: z.string(),
        }),
      ),
    }),
  ),
});

export const PASSAGE_SYSTEM = `You write realistic source speeches for professional interpreter training, and annotate them with meaning units for evaluation.

Speeches must sound like real spoken discourse in the stated setting (a clinician, attorney, executive, delegate, engineer or caseworker speaking), not like written prose or a language lesson. Use plausible but fictional names, organisations and figures.

Split the speech into sentence-level segments. For each segment list its meaning units: every distinct idea, figure, date, name, quantity and domain term the speaker conveys.
- weight: 3 = critical (losing it changes the message), 2 = important, 1 = supporting.
- value: the exact numeric value for number/quantity units (e.g. 48600000 for "48.6 million"); use -1 when the unit is not numeric.
- cues_en / cues_es: matching cues used by a fallback evaluator, in English and Spanish. Lowercase, no accents. Alternatives separated by "|"; within an alternative, space-separated word stems that must all appear (e.g. "chest pain|pain chest" / "dolor pecho|dolor toracic"). Use digits for numbers.`;

export function buildPassagePrompt(config: ExerciseConfig) {
  const words = wordBudget(config);
  const info = config.type === "info-retention";
  return `Write one source speech.
- Language: ${LANGUAGES[config.sourceLang].label}
- Subject: ${SUBJECTS[config.subject].label} (${SUBJECTS[config.subject].description})
- Exercise: ${EXERCISE_TYPES[config.type].label}
- Difficulty ${config.difficulty}/5 (${DIFFICULTY[config.difficulty].label}: ${DIFFICULTY[config.difficulty].description})
- Length: about ${words} words (${AUDIO_LENGTH[config.length].label.toLowerCase()})
${info ? "- Make it dense with names, figures, dates and quantities: at least one per sentence." : "- Mix main ideas with a realistic number of specific details for this difficulty."}
Title and context (one sentence describing who is speaking to whom) should be in ${LANGUAGES[config.sourceLang].label}.`;
}

export function toPassage(out: z.infer<typeof PassageSchema>) {
  return {
    title: out.title,
    context: out.context,
    segments: out.segments.map((s, i) => ({
      text: s.text,
      units: s.units.map(
        (u, j): MeaningUnit => ({
          id: `ai${i}-${j}`,
          category: u.category,
          label: u.label,
          weight: Math.min(3, Math.max(1, Math.round(u.weight))) as 1 | 2 | 3,
          value: u.value >= 0 ? u.value : undefined,
          cues: { en: u.cues_en, es: u.cues_es },
        }),
      ),
    })),
  };
}
