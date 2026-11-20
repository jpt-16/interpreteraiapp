import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { buildExercise, configFromRecord, estimateDuration, speechRateFor } from "@/lib/exercises/builder";
import { planFromExercise, planFromScenario, type ExercisePlan } from "@/lib/exercises/plan";
import { getScenario } from "@/lib/exercises/scenarios";
import type { Exercise, ExerciseConfig } from "@/lib/types";
import { generatePassage } from "~/data/api";
import { useData } from "~/data/store";
import { ExerciseRunner } from "~/exercise/Runner";
import { useColors } from "~/theme/theme";
import { Button } from "~/ui/Button";
import { Text } from "~/ui/Text";

async function aiExercise(config: ExerciseConfig, multiplier: number): Promise<Exercise | null> {
  const p = await generatePassage(config);
  if (!p) return null;
  const segments = p.segments.map((s) => s.text);
  const text = segments.join(" ");
  const wordCount = text.split(/\s+/).length;
  const rate = speechRateFor(config, multiplier);
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
}

export default function ExerciseScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { ready, prefs, sessions } = useData();
  const c = useColors();
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; plan: ExercisePlan | null; notice: string | null } | null>(null);
  const key = `${nonce}|${JSON.stringify(params)}`;

  const build = useCallback(async () => {
    const config = configFromRecord(params as Record<string, string>);
    if (!config) return { plan: null, notice: null };
    if (config.type === "dialogue") {
      const s = getScenario(config.scenarioId);
      return { plan: s ? planFromScenario(s, prefs.speechRateMultiplier) : null, notice: null };
    }
    let notice: string | null = null;
    if (config.contentSource === "ai") {
      const ai = await aiExercise(config, prefs.speechRateMultiplier);
      if (ai) return { plan: planFromExercise(ai), notice: null };
      notice = "AI passage generation is unavailable, so a curated passage was used instead.";
    }
    const recent = sessions.slice(0, 5).map((s) => s.exerciseTitle);
    const exercise = buildExercise(
      { ...config, contentSource: config.contentSource === "ai" ? (config.type === "info-retention" ? "generated" : "library") : config.contentSource },
      { rateMultiplier: prefs.speechRateMultiplier, avoidPassageIds: recent },
    );
    return { plan: planFromExercise(exercise), notice };
  }, [params, prefs.speechRateMultiplier, sessions]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    build().then((r) => !cancelled && setLoaded({ key, ...r }));
    return () => {
      cancelled = true;
    };
    // Rebuild only when the request (params or "new passage") changes, not when history updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  if (!loaded || loaded.key !== key)
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator />
        <Text variant="subheadline" tone="secondary">
          Preparing exercise…
        </Text>
      </View>
    );

  if (!loaded.plan)
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <Text variant="headline">This exercise link is not valid.</Text>
        <Button title="Close" fullWidth={false} onPress={() => router.back()} />
      </View>
    );

  return <ExerciseRunner key={key} plan={loaded.plan} banner={loaded.notice} onRestart={() => setNonce((n) => n + 1)} />;
}
