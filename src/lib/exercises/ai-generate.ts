import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { evalModel } from "@/lib/config/env";
import type { ExerciseConfig, MeaningUnit } from "@/lib/types";
import { AUDIO_LENGTH, DIFFICULTY, EXERCISE_TYPES, LANGUAGES, SUBJECTS } from "./catalog";
import { wordBudget } from "./builder";

const PassageSchema = z.object({
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
          value: z.number().nullable(),
          cues_en: z.string(),
          cues_es: z.string(),
        }),
      ),
    }),
  ),
});

const SYSTEM = `You write realistic source speeches for professional interpreter training, and annotate them with meaning units for evaluation.

Speeches must sound like real spoken discourse in the stated setting (a clinician, attorney, executive, delegate, engineer or caseworker speaking), not like written prose or a language lesson. Use plausible but fictional names, organisations and figures.

Split the speech into sentence-level segments. For each segment list its meaning units: every distinct idea, figure, date, name, quantity and domain term the speaker conveys.
- weight: 3 = critical (losing it changes the message), 2 = important, 1 = supporting.
- value: the exact numeric value for number/quantity units (e.g. 48600000 for "48.6 million"), otherwise null.
- cues_en / cues_es: matching cues used by a fallback evaluator, in English and Spanish. Lowercase, no accents. Alternatives separated by "|"; within an alternative, space-separated word stems that must all appear (e.g. "chest pain|pain chest" / "dolor pecho|dolor toracic"). Use digits for numbers.`;

export async function generatePassage(config: ExerciseConfig) {
  const words = wordBudget(config);
  const info = config.type === "info-retention";
  const prompt = `Write one source speech.
- Language: ${LANGUAGES[config.sourceLang].label}
- Subject: ${SUBJECTS[config.subject].label} (${SUBJECTS[config.subject].description})
- Exercise: ${EXERCISE_TYPES[config.type].label}
- Difficulty ${config.difficulty}/5 (${DIFFICULTY[config.difficulty].label}: ${DIFFICULTY[config.difficulty].description})
- Length: about ${words} words (${AUDIO_LENGTH[config.length].label.toLowerCase()})
${info ? "- Make it dense with names, figures, dates and quantities: at least one per sentence." : "- Mix main ideas with a realistic number of specific details for this difficulty."}
Title and context (one sentence describing who is speaking to whom) should be in ${LANGUAGES[config.sourceLang].label}.`;

  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: evalModel(),
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(PassageSchema) },
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("No passage generated");
  const out = response.parsed_output;
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
          value: u.value ?? undefined,
          cues: { en: u.cues_en, es: u.cues_es },
        }),
      ),
    })),
  };
}
