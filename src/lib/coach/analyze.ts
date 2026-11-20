import { SUBJECTS } from "@/lib/exercises/catalog";
import type { Difficulty, ExerciseConfig, PracticeSession, Recommendation, ScoreKey, Subject, Weakness } from "@/lib/types";

/**
 * Personalised performance coach.
 * Looks across the user's history for recurring patterns (not one-off bad
 * sessions) and turns them into targeted follow-up exercises.
 */

const WINDOW = 25;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const vals = (ss: PracticeSession[], k: ScoreKey) =>
  ss.map((s) => s.evaluation.scores[k]).filter((v): v is number => typeof v === "number");

function trendOf(ss: PracticeSession[], k: ScoreKey): Weakness["trend"] {
  const chrono = [...ss].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const v = vals(chrono, k);
  if (v.length < 4) return "stable";
  const half = Math.floor(v.length / 2);
  const diff = avg(v.slice(half)) - avg(v.slice(0, half));
  return diff > 5 ? "improving" : diff < -5 ? "worsening" : "stable";
}

function span(ss: PracticeSession[]) {
  const sorted = ss.map((s) => s.createdAt).sort();
  return { firstSeen: sorted[0], lastSeen: sorted[sorted.length - 1] };
}

/** Approximate number of name units seen in a session (from omissions + retention coverage). */
function countNames(s: PracticeSession) {
  const omitted = s.evaluation.omissions.filter((o) => o.category === "name").length;
  // Sessions record unit statuses but not categories, so estimate from the share of detail units.
  return Math.max(omitted, Math.round(s.unitCount * 0.18));
}

const severityFor = (gap: number): Weakness["severity"] => (gap >= 20 ? "high" : gap >= 10 ? "medium" : "low");
const isLong = (s: PracticeSession) => s.config.length !== "short" || s.wordCount > 110;

