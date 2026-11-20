"use client";
import type { Evaluation } from "@/lib/types";
import { evaluateHeuristic } from "./heuristic";
import type { EvaluationRequest } from "./types";

/** Calls the server evaluator; if the server is unreachable, evaluates locally with the demo heuristic. */
export async function requestEvaluation(req: EvaluationRequest): Promise<{ evaluation: Evaluation; warning?: string }> {
  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Evaluation request failed (${res.status})`);
    return (await res.json()) as { evaluation: Evaluation; warning?: string };
  } catch {
    return {
      evaluation: evaluateHeuristic(req),
      warning: "The evaluation service could not be reached, so this result was produced locally by the demo heuristic evaluator.",
    };
  }
}
