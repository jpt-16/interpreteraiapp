import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeWeaknesses } from "../src/lib/coach/analyze";
import { getSampleSessions } from "../src/lib/data/sample";
import { evaluateHeuristic } from "../src/lib/eval/heuristic";
import { numbersIn, tokenize } from "../src/lib/eval/text";
import { buildExercise } from "../src/lib/exercises/builder";
import { LIBRARY } from "../src/lib/exercises/library";
import type { ExerciseConfig, Lang } from "../src/lib/types";

const cfg = (over: Partial<ExerciseConfig> = {}): ExerciseConfig => ({
  type: "consecutive",
  sourceLang: "en",
  targetLang: "es",
  difficulty: 3,
  subject: "business",
  length: "long",
  contentSource: "library",
  ...over,
});

describe("number normalisation", () => {
  it("parses spelled-out Spanish numbers, decimals and scales", () => {
    const nums = numbersIn(tokenize("cuarenta y ocho coma seis millones y doscientos treinta y cinco", "es"));
    assert.ok(nums.includes(48_600_000));
    assert.ok(nums.includes(235));
  });
  it("parses English numbers, ordinals and times", () => {
    const nums = numbersIn(tokenize("a hundred and twelve on March twelfth at 10:30", "en"));
    assert.ok(nums.includes(112));
    assert.ok(nums.includes(12));
    assert.ok(nums.includes(10.3));
  });
  it("applies a shared scale to ranges", () => {
    const nums = numbersIn(tokenize("between 190 and 195 million", "en"));
    assert.ok(nums.includes(190_000_000) && nums.includes(195_000_000));
  });
  it("does not read 'por ciento' or English 'once' as numbers", () => {
    assert.deepEqual(numbersIn(tokenize("doce por ciento", "es")), [12]);
    assert.deepEqual(numbersIn(tokenize("I spoke with him once", "en")), []);
  });
});

describe("heuristic evaluator", () => {
  it("scores a faithful rendition of every library passage highly, in both directions", () => {
    for (const p of LIBRARY) {
      for (const [src, tgt] of [["en", "es"], ["es", "en"]] as [Lang, Lang][]) {
        const c = cfg({ subject: p.subject, difficulty: p.difficulty, sourceLang: src, targetLang: tgt });
        const ex = buildExercise(c, { seed: 0 });
        if (!ex.title.startsWith(p.title[src])) continue;
        const mirror = buildExercise({ ...c, sourceLang: tgt }, { seed: 0 });
        const e = evaluateHeuristic({ exercise: ex, response: { transcript: mirror.text, durationSec: 60, transcriptionSource: "browser" } });
        assert.ok(e.overallScore >= 90, `${p.id} ${src}->${tgt}: ${e.overallScore} omitted ${e.omissions.map((o) => o.content)}`);
        assert.equal(e.additions.length, 0, `${p.id} ${src}->${tgt} additions: ${e.additions.map((a) => a.rendered)}`);
      }
    }
  });

  it("flags a changed figure as a distortion, not an omission", () => {
    const ex = buildExercise(cfg({ subject: "medical", difficulty: 2, length: "short" }), { seed: 0 });
    const e = evaluateHeuristic({
      exercise: ex,
      response: { transcript: "Siga con la amoxicilina, 500 miligramos tres veces al día durante 7 días más.", durationSec: 20, transcriptionSource: "typed" },
    });
    assert.ok(e.errors.some((er) => er.rendered === "7"));
    assert.equal(e.scores.fluency, null, "typed responses are not scored for fluency");
  });

  it("flags unsupported numbers as additions", () => {
    const ex = buildExercise(cfg({ length: "short" }), { seed: 0 });
    const e = evaluateHeuristic({
      exercise: ex,
      response: { transcript: "Los ingresos fueron de 48,6 millones, un 12 por ciento más, y el 70 por ciento vino de Brasil.", durationSec: 20, transcriptionSource: "browser" },
    });
    assert.ok(e.additions.some((a) => a.rendered === "70"));
  });

  it("never penalises paraphrase of the same concept", () => {
    const ex = buildExercise(cfg({ subject: "community", difficulty: 1, sourceLang: "en", targetLang: "en", type: "memory", length: "short" }), { seed: 0 });
    const literal = evaluateHeuristic({ exercise: ex, response: { transcript: ex.text, durationSec: 30, transcriptionSource: "browser" } });
    const paraphrase = evaluateHeuristic({
      exercise: ex,
      response: {
        transcript:
          "From next Monday school starts at 8:15 rather than 8. Buses will come fifteen minutes later. Breakfast stays free for all kids, served in the cafeteria from 7:45. If your child is sick or will miss school, call the office before 9. The next parent meeting is November 18 with interpreters in Spanish and Vietnamese.",
        durationSec: 30,
        transcriptionSource: "browser",
      },
    });
    assert.ok(paraphrase.overallScore >= literal.overallScore - 10, `${paraphrase.overallScore} vs ${literal.overallScore}`);
  });
});

describe("coach", () => {
  it("derives recurring weaknesses from history", () => {
    const w = analyzeWeaknesses(getSampleSessions());
    assert.ok(w.length > 0);
    assert.ok(w.every((x) => x.recommendation.config.type));
  });
  it("needs at least three sessions before coaching", () => {
    assert.deepEqual(analyzeWeaknesses(getSampleSessions().slice(0, 2)), []);
  });
});
