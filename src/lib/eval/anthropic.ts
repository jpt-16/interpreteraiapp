import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { evalModel } from "@/lib/config/env";
import { LANGUAGES, EXERCISE_TYPES } from "@/lib/exercises/catalog";
import type { Difficulty, Evaluation, ExerciseType, Recommendation, ScoreSet } from "@/lib/types";
import { recommendFromScores } from "@/lib/coach/recommend";
import { evaluateHeuristic } from "./heuristic";
import { DISCLAIMER, type EvaluationRequest } from "./types";

const category = z.enum(["idea", "number", "date", "name", "quantity", "term"]);
const severity = z.enum(["minor", "major", "critical"]);

const EvaluationSchema = z.object({
  unit_results: z.array(
    z.object({
      unit_id: z.string(),
      status: z.enum(["conveyed", "partial", "omitted", "distorted"]),
      note: z.string(),
    }),
  ),
  scores: z.object({
    semantic_accuracy: z.number(),
    information_retention: z.number().nullable(),
    completeness: z.number(),
    fidelity: z.number(),
    numbers_dates: z.number().nullable(),
    terminology: z.number().nullable(),
  }),
  omissions: z.array(z.object({ content: z.string(), category, severity })),
  errors: z.array(
    z.object({ source: z.string(), rendered: z.string(), explanation: z.string(), category, severity }),
  ),
  additions: z.array(z.object({ rendered: z.string(), explanation: z.string(), severity })),
  acceptable_variations: z.array(z.object({ source: z.string(), rendered: z.string(), note: z.string() })),
  delivery_notes: z.array(z.string()),
  strengths: z.array(z.string()),
  summary: z.string(),
  recommendations: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      exercise_type: z.enum(["memory", "consecutive", "simultaneous", "info-retention"]),
      shorter_passages: z.boolean(),
      lower_difficulty: z.boolean(),
    }),
  ),
});

const SYSTEM_PROMPT = `You are a senior interpreter trainer reviewing a practice rendition. Your users are working interpreters and advanced trainees who already speak both languages; they are training listening, retention, analysis and delivery, not learning a language.

Judge meaning, not wording. Interpreting is not word-for-word translation: reordering, condensing redundant phrasing, register-appropriate reformulation and natural target-language idiom are acceptable and must not be penalised. List notable cases of these under acceptable_variations so the trainee learns what was fine.

Treat the following as genuine errors:
- omissions of information the speaker gave (rate severity by how much the listener loses);
- distortions: changed facts, wrong figures, wrong dates, wrong names, reversed negation, changed modality (must/may), changed attribution or causality;
- unsupported additions: information, opinion, explanation or certainty the speaker did not express;
- incorrect or approximate domain terminology where an established equivalent exists.

Numbers, dates, names and quantities must be exact; a near miss is a distortion. Different formatting of the same value (e.g. "48,6 millones" vs "48.6 million", "10:30" vs "half past ten") is correct.

The rendition comes from automatic speech recognition and may contain recognition artefacts (homophones, missing punctuation, split words). Do not penalise obvious transcription artefacts when the intended word is clear from sound and context; never use this to excuse a wrong figure.

You are given annotated meaning units for the source. Assign each unit exactly one status: conveyed, partial, omitted or distorted, with a short note. Also report errors or additions outside the units.

Score each dimension 0-100, where 100 means no issues in that dimension:
- semantic_accuracy: correctness of what was rendered;
- information_retention: retention of specific details (names, figures, terms); null if the passage has none;
- completeness: absence of omissions of the speaker's points;
- fidelity: absence of unsupported additions;
- numbers_dates: exactness of numbers, dates and quantities; null if the passage has none;
- terminology: correct domain terms; null if the passage has no domain terms.

Keep explanations specific, concise and professional. Quote the rendition where useful. Recommendations must be concrete follow-up exercises. Never present the result as an official assessment or certification.`;

