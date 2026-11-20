import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { estimateDuration, normalizeConfig, speechRateFor, wordBudget } from "@/lib/exercises/builder";
import { AUDIO_LENGTH, DIFFICULTY, EXERCISE_TYPES, LANGUAGES, otherLang, SUBJECTS } from "@/lib/exercises/catalog";
import type { AudioLength, Difficulty, ExerciseConfig, ExerciseType, Lang, Subject } from "@/lib/types";
import { useData } from "~/data/store";
import { useColors } from "~/theme/theme";
import { Button } from "~/ui/Button";
import { Card, Chips, Segmented } from "~/ui/Controls";
import type { IconName } from "~/ui/Icon";
import { Row } from "~/ui/Row";
import { Screen, Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { startExercise } from "~/ui/helpers";

const TYPES: { type: Exclude<ExerciseType, "dialogue">; icon: IconName }[] = [
  { type: "memory", icon: "memory" },
  { type: "consecutive", icon: "mic" },
  { type: "simultaneous", icon: "headphones" },
  { type: "info-retention", icon: "number" },
];

export default function PracticeScreen() {
  const { ready } = useData();
  if (!ready) return <Screen><View /></Screen>;
  return <Configurator />;
}

function Configurator() {
  const { prefs, status } = useData();
  const c = useColors();
  const [config, setConfig] = useState<ExerciseConfig>(() => ({
    type: "consecutive",
    sourceLang: prefs.defaultSourceLang,
    targetLang: otherLang(prefs.defaultSourceLang),
    difficulty: 2,
    subject: "medical",
    length: "medium",
    contentSource: "library",
  }));
  const aiLive = Boolean(status?.passageGeneration.live);
  const sttLive = Boolean(status?.stt.live);

  const set = (patch: Partial<ExerciseConfig>) => setConfig((p) => normalizeConfig({ ...p, ...patch }));
  const setSource = (lang: Lang) => setConfig((p) => normalizeConfig({ ...p, sourceLang: lang, targetLang: p.type === "memory" ? lang : otherLang(lang) }));
  const setType = (type: ExerciseType) =>
    setConfig((p) =>
      normalizeConfig({
        ...p,
        type,
        targetLang: type === "memory" ? p.sourceLang : otherLang(p.sourceLang),
        contentSource: type === "info-retention" ? "generated" : p.contentSource === "generated" ? "library" : p.contentSource,
      }),
    );

  const rate = speechRateFor(config, prefs.speechRateMultiplier);
  const words = wordBudget(config);
  const seconds = Math.round(estimateDuration(words, config.sourceLang, rate) / 5) * 5;
  const begin = () => startExercise(config);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Text variant="body" tone="accent" weight="600" onPress={begin} accessibilityRole="button" accessibilityLabel="Start exercise" style={{ paddingHorizontal: 4 }}>
              Start
            </Text>
          ),
        }}
      />

      <Section title="Exercise" footer={EXERCISE_TYPES[config.type].description}>
        {TYPES.map(({ type, icon }) => (
          <Row
            key={type}
            icon={icon}
            title={EXERCISE_TYPES[type].label}
            subtitle={
              type === "simultaneous" && !sttLive ? "Needs voice transcription (see Settings → Services)" : EXERCISE_TYPES[type].skills.slice(0, 3).join(" · ")
            }
            selected={config.type === type}
            onPress={() => setType(type)}
          />
        ))}
      </Section>

      <Section title="Languages">
        <Card>
          <Text variant="footnote" tone="secondary">
            Source
          </Text>
          <Segmented
            label="Source language"
            value={config.sourceLang}
            onChange={setSource}
            options={(Object.keys(LANGUAGES) as Lang[]).map((l) => ({ value: l, label: LANGUAGES[l].label }))}
          />
          <Text variant="footnote" tone="secondary">
            {config.type === "memory" ? "Target (same language for memory work)" : "Target"}
          </Text>
          <Segmented
            label="Target language"
            value={config.targetLang}
            onChange={(l: Lang) => set({ targetLang: l })}
            options={(Object.keys(LANGUAGES) as Lang[]).map((l) => ({
              value: l,
              label: LANGUAGES[l].label,
              disabled: config.type === "memory" ? l !== config.sourceLang : l === config.sourceLang,
            }))}
          />
        </Card>
      </Section>

      <Section title="Difficulty" footer={`Level ${config.difficulty} · ${DIFFICULTY[config.difficulty].label}: ${DIFFICULTY[config.difficulty].description}. Higher levels raise speed, length and information density together.`}>
        <Card>
          <Segmented
            label="Difficulty"
            value={config.difficulty}
            onChange={(d: Difficulty) => set({ difficulty: d })}
            options={([1, 2, 3, 4, 5] as Difficulty[]).map((d) => ({ value: d, label: String(d) }))}
          />
        </Card>
      </Section>

      <Section title="Subject matter" footer={SUBJECTS[config.subject].description}>
        <Card>
          <Chips
            label="Subject matter"
            value={config.subject}
            onChange={(s: Subject) => set({ subject: s })}
            options={(Object.keys(SUBJECTS) as Subject[]).map((s) => ({ value: s, label: SUBJECTS[s].label }))}
          />
        </Card>
      </Section>

      <Section title="Audio" footer={aiLive ? undefined : "AI-written passages need the server's Gemini key (Settings → Services). Curated passages are always available."}>
        <Card>
          <Text variant="footnote" tone="secondary">
            Length
          </Text>
          <Segmented
            label="Audio length"
            value={config.length}
            onChange={(l: AudioLength) => set({ length: l })}
            options={(Object.keys(AUDIO_LENGTH) as AudioLength[]).map((l) => ({ value: l, label: `${AUDIO_LENGTH[l].label} · ${AUDIO_LENGTH[l].approx}` }))}
          />
          <Text variant="footnote" tone="secondary">
            Passage
          </Text>
          <Segmented
            label="Passage source"
            value={config.contentSource === "ai" ? "ai" : "standard"}
            onChange={(v: string) => set({ contentSource: v === "ai" ? "ai" : config.type === "info-retention" ? "generated" : "library" })}
            options={[
              { value: "standard", label: config.type === "info-retention" ? "Generated" : "Curated" },
              { value: "ai", label: "AI-written", disabled: !aiLive },
            ]}
          />
        </Card>
      </Section>

      <View style={{ gap: 12 }}>
        <Text variant="footnote" tone="secondary" style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
          {`≈ ${words} words · ≈ ${seconds} s · ${rate.toFixed(2)}× speech rate`}
        </Text>
        <Button title="Begin exercise" trailingIcon="arrow" onPress={begin} accessibilityHint="Opens the exercise in full screen" />
        <Text variant="caption1" style={{ textAlign: "center", color: c.tertiaryLabel }}>
          Headphones recommended. Your microphone is only used during the rendition step.
        </Text>
      </View>
    </Screen>
  );
}
