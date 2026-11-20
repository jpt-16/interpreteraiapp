"use client";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { useData } from "@/lib/data/store";
import { buildExercise, configFromParams, estimateDuration, speechRateFor } from "@/lib/exercises/builder";
import { getScenario } from "@/lib/exercises/scenarios";
import type { Exercise, ExerciseConfig, MeaningUnit } from "@/lib/types";
import { ExerciseRunner } from "./ExerciseRunner";
import { planFromExercise, planFromScenario, type ExercisePlan } from "./plan";

interface GeneratedPassage {
  title: string;
  context: string;
  segments: { text: string; units: MeaningUnit[] }[];
}

async function fetchAiExercise(config: ExerciseConfig, rateMultiplier: number): Promise<Exercise | null> {
  try {
    const res = await fetch("/api/passages/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) return null;
    const p = (await res.json()) as GeneratedPassage;
    const segments = p.segments.map((s) => s.text);
    const text = segments.join(" ");
    const wordCount = text.split(/\s+/).length;
    const rate = speechRateFor(config, rateMultiplier);
    return {
      id: `ai-${Date.now()}`,
      config,
      title: p.title,
      context: p.context,
      segments,
      text,
      units: p.segments.flatMap((s) => s.units),
      wordCount,
      speechRate: rate,
      estimatedDurationSec: estimateDuration(wordCount, config.sourceLang, rate),
      origin: "ai",
    };
  } catch {
    return null;
  }
}

export function ExerciseLoader() {
  const params = useSearchParams();
  const { ready, prefs, sessions } = useData();
  const [plan, setPlan] = useState<ExercisePlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    const config = configFromParams(new URLSearchParams(params.toString()));
    if (!config) {
      setInvalid(true);
      return;
    }
    if (config.type === "dialogue") {
      const scenario = getScenario(config.scenarioId);
      if (!scenario) return setInvalid(true);
      setPlan(planFromScenario(scenario, prefs.speechRateMultiplier));
      return;
    }
    if (config.contentSource === "ai") {
      const ai = await fetchAiExercise(config, prefs.speechRateMultiplier);
      if (ai) {
        setPlan(planFromExercise(ai));
        return;
      }
      setNotice("AI passage generation is unavailable, so a curated passage was used instead.");
    }
    const recentIds = sessions.slice(0, 5).map((s) => s.exerciseTitle);
    const exercise = buildExercise(
      { ...config, contentSource: config.contentSource === "ai" ? (config.type === "info-retention" ? "generated" : "library") : config.contentSource },
      { rateMultiplier: prefs.speechRateMultiplier, avoidPassageIds: recentIds },
    );
    setPlan(planFromExercise(exercise));
  }, [params, prefs.speechRateMultiplier, sessions]);

  useEffect(() => {
    if (!ready) return;
    setPlan(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, nonce, params]);

  if (invalid)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-ink-2">This exercise link is not valid.</p>
        <ButtonLink href="/practice">Go to Practice Center</ButtonLink>
      </div>
    );

  if (!plan)
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-[13px] text-muted">
        <Loader2 size={16} className="animate-spin" /> Preparing exercise…
      </div>
    );

  return (
    <>
      {notice && <div className="border-b border-warn/25 bg-warn-soft px-4 py-2 text-center text-[12.5px] text-warn">{notice}</div>}
      <ExerciseRunner key={`${plan.id}-${nonce}`} plan={plan} onRestart={() => setNonce((n) => n + 1)} />
    </>
  );
}
