import "server-only";
import { generateJson } from "@/lib/ai/gemini";
import { GEMINI_MODELS } from "@/lib/config/env";
import type { ExerciseConfig } from "@/lib/types";
import { buildPassagePrompt, PASSAGE_SYSTEM, PassageSchema, toPassage } from "./ai-spec";

export async function generatePassage(config: ExerciseConfig) {
  const { data } = await generateJson({
    model: GEMINI_MODELS.generate(),
    system: PASSAGE_SYSTEM,
    prompt: buildPassagePrompt(config),
    schema: PassageSchema,
    maxOutputTokens: 8192,
  });
  return toPassage(data);
}
