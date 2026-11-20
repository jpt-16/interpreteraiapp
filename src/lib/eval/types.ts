import type { ExerciseConfig, MeaningUnit, Probe, ResponseCapture } from "@/lib/types";

/** Payload sent to any evaluation provider. */
export interface EvaluationRequest {
  exercise: {
    config: ExerciseConfig;
    title: string;
    context?: string;
    text: string;
    units: MeaningUnit[];
    wordCount: number;
    probes?: Probe[];
  };
  response: ResponseCapture;
  /** User glossary entries relevant to this language pair. */
  glossary?: { source: string; target: string }[];
}

export const DISCLAIMER =
  "Automated training feedback only. These scores are not an official assessment or professional certification.";
