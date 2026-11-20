import { recommendFromScores } from "@/lib/coach/recommend";
import type { Evaluation, MeaningUnit, ScoreSet, Severity, UnitStatus } from "@/lib/types";
import { approxEqual, cueScore, fluencyStats, numberMentions, numbersIn, tokenize, wordCount } from "./text";
import { DISCLAIMER, type EvaluationRequest } from "./types";

/**
 * Demo heuristic evaluator.
 *
 * Compares the rendition against annotated meaning units using bilingual
 * concept cues and language-aware number normalisation. It does NOT measure
 * word overlap with the source, so acceptable rephrasing is not penalised —
 * but it cannot judge nuance the way a language model can. It is used when no
 * AI provider is configured, and as a fallback if the AI call fails.
 */

const NUMERIC: MeaningUnit["category"][] = ["number", "quantity"];
const DETAIL: MeaningUnit["category"][] = ["number", "quantity", "date", "name", "term"];

const sev = (w: number): Severity => (w >= 3 ? "critical" : w === 2 ? "major" : "minor");
const round = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

function coverage(units: MeaningUnit[], status: Map<string, UnitStatus>) {
  const total = units.reduce((a, u) => a + u.weight, 0);
  if (!total) return null;
  const got = units.reduce((a, u) => {
    const s = status.get(u.id);
    return a + (s === "conveyed" ? u.weight : s === "partial" ? u.weight * 0.5 : 0);
  }, 0);
  return (got / total) * 100;
}

