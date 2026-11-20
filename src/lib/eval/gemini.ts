import "server-only";
import { generateJson } from "@/lib/ai/gemini";
import { GEMINI_MODELS } from "@/lib/config/env";
import type { Evaluation } from "@/lib/types";
import { buildEvalPrompt, EVAL_SYSTEM_PROMPT, EvaluationSchema, toEvaluation } from "./gemini-spec";
import { evaluateHeuristic } from "./heuristic";
import type { EvaluationRequest } from "./types";

export async function evaluateWithGemini(req: EvaluationRequest): Promise<Evaluation> {
  const { data, model } = await generateJson({
    model: GEMINI_MODELS.eval(),
    system: EVAL_SYSTEM_PROMPT,
    prompt: buildEvalPrompt(req),
    schema: EvaluationSchema,
    maxOutputTokens: 8192,
  });
  return toEvaluation(data, req, evaluateHeuristic(req), model);
}