function buildUserPrompt(req: EvaluationRequest) {
  const { exercise, response } = req;
  const typeInfo = EXERCISE_TYPES[exercise.config.type];
  const src = LANGUAGES[exercise.config.sourceLang].label;
  const tgt = LANGUAGES[exercise.config.targetLang].label;
  const units = exercise.units
    .map((u) => `- ${u.id} [${u.category}, weight ${u.weight}]: ${u.label}${u.value !== undefined ? ` (value ${u.value})` : ""}`)
    .join("\n");
  const glossary = req.glossary?.length
    ? `\n<trainee_glossary>\n${req.glossary.map((g) => `${g.source} = ${g.target}`).join("\n")}\n</trainee_glossary>\nPrefer the trainee's glossary equivalents when judging terminology.`
    : "";
  return `<exercise>
Type: ${typeInfo.label} — ${typeInfo.description}
Language direction: ${src} → ${tgt}${exercise.config.sourceLang === exercise.config.targetLang ? " (same-language reproduction)" : ""}
Subject: ${exercise.config.subject}; difficulty ${exercise.config.difficulty}/5
Title: ${exercise.title}
Context: ${exercise.context ?? ""}
</exercise>

<source_speech language="${src}">
${exercise.text}
</source_speech>

<meaning_units>
${units}
</meaning_units>
${glossary}

<rendition language="${tgt}" transcription="${response.transcriptionSource}" duration_seconds="${response.durationSec ?? "unknown"}">
${response.transcript || "(empty — nothing was captured)"}
</rendition>

Evaluate the rendition.`;
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export async function evaluateWithClaude(req: EvaluationRequest): Promise<Evaluation> {
  const model = evalModel();
  const effort = (process.env.ANTHROPIC_EVAL_EFFORT as "low" | "medium" | "high" | "xhigh" | "max" | undefined) ?? "high";

  const response = await getClient().beta.messages.parse({
    model,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    output_config: { effort, format: betaZodOutputFormat(EvaluationSchema) },
    messages: [{ role: "user", content: buildUserPrompt(req) }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Evaluation model returned no structured result (stop_reason: ${response.stop_reason}).`);
  }
  const out = response.parsed_output;

  // Fluency is measured from timing and transcript statistics, not by the model.
  const heuristic = evaluateHeuristic(req);
  const clamp = (n: number | null) => (n === null ? null : Math.round(Math.max(0, Math.min(100, n))));

  const scores: ScoreSet = {
    semanticAccuracy: clamp(out.scores.semantic_accuracy),
    informationRetention: clamp(out.scores.information_retention),
    completeness: clamp(out.scores.completeness),
    fidelity: clamp(out.scores.fidelity),
    numbersDates: clamp(out.scores.numbers_dates),
    terminology: clamp(out.scores.terminology),
    fluency: heuristic.scores.fluency,
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
  let total = 0;
  let wSum = 0;
  for (const [k, w] of Object.entries(weights) as [keyof ScoreSet, number][]) {
    const v = scores[k];
    if (v === null) continue;
    total += v * w;
    wSum += w;
  }

  const cfg = req.exercise.config;
  const recommendations: Recommendation[] = out.recommendations.length
    ? out.recommendations.slice(0, 3).map((r) => ({
        title: r.title,
        reason: r.reason,
        config: {
          type: r.exercise_type as ExerciseType,
          subject: cfg.subject,
          difficulty: (r.lower_difficulty ? Math.max(1, cfg.difficulty - 1) : cfg.difficulty) as Difficulty,
          length: r.shorter_passages ? (cfg.length === "long" ? "medium" : "short") : cfg.length,
        },
      }))
    : recommendFromScores(scores, cfg);

  const knownIds = new Set(req.exercise.units.map((u) => u.id));
  return {
    mode: "ai",
    provider: "anthropic",
    model: response.model,
    overallScore: Math.round(wSum ? total / wSum : 0),
    scores,
    summary: out.summary,
    unitResults: out.unit_results.filter((u) => knownIds.has(u.unit_id)).map((u) => ({ unitId: u.unit_id, status: u.status, note: u.note })),
    omissions: out.omissions,
    errors: out.errors,
    additions: out.additions,
    acceptableVariations: out.acceptable_variations,
    fluency: {
      ...heuristic.fluency,
      notes: [...heuristic.fluency.notes, ...out.delivery_notes].slice(0, 6),
    },
    strengths: out.strengths,
    recommendations,
    probeResults: heuristic.probeResults,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}
