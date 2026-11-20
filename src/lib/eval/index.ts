import "server-only";
import { integrationStatus } from "@/lib/config/env";
import type { Evaluation } from "@/lib/types";
import { evaluateWithGemini } from "./gemini";
import { evaluateHeuristic } from "./heuristic";
import type { EvaluationRequest } from "./types";

/**
 * Evaluation provider registry. To test another model or vendor, add a
 * provider here and select it with EVALUATION_PROVIDER.
 */
export interface EvaluationProvider {
  id: string;
  evaluate(req: EvaluationRequest): Promise<Evaluation>;
}

const providers: Record<string, EvaluationProvider> = {
  gemini: { id: "gemini", evaluate: evaluateWithGemini },
  "demo-heuristic": { id: "demo-heuristic", evaluate: async (req) => evaluateHeuristic(req) },
};

export async function evaluate(req: EvaluationRequest): Promise<{ evaluation: Evaluation; warning?: string }> {
  const status = integrationStatus();
  const provider = providers[status.evaluation.provider] ?? providers["demo-heuristic"];
  try {
    return { evaluation: await provider.evaluate(req) };
  } catch (err) {
    if (provider.id === "demo-heuristic") throw err;
    console.error("[evaluate] AI provider failed, falling back to heuristic:", err);
    return {
      evaluation: evaluateHeuristic(req),
      warning: "The AI evaluator was unavailable, so this result uses the demo heuristic evaluator.",
    };
  }
}