export function analyzeWeaknesses(sessions: PracticeSession[]): Weakness[] {
  const recent = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, WINDOW);
  if (recent.length < 3) return [];
  const out: Weakness[] = [];
  const base = recent[0].config;

  // 1. Numbers & dates, especially in long passages
  const num = recent.filter((s) => s.evaluation.scores.numbersDates !== null);
  const numAvg = avg(vals(num, "numbersDates"));
  if (num.length >= 3 && numAvg < 75) {
    const longAvg = avg(vals(num.filter(isLong), "numbersDates"));
    const shortAvg = avg(vals(num.filter((s) => !isLong(s)), "numbersDates"));
    const lengthEffect = Number.isFinite(longAvg) && Number.isFinite(shortAvg) && shortAvg - longAvg >= 10;
    out.push({
      key: "numbers-retention",
      label: lengthEffect ? "Numbers lost in long passages" : "Numbers and dates",
      description: lengthEffect
        ? `Figures are retained well in short passages (${Math.round(shortAvg)}) but drop in longer ones (${Math.round(longAvg)}).`
        : "Figures, dates and quantities are frequently omitted or changed.",
      severity: severityFor(80 - numAvg),
      occurrences: num.filter((s) => (s.evaluation.scores.numbersDates ?? 100) < 75).length,
      evidence: `Average numbers & dates score ${Math.round(numAvg)} across ${num.length} recent sessions.`,
      trend: trendOf(num, "numbersDates"),
      ...span(num),
      recommendation: {
        title: "Numerical retention ladder",
        reason: lengthEffect
          ? "Detail-dense passages, starting short and extending once figures hold."
          : "Detail-dense passages that isolate figures and dates.",
        config: { type: "info-retention", length: lengthEffect ? "medium" : "short", subject: base.subject },
      },
    });
  }

  // 2. Omissions grow with passage length
  const shortC = avg(vals(recent.filter((s) => !isLong(s)), "completeness"));
  const longC = avg(vals(recent.filter(isLong), "completeness"));
  const compAvg = avg(vals(recent, "completeness"));
  if ((Number.isFinite(shortC) && Number.isFinite(longC) && shortC - longC >= 12) || compAvg < 70) {
    const gap = Number.isFinite(shortC) && Number.isFinite(longC) ? shortC - longC : 75 - compAvg;
    out.push({
      key: "length-endurance",
      label: "Omissions increase with length",
      description:
        Number.isFinite(longC) && Number.isFinite(shortC)
          ? `Completeness falls from ${Math.round(shortC)} on short passages to ${Math.round(longC)} on longer ones.`
          : "Main ideas are regularly omitted.",
      severity: severityFor(gap),
      occurrences: recent.filter((s) => (s.evaluation.scores.completeness ?? 100) < 70).length,
      evidence: `${recent.filter(isLong).length} longer passages reviewed.`,
      trend: trendOf(recent.filter(isLong), "completeness"),
      ...span(recent),
      recommendation: {
        title: "Progressive length: memory retention",
        reason: "Increase passage length one step at a time while holding completeness above 80.",
        config: { type: "memory", length: "medium", sourceLang: base.sourceLang },
      },
    });
  }

  // 3. Unsupported additions
  const fid = vals(recent, "fidelity");
  if (fid.length >= 3 && avg(fid) < 82) {
    out.push({
      key: "unsupported-additions",
      label: "Unsupported additions",
      description: "Renditions include information, explanation or certainty the speaker did not express.",
      severity: severityFor(90 - avg(fid)),
      occurrences: fid.filter((v) => v < 80).length,
      evidence: `Average fidelity ${Math.round(avg(fid))}.`,
      trend: trendOf(recent, "fidelity"),
      ...span(recent),
      recommendation: {
        title: "Fidelity focus: short consecutive",
        reason: "Short segments make it easier to render exactly what was said — nothing more.",
        config: { type: "consecutive", length: "short", subject: base.subject },
      },
    });
  }

  // 4. Terminology by subject
  const bySubject = new Map<Subject, PracticeSession[]>();
  for (const s of recent) {
    if (s.evaluation.scores.terminology === null) continue;
    bySubject.set(s.config.subject, [...(bySubject.get(s.config.subject) ?? []), s]);
  }
  for (const [subject, ss] of bySubject) {
    const t = avg(vals(ss, "terminology"));
    if (ss.length >= 2 && t < 70) {
      out.push({
        key: `terminology-${subject}`,
        label: `${SUBJECTS[subject].label} terminology`,
        description: `Domain terms in ${SUBJECTS[subject].label.toLowerCase()} material are often missing or approximated.`,
        severity: severityFor(78 - t),
        occurrences: ss.length,
        evidence: `Average terminology score ${Math.round(t)} in ${ss.length} ${subject} sessions.`,
        trend: trendOf(ss, "terminology"),
        ...span(ss),
        recommendation: {
          title: `${SUBJECTS[subject].label} glossary + consecutive`,
          reason: "Add key terms to your glossary, then practise in the same domain.",
          config: { type: "consecutive", subject },
        },
      });
    }
  }

  // 5. Proper names
  const nameOmissions = recent.flatMap((s) => s.evaluation.omissions.filter((o) => o.category === "name"));
  const nameUnits = recent.reduce((a, s) => a + countNames(s), 0);
  if (nameOmissions.length >= 3 && nameOmissions.length / Math.max(1, nameUnits) >= 0.3) {
    out.push({
      key: "proper-names",
      label: "Proper names",
      description: "Names of people, places and organisations are frequently dropped.",
      severity: nameOmissions.length >= 6 ? "high" : "medium",
      occurrences: nameOmissions.length,
      evidence: `${nameOmissions.length} names omitted in the last ${recent.length} sessions.`,
      trend: "stable",
      ...span(recent),
      recommendation: {
        title: "Information retention: names",
        reason: "Short, name-heavy briefings train anchoring names to roles.",
        config: { type: "info-retention", length: "short", subject: "legal" },
      },
    });
  }

  // 6. Delivery fluency
  const flu = vals(recent, "fluency");
  if (flu.length >= 3 && avg(flu) < 72) {
    out.push({
      key: "delivery-fluency",
      label: "Delivery fluency",
      description: "Fillers, restarts or uneven pace are affecting delivery.",
      severity: severityFor(80 - avg(flu)),
      occurrences: flu.filter((v) => v < 70).length,
      evidence: `Average fluency ${Math.round(avg(flu))}.`,
      trend: trendOf(recent, "fluency"),
      ...span(recent),
      recommendation: {
        title: "Short-segment delivery practice",
        reason: "Lower cognitive load frees attention for smooth, confident output.",
        config: { type: "consecutive", length: "short" },
      },
    });
  }

  // 7. Simultaneous processing load
  const simul = recent.filter((s) => s.config.type === "simultaneous");
  const consec = recent.filter((s) => s.config.type === "consecutive");
  if (simul.length >= 2 && consec.length >= 2) {
    const gap = avg(consec.map((s) => s.evaluation.overallScore)) - avg(simul.map((s) => s.evaluation.overallScore));
    if (gap >= 15) {
      const d = Math.max(1, Math.min(...simul.map((s) => s.config.difficulty)) - 1) as Difficulty;
      out.push({
        key: "simultaneous-load",
        label: "Simultaneous processing load",
        description: `Simultaneous scores trail consecutive by ${Math.round(gap)} points.`,
        severity: severityFor(gap),
        occurrences: simul.length,
        evidence: `${simul.length} simultaneous vs ${consec.length} consecutive sessions compared.`,
        trend: "stable",
        ...span(simul),
        recommendation: {
          title: "Simultaneous at reduced speed",
          reason: "Lower the speech rate to rebuild décalage control before increasing speed.",
          config: { type: "simultaneous", difficulty: d, length: "short" },
        },
      });
    }
  }

  // 8. Meaning distortions
  const sem = vals(recent, "semanticAccuracy");
  if (sem.length >= 3 && avg(sem) < 72) {
    out.push({
      key: "meaning-distortion",
      label: "Meaning distortions",
      description: "Parts of the message are rendered with changed meaning.",
      severity: severityFor(80 - avg(sem)),
      occurrences: sem.filter((v) => v < 70).length,
      evidence: `Average semantic accuracy ${Math.round(avg(sem))}.`,
      trend: trendOf(recent, "semanticAccuracy"),
      ...span(recent),
      recommendation: {
        title: "Analysis-first consecutive",
        reason: "Slower passages with emphasis on understanding before reformulating.",
        config: { type: "consecutive", difficulty: Math.max(1, base.difficulty - 1) as Difficulty },
      },
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity] || b.occurrences - a.occurrences);
}

