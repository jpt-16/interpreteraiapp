import type { MeaningUnit } from "@/lib/types";

/**
 * Small DSL for annotating meaning units.
 * Cue syntax: alternatives separated by "|"; inside an alternative every
 * space-separated stem must appear in the rendition (prefix match on tokens,
 * accent- and case-insensitive). Spelled-out numbers are normalised to digits
 * before matching, so cues can use digits.
 */
type W = 1 | 2 | 3;

export const idea = (id: string, label: string, en: string, es: string, weight: W = 2): MeaningUnit => ({
  id,
  category: "idea",
  label,
  weight,
  cues: { en, es },
});

export const num = (
  id: string,
  label: string,
  value: number,
  weight: W = 2,
  en = "",
  es = "",
): MeaningUnit => ({ id, category: "number", label, weight, value, cues: { en, es } });

export const qty = (
  id: string,
  label: string,
  value: number,
  weight: W = 2,
  en = "",
  es = "",
): MeaningUnit => ({ id, category: "quantity", label, weight, value, cues: { en, es } });

export const date = (id: string, label: string, en: string, es: string, weight: W = 2): MeaningUnit => ({
  id,
  category: "date",
  label,
  weight,
  cues: { en, es },
});

export const name = (id: string, label: string, cue: string, weight: W = 2): MeaningUnit => ({
  id,
  category: "name",
  label,
  weight,
  cues: { en: cue, es: cue },
});

export const term = (id: string, label: string, en: string, es: string, weight: W = 2): MeaningUnit => ({
  id,
  category: "term",
  label,
  weight,
  cues: { en, es },
});
