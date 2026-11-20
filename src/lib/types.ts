/**
 * Core domain types for the interpreter performance training platform.
 * These types are shared by the client, the API routes and the data layer.
 */

export type Lang = "en" | "es";

export type ExerciseType =
  | "memory"
  | "consecutive"
  | "simultaneous"
  | "info-retention"
  | "dialogue";

export type Subject =
  | "medical"
  | "legal"
  | "business"
  | "conference"
  | "technical"
  | "community";

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type AudioLength = "short" | "medium" | "long";
export type ContentSource = "library" | "generated" | "ai";

export interface ExerciseConfig {
  type: ExerciseType;
  sourceLang: Lang;
  targetLang: Lang;
  difficulty: Difficulty;
  subject: Subject;
  length: AudioLength;
  contentSource: ContentSource;
  /** Dialogue scenario id, only for live simulations. */
  scenarioId?: string;
}

export type UnitCategory = "idea" | "number" | "date" | "name" | "quantity" | "term";

/**
 * A meaning unit is an annotated piece of information the speaker intended to
 * convey. Evaluation is done against meaning units rather than against
 * words, so paraphrase is not penalised.
 */
export interface MeaningUnit {
  id: string;
  category: UnitCategory;
  /** Human-readable description of the information, in the source language. */
  label: string;
  /** 1 = supporting detail, 2 = important, 3 = critical. */
  weight: 1 | 2 | 3;
  /** Numeric value for number / quantity units. */
  value?: number;
  /**
   * Concept cues per language for the demo heuristic evaluator.
   * Alternatives are separated by "|"; within an alternative, every
   * space-separated stem must appear (prefix match).
   */
  cues: Record<Lang, string>;
}

export interface Probe {
  unitId: string;
  question: Record<Lang, string>;
}

export interface Exercise {
  id: string;
  config: ExerciseConfig;
  title: string;
  context: string;
  /** Source-language segments as they will be spoken. */
  segments: string[];
  text: string;
  units: MeaningUnit[];
  wordCount: number;
  speechRate: number;
  estimatedDurationSec: number;
  origin: ContentSource;
  probes?: Probe[];
  glossary?: { source: string; target: string }[];
}

export type TranscriptionSource = "browser" | "server" | "typed" | "demo";

export interface ResponseCapture {
  transcript: string;
  durationSec: number | null;
  transcriptionSource: TranscriptionSource;
  /** Seconds between source onset and the user's first recognised speech (simultaneous). */
  firstSpeechOffsetSec?: number | null;
  probeAnswers?: { unitId: string; answer: string }[];
}

export type UnitStatus = "conveyed" | "partial" | "omitted" | "distorted";
export type Severity = "minor" | "major" | "critical";

export interface ScoreSet {
  semanticAccuracy: number | null;
  informationRetention: number | null;
  completeness: number | null;
  fidelity: number | null; // absence of unsupported additions
  numbersDates: number | null;
  terminology: number | null;
  fluency: number | null;
}

export type ScoreKey = keyof ScoreSet;

export interface Evaluation {
  mode: "ai" | "heuristic-demo";
  provider: string;
  model?: string;
  overallScore: number;
  scores: ScoreSet;
  summary: string;
  unitResults: { unitId: string; status: UnitStatus; note?: string }[];
  omissions: { content: string; category: UnitCategory; severity: Severity }[];
  errors: {
    source: string;
    rendered: string;
    explanation: string;
    category: UnitCategory;
    severity: Severity;
  }[];
  additions: { rendered: string; explanation: string; severity: Severity }[];
  acceptableVariations: { source: string; rendered: string; note: string }[];
  fluency: {
    wordsPerMinute: number | null;
    fillerCount: number;
    restarts: number;
    notes: string[];
  };
  strengths: string[];
  recommendations: Recommendation[];
  probeResults?: { unitId: string; question: string; answer: string; correct: boolean; expected: string }[];
  disclaimer: string;
  generatedAt: string;
}

export interface Recommendation {
  title: string;
  reason: string;
  config: Partial<ExerciseConfig>;
}

export interface PracticeSession {
  id: string;
  createdAt: string;
  config: ExerciseConfig;
  exerciseTitle: string;
  sourceText: string;
  wordCount: number;
  unitCount: number;
  durationSec: number | null;
  response: ResponseCapture;
  evaluation: Evaluation;
  isSample?: boolean;
  recording?: { stored: boolean; path?: string; expiresAt?: string };
}

export interface Weakness {
  key: string;
  label: string;
  description: string;
  severity: "low" | "medium" | "high";
  occurrences: number;
  evidence: string;
  trend: "worsening" | "stable" | "improving";
  firstSeen: string;
  lastSeen: string;
  recommendation: Recommendation;
}

export interface TermEntry {
  id: string;
  sourceLang: Lang;
  source: string;
  target: string;
  domain: Subject | "general";
  notes?: string;
  createdAt: string;
}

export interface UserPreferences {
  displayName: string;
  defaultSourceLang: Lang;
  defaultTargetLang: Lang;
  speechRateMultiplier: number;
  storeRecordings: boolean;
  recordingRetentionDays: number;
  showSampleData: boolean;
  preferredVoice?: Record<Lang, string | undefined>;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: "Interpreter",
  defaultSourceLang: "en",
  defaultTargetLang: "es",
  speechRateMultiplier: 1,
  storeRecordings: false,
  recordingRetentionDays: 7,
  showSampleData: true,
};