/** Recommended next exercise, combining weaknesses with progression. */
export function recommendNext(sessions: PracticeSession[], weaknesses: Weakness[], fallback: ExerciseConfig): Recommendation & { config: ExerciseConfig } {
  const last = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const base: ExerciseConfig = last ? { ...last.config, scenarioId: undefined } : fallback;
  if (base.type === "dialogue") base.type = "consecutive";
  if (weaknesses.length) {
    const w = weaknesses[0];
    return { ...w.recommendation, config: { ...base, ...w.recommendation.config } as ExerciseConfig };
  }
  if (!last) {
    return {
      title: "Baseline: consecutive interpreting",
      reason: "Start with a medium-length consecutive passage to establish your baseline.",
      config: { ...fallback, type: "consecutive", length: "medium", difficulty: 2 },
    };
  }
  const lastThree = sessions
    .filter((s) => s.config.type === base.type)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const mean = avg(lastThree.map((s) => s.evaluation.overallScore));
  if (lastThree.length >= 3 && mean >= 85 && base.difficulty < 5) {
    return {
      title: "Step up difficulty",
      reason: `Your last three ${base.type} sessions averaged ${Math.round(mean)}. Time for faster, denser material.`,
      config: { ...base, difficulty: (base.difficulty + 1) as Difficulty },
    };
  }
  return {
    title: "Consolidate at this level",
    reason: "Keep building consistency before increasing difficulty.",
    config: base,
  };
}
