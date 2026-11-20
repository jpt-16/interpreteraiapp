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
import { planFromExercise, planFromScenario, type ExercisePlan } from "@/lib/exercises/plan";

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
  const [loaded, setLoaded] = useState<{ key: string; plan: ExercisePlan | null; notice: string | null } | null>(null);
  const [nonce, setNonce] = useState(0);
  const query = params.toString();
  const key = `${nonce}|${query}`;

  const build = useCallback(async (): Promise<{ plan: ExercisePlan | null; notice: string | null }> => {
    const config = configFromParams(new URLSearchParams(query));
    if (!config) return { plan: null, notice: null };
    if (config.type === "dialogue") {
      const scenario = getScenario(config.scenarioId);
      return { plan: scenario ? planFromScenario(scenario, prefs.speechRateMultiplier) : null, notice: null };
    }
    let notice: string | null = null;
    if (config.contentSource === "ai") {
      const ai = await fetchAiExercise(config, prefs.speechRateMultiplier);
      if (ai) return { plan: planFromExercise(ai), notice: null };
      notice = "AI passage generation is unavailable, so a curated passage was used instead.";
    }
    const recentTitles = sessions.slice(0, 5).map((s) => s.exerciseTitle);
    const exercise = buildExercise(
      { ...config, contentSource: config.contentSource === "ai" ? (config.type === "info-retention" ? "generated" : "library") : config.contentSource },
      { rateMultiplier: prefs.speechRateMultiplier, avoidPassageIds: recentTitles },
    );
    return { plan: planFromExercise(exercise), notice };
  }, [query, prefs.speechRateMultiplier, sessions]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    build().then((r) => {
      if (!cancelled) setLoaded({ key, ...r });
    });
    return () => {
      cancelled = true;
    };
    // Rebuild only when the request (params or "new passage") changes, not when history updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  if (!loaded || loaded.key !== key)
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-[13px] text-muted">
        <Loader2 size={16} className="animate-spin" /> Preparing exercise…
      </div>
    );

  if (!loaded.plan)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-ink-2">This exercise link is not valid.</p>
        <ButtonLink href="/practice">Go to Practice Center</ButtonLink>
      </div>
    );

  return (
    <>
      {loaded.notice && <div className="border-b border-warn/25 bg-warn-soft px-4 py-2 text-center text-[12.5px] text-warn">{loaded.notice}</div>}
      <ExerciseRunner key={key} plan={loaded.plan} onRestart={() => setNonce((n) => n + 1)} />
    </>
  );
}