export function evaluateHeuristic(req: EvaluationRequest): Evaluation {
  const { exercise, response } = req;
  const target = exercise.config.targetLang;
  const source = exercise.config.sourceLang;
  const transcript = response.transcript ?? "";
  const tokens = tokenize(transcript, target);
  const mentions = numberMentions(tokens);
  const sourceNums = numbersIn(tokenize(exercise.text, source));
  const unitValues = exercise.units.filter((u) => u.value !== undefined).map((u) => u.value as number);

  const status = new Map<string, UnitStatus>();
  const notes = new Map<string, string>();

  // 1. Concept & detail matching
  for (const u of exercise.units) {
    if (NUMERIC.includes(u.category) && u.value !== undefined) {
      const hit = mentions.some((m) => m.nums.some((n) => approxEqual(n, u.value!)));
      status.set(u.id, hit ? "conveyed" : "omitted");
      continue;
    }
    const score = cueScore(u.cues[target], tokens) ?? 0;
    if (score >= 1) status.set(u.id, "conveyed");
    else if (u.category === "date" && score >= 0.5) {
      status.set(u.id, "distorted");
      notes.set(u.id, "Date only partly matches the source (e.g. right month, wrong day).");
    } else if (score >= 0.5) status.set(u.id, "partial");
    else status.set(u.id, "omitted");
  }

  // 2. Numbers that do not correspond to anything in the source
  const unexplained = mentions.filter(
    (m) =>
      !m.nums.some((n) => unitValues.some((v) => approxEqual(n, v)) || sourceNums.some((v) => approxEqual(n, v))) &&
      !m.ordinal &&
      m.nums.every((n) => n > 1),
  );

  // 3. Pair missing numeric units with unexplained numbers → distortions
  const errors: Evaluation["errors"] = [];
  const pool = [...unexplained];
  for (const u of exercise.units) {
    if (!NUMERIC.includes(u.category) || u.value === undefined || status.get(u.id) !== "omitted") continue;
    const ctx = cueScore(u.cues[target], tokens);
    if (ctx !== null && ctx === 0) continue;
    let bestIdx = -1;
    let bestRatio = Infinity;
    pool.forEach((m, idx) => {
      const ratio = Math.min(
        ...m.nums.map((n) => Math.max(n, u.value!) / Math.max(1e-9, Math.min(n, u.value!))),
      );
      if (ratio < bestRatio && ratio <= 5) {
        bestRatio = ratio;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) {
      const m = pool.splice(bestIdx, 1)[0];
      status.set(u.id, "distorted");
      errors.push({
        source: u.label,
        rendered: m.text,
        explanation: `The source figure was ${u.value?.toLocaleString("en-US")}, but "${m.text}" was rendered. A changed figure is a meaning error, not a stylistic difference.`,
        category: u.category,
        severity: sev(u.weight),
      });
    }
  }
  for (const u of exercise.units) {
    if (status.get(u.id) === "distorted" && u.category === "date") {
      errors.push({
        source: u.label,
        rendered: "(date rendered incorrectly or incompletely)",
        explanation: notes.get(u.id) ?? "Date does not match the source.",
        category: "date",
        severity: sev(u.weight),
      });
    }
  }

  const additions: Evaluation["additions"] = pool.map((m) => ({
    rendered: m.text,
    explanation: "This figure does not appear in the source. Unsupported numbers can mislead the listener.",
    severity: "major" as Severity,
  }));
  const respWords = wordCount(transcript);
  if (respWords > exercise.wordCount * 1.6 + 15) {
    additions.push({
      rendered: `${respWords} words vs. ${exercise.wordCount} in the source`,
      explanation: "The rendition is much longer than the source, which often signals embellishment or added explanation.",
      severity: "minor",
    });
  }

  // 4. Scores
  const ideas = exercise.units.filter((u) => u.category === "idea");
  const details = exercise.units.filter((u) => DETAIL.includes(u.category));
  const numericAndDates = exercise.units.filter((u) => ["number", "quantity", "date"].includes(u.category));
  const terms = exercise.units.filter((u) => u.category === "term");

  const all = coverage(exercise.units, status) ?? 0;
  const attempted = exercise.units.filter((u) => status.get(u.id) !== "omitted");
  const attemptedW = attempted.reduce((a, u) => a + u.weight, 0);
  const correctW = attempted.reduce(
    (a, u) => a + (status.get(u.id) === "conveyed" ? u.weight : status.get(u.id) === "partial" ? u.weight * 0.6 : 0),
    0,
  );
  const precision = attemptedW ? (correctW / attemptedW) * 100 : 0;

  let numbersScore = coverage(numericAndDates, status);
  if (numbersScore !== null) numbersScore -= errors.filter((e) => e.category !== "idea").length * 5;

  const fl = fluencyStats(transcript, response.durationSec);
  let fluency: number | null = null;
  const fluencyNotes: string[] = [];
  if (response.durationSec && response.transcriptionSource !== "typed" && fl.words > 0) {
    let f = 100;
    const fillerRate = fl.fillers / Math.max(1, fl.words);
    f -= Math.min(30, fillerRate * 400);
    f -= Math.min(30, fl.restarts * 6);
    if (fl.wpm !== null && fl.wpm < 80) f -= Math.min(25, (80 - fl.wpm) * 0.6);
    if (fl.wpm !== null && fl.wpm > 185) f -= Math.min(20, (fl.wpm - 185) * 0.5);
    fluency = round(f);
    if (fl.fillers > 2) fluencyNotes.push(`${fl.fillers} filler sounds detected — try a short silent pause instead.`);
    if (fl.restarts > 1) fluencyNotes.push(`${fl.restarts} restarts or self-corrections affected flow.`);
    if (fl.wpm !== null && fl.wpm < 80) fluencyNotes.push(`Delivery pace was slow (${fl.wpm} wpm).`);
    if (fl.wpm !== null && fl.wpm > 185) fluencyNotes.push(`Delivery pace was very fast (${fl.wpm} wpm); listeners may struggle.`);
    if (!fluencyNotes.length) fluencyNotes.push("Steady delivery with few hesitations.");
  } else {
    fluencyNotes.push("Fluency is not assessed for typed responses.");
  }
  if (response.firstSpeechOffsetSec != null) {
    fluencyNotes.push(`Décalage: first rendition about ${response.firstSpeechOffsetSec.toFixed(1)} s after the source started.`);
  }

  const termScore = coverage(terms, status);
  const fidelity = round(100 - additions.reduce((a, x) => a + (x.severity === "minor" ? 8 : 15), 0));

  const scores: ScoreSet = {
    semanticAccuracy: respWords ? round(0.6 * precision + 0.4 * all) : 0,
    informationRetention: details.length ? round(coverage(details, status) ?? 0) : null,
    completeness: ideas.length ? round(coverage(ideas, status) ?? 0) : round(all),
    fidelity: respWords ? fidelity : null,
    numbersDates: numbersScore === null ? null : round(numbersScore),
    terminology: termScore === null ? null : round(termScore),
    fluency,
  };

  const weights: Record<keyof ScoreSet, number> = {
    semanticAccuracy: 0.25,
    completeness: 0.2,
    informationRetention: 0.15,
    numbersDates: 0.15,
    terminology: 0.1,
    fidelity: 0.1,
    fluency: 0.05,
  };
  let wSum = 0;
  let total = 0;
  for (const [k, w] of Object.entries(weights) as [keyof ScoreSet, number][]) {
    const v = scores[k];
    if (v === null) continue;
    total += v * w;
    wSum += w;
  }
  const overallScore = round(wSum ? total / wSum : 0);

  const omissions = exercise.units
    .filter((u) => status.get(u.id) === "omitted")
    .sort((a, b) => b.weight - a.weight)
    .map((u) => ({ content: u.label, category: u.category, severity: sev(u.weight) }));

  const partials = exercise.units.filter((u) => status.get(u.id) === "partial");
  const strengths: string[] = [];
  const conveyedDetails = details.filter((u) => status.get(u.id) === "conveyed");
  if (conveyedDetails.length >= 3) strengths.push(`Retained ${conveyedDetails.length} of ${details.length} specific details.`);
  if ((scores.completeness ?? 0) >= 80) strengths.push("Main ideas were consistently present.");
  if (!additions.length && respWords) strengths.push("No unsupported additions detected.");
  if (fluency !== null && fluency >= 85) strengths.push("Fluent, steady delivery.");

  // Probes (information retention)
  let probeResults: Evaluation["probeResults"];
  if (exercise.probes?.length && response.probeAnswers?.length) {
    probeResults = exercise.probes.map((p) => {
      const unit = exercise.units.find((u) => u.id === p.unitId)!;
      const answer = response.probeAnswers?.find((a) => a.unitId === p.unitId)?.answer ?? "";
      const at = tokenize(answer);
      let correct = false;
      if (unit.value !== undefined) correct = numbersIn(at).some((n) => approxEqual(n, unit.value!));
      else correct = (cueScore(unit.cues.en, at) ?? 0) >= 1 || (cueScore(unit.cues.es, at) ?? 0) >= 1;
      return { unitId: p.unitId, question: p.question.en, answer, correct, expected: unit.label };
    });
  }

  const summaryParts = [
    respWords === 0
      ? "No rendition was captured, so nothing could be evaluated."
      : `About ${Math.round(all)}% of the weighted meaning units were conveyed.`,
  ];
  if (omissions.length) summaryParts.push(`${omissions.length} unit(s) omitted, ${omissions.filter((o) => o.severity === "critical").length} of them critical.`);
  if (errors.length) summaryParts.push(`${errors.length} detail(s) rendered incorrectly.`);
  if (partials.length) summaryParts.push(`${partials.length} idea(s) only partly conveyed.`);

  return {
    mode: "heuristic-demo",
    provider: "demo-heuristic",
    overallScore,
    scores,
    summary: summaryParts.join(" "),
    unitResults: exercise.units.map((u) => ({ unitId: u.id, status: status.get(u.id)!, note: notes.get(u.id) })),
    omissions,
    errors,
    additions,
    acceptableVariations: [],
    fluency: { wordsPerMinute: fl.wpm, fillerCount: fl.fillers, restarts: fl.restarts, notes: fluencyNotes },
    strengths,
    recommendations: recommendFromScores(scores, exercise.config),
    probeResults,
    disclaimer: `${DISCLAIMER} Demo mode: concept-matching against annotated meaning units, not AI semantic evaluation.`,
    generatedAt: new Date().toISOString(),
  };
}
