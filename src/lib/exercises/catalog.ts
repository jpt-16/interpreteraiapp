import type { AudioLength, Difficulty, ExerciseType, Lang, Subject } from "@/lib/types";

export const LANGUAGES: Record<Lang, { label: string; native: string; bcp47: string }> = {
  en: { label: "English", native: "English", bcp47: "en-US" },
  es: { label: "Spanish", native: "Español", bcp47: "es-ES" },
};

export const SUBJECTS: Record<Subject, { label: string; description: string }> = {
  medical: { label: "Medical", description: "Clinical encounters, discharge instructions, dosages" },
  legal: { label: "Legal", description: "Depositions, court proceedings, contracts" },
  business: { label: "Business", description: "Earnings, negotiations, operations" },
  conference: { label: "Conference", description: "Speeches, panels, diplomatic remarks" },
  technical: { label: "Technical", description: "Engineering, IT incidents, specifications" },
  community: { label: "Community", description: "Schools, housing, social services" },
};

export interface ExerciseTypeInfo {
  label: string;
  short: string;
  description: string;
  skills: string[];
  /** Whether the response is produced in the same language as the source. */
  sameLanguage: boolean;
  instructions: string[];
}

export const EXERCISE_TYPES: Record<Exclude<ExerciseType, "dialogue">, ExerciseTypeInfo> & {
  dialogue: ExerciseTypeInfo;
} = {
  memory: {
    label: "Memory retention",
    short: "Memory",
    description: "Listen to a passage, then reproduce its full meaning from memory.",
    skills: ["Short-term auditory memory", "Active listening", "Completeness"],
    sameLanguage: true,
    instructions: [
      "Listen to the full passage once. No notes.",
      "When the speaker finishes, start recording and reproduce the meaning in your own words.",
      "Aim for completeness and accuracy — paraphrase is fine; omissions and changes are not.",
    ],
  },
  consecutive: {
    label: "Consecutive interpreting",
    short: "Consecutive",
    description: "Hear a passage in the source language, then deliver it in the target language.",
    skills: ["Analysis", "Note-taking", "Reformulation", "Accuracy"],
    sameLanguage: false,
    instructions: [
      "Listen to the speaker. You may use the notepad for consecutive notes.",
      "When the speaker finishes, record your interpretation into the target language.",
      "Render the speaker's meaning faithfully. Do not add or editorialise.",
    ],
  },
  simultaneous: {
    label: "Simultaneous interpreting",
    short: "Simultaneous",
    description: "Interpret aloud while the speaker is still talking.",
    skills: ["Split attention", "Décalage control", "Processing under load"],
    sameLanguage: false,
    instructions: [
      "Use headphones so the source audio is not picked up by your microphone.",
      "Recording starts automatically with the source audio. Interpret continuously.",
      "Keep a steady décalage; prioritise meaning over form when under pressure.",
    ],
  },
  "info-retention": {
    label: "Information retention",
    short: "Info retention",
    description: "Detail-dense passages that test names, numbers, dates and quantities.",
    skills: ["Numbers", "Proper names", "Dates", "Quantities"],
    sameLanguage: false,
    instructions: [
      "The passage is dense with names, figures and dates. Listen closely.",
      "Record your rendition in the target language, preserving every detail.",
      "You will then answer short detail-check questions.",
    ],
  },
  dialogue: {
    label: "Dialogue interpreting",
    short: "Dialogue",
    description: "Bidirectional consecutive interpreting between two parties.",
    skills: ["Direction switching", "Register", "Turn management"],
    sameLanguage: false,
    instructions: [
      "Two parties speak different languages. Interpret each turn into the other language.",
      "Listen to each turn, then record your rendition before the next speaker continues.",
    ],
  },
};

export interface DifficultyInfo {
  label: string;
  description: string;
  speechRate: number;
  wordBudgetMultiplier: number;
}

export const DIFFICULTY: Record<Difficulty, DifficultyInfo> = {
  1: { label: "Foundation", description: "Short sentences, moderate pace, few details", speechRate: 0.9, wordBudgetMultiplier: 0.8 },
  2: { label: "Developing", description: "Longer sentences, some figures", speechRate: 0.96, wordBudgetMultiplier: 0.9 },
  3: { label: "Professional", description: "Natural pace, dense information", speechRate: 1.0, wordBudgetMultiplier: 1 },
  4: { label: "Advanced", description: "Fast delivery, complex structure", speechRate: 1.08, wordBudgetMultiplier: 1.15 },
  5: { label: "Expert", description: "Rapid, dense, high cognitive load", speechRate: 1.16, wordBudgetMultiplier: 1.3 },
};

export const AUDIO_LENGTH: Record<AudioLength, { label: string; approx: string; words: number }> = {
  short: { label: "Short", approx: "~30 s", words: 75 },
  medium: { label: "Medium", approx: "~1 min", words: 145 },
  long: { label: "Long", approx: "~2 min", words: 260 },
};

/** Approximate words per minute of synthesized speech at rate 1.0. */
export const BASE_WPM: Record<Lang, number> = { en: 150, es: 160 };

export const SCORE_LABELS = {
  semanticAccuracy: "Semantic accuracy",
  informationRetention: "Information retention",
  completeness: "Completeness",
  fidelity: "No unsupported additions",
  numbersDates: "Numbers & dates",
  terminology: "Terminology",
  fluency: "Fluency & delivery",
} as const;

export const SCORE_DESCRIPTIONS = {
  semanticAccuracy: "Was the speaker's intended meaning rendered correctly?",
  informationRetention: "Were specific details — names, figures, terms — retained?",
  completeness: "Were the speaker's main points all present (no omissions)?",
  fidelity: "Did the rendition avoid adding information the speaker did not give?",
  numbersDates: "Were numbers, dates and quantities reproduced exactly?",
  terminology: "Were domain terms rendered with correct equivalents?",
  fluency: "Pace, hesitations, fillers and self-corrections.",
} as const;

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "es" : "en";
}

export function langPairLabel(source: Lang, target: Lang) {
  return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}
