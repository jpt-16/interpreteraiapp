import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { buildPassagePrompt, PassageSchema, toPassage } from "../src/lib/exercises/ai-spec";
import { buildExercise } from "../src/lib/exercises/builder";
import { buildEvalPrompt, EvaluationSchema, toEvaluation, type GeminiEvaluation } from "../src/lib/eval/gemini-spec";
import { evaluateHeuristic } from "../src/lib/eval/heuristic";
import { paceInstruction, pcmToWav } from "../src/lib/speech/wav";
import type { ExerciseConfig } from "../src/lib/types";

const config: ExerciseConfig = {
  type: "consecutive", sourceLang: "en", targetLang: "es", difficulty: 3,
  subject: "business", length: "short", contentSource: "library",
};
const exercise = buildExercise(config, { seed: 0 });
const req = {
  exercise: { config, title: exercise.title, context: exercise.context, text: exercise.text, units: exercise.units, wordCount: exercise.wordCount },
  response: { transcript: "Los ingresos fueron de 48,6 millones.", durationSec: 20, transcriptionSource: "server" as const },
};

describe("gemini schemas", () => {
  const strip = (s: unknown): string => JSON.stringify(s);
  it("produce JSON Schema without nullable/anyOf constructs", () => {
    for (const schema of [EvaluationSchema, PassageSchema]) {
      const js = z.toJSONSchema(schema);
      assert.ok(!strip(js).includes('"anyOf"'), "anyOf found");
      assert.ok(!strip(js).includes('"null"'), "null type found");
    }
  });
});

describe("gemini evaluation mapping", () => {
  const out: GeminiEvaluation = {
    unit_results: [
      { unit_id: exercise.units[0].id, status: "conveyed", note: "ok" },
      { unit_id: "not-a-real-unit", status: "omitted", note: "ignored" },
    ],
    scores: { semantic_accuracy: 88, information_retention: 72, completeness: 140, fidelity: 95, numbers_dates: -1, terminology: -1 },
    omissions: [{ content: "Margin fell", category: "idea", severity: "major" }],
    errors: [], additions: [], acceptable_variations: [{ source: "revenue", rendered: "ingresos", note: "fine" }],
    delivery_notes: ["Steady pace"], strengths: ["Accurate figures"], summary: "Good.",
    recommendations: [{ title: "More numbers", reason: "r", exercise_type: "info-retention", shorter_passages: true, lower_difficulty: true }],
  };
  const e = toEvaluation(out, req, evaluateHeuristic(req), "gemini-test");

  it("maps -1 to null, clamps scores and drops unknown unit ids", () => {
    assert.equal(e.scores.numbersDates, null);
    assert.equal(e.scores.terminology, null);
    assert.equal(e.scores.completeness, 100);
    assert.equal(e.unitResults.length, 1);
  });
  it("computes the overall score from applicable dimensions only", () => {
    assert.ok(e.overallScore > 70 && e.overallScore <= 100);
    assert.equal(e.provider, "gemini");
    assert.equal(e.mode, "ai");
  });
  it("turns recommendations into runnable configs", () => {
    assert.equal(e.recommendations[0].config.type, "info-retention");
    assert.equal(e.recommendations[0].config.difficulty, 2);
    assert.equal(e.recommendations[0].config.length, "short");
  });
  it("keeps the disclaimer and builds a prompt that fences the rendition as data", () => {
    assert.match(e.disclaimer, /not an official assessment/i);
    assert.match(buildEvalPrompt(req), /<rendition[^>]*>[\s\S]*48,6 millones[\s\S]*<\/rendition>/);
  });
});

describe("passage mapping", () => {
  it("maps -1 values to undefined and clamps weights", () => {
    const p = toPassage({
      title: "t", context: "c",
      segments: [{ text: "x", units: [
        { category: "number", label: "n", weight: 9, value: 12, cues_en: "a", cues_es: "b" },
        { category: "idea", label: "i", weight: 0, value: -1, cues_en: "a", cues_es: "b" },
      ] }],
    });
    assert.equal(p.segments[0].units[0].weight, 3);
    assert.equal(p.segments[0].units[0].value, 12);
    assert.equal(p.segments[0].units[1].weight, 1);
    assert.equal(p.segments[0].units[1].value, undefined);
    assert.match(buildPassagePrompt(config), /Language: English/);
  });
});

describe("speech helpers", () => {
  it("wraps PCM in a valid 24 kHz mono WAV header", () => {
    const pcm = new Uint8Array(48000);
    const wav = pcmToWav(pcm);
    const v = new DataView(wav.buffer);
    assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF");
    assert.equal(String.fromCharCode(...wav.slice(8, 12)), "WAVE");
    assert.equal(v.getUint32(24, true), 24000);
    assert.equal(v.getUint16(22, true), 1);
    assert.equal(v.getUint32(40, true), 48000);
    assert.equal(wav.length, 44 + 48000);
  });
  it("maps speech rates to pacing instructions", () => {
    assert.match(paceInstruction(1.16), /fast/);
    assert.match(paceInstruction(0.9), /slow/);
    assert.match(paceInstruction(1), /natural/);
  });
});
