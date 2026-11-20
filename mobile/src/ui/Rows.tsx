import { router } from "expo-router";
import { View } from "react-native";
import { EXERCISE_TYPES, langPairLabel, SUBJECTS } from "@/lib/exercises/catalog";
import type { ExerciseConfig, PracticeSession, Weakness } from "@/lib/types";
import { useColors } from "~/theme/theme";
import { Badge } from "./Controls";
import { Row } from "./Row";
import { ScorePill } from "./Score";
import { Text } from "./Text";
import { formatDate, startExercise } from "./helpers";

export function SessionRow({ session }: { session: PracticeSession }) {
  const s = session;
  return (
    <Row
      onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.id } })}
      title={
        <View style={{ gap: 4 }}>
          <Text variant="body" numberOfLines={2}>
            {s.exerciseTitle}
          </Text>
          {s.isSample ? (
            <Badge tone="warn">Sample data</Badge>
          ) : null}
        </View>
      }
      subtitle={`${EXERCISE_TYPES[s.config.type].short} · ${s.config.type === "dialogue" ? "EN ⇄ ES" : langPairLabel(s.config.sourceLang, s.config.targetLang)} · ${SUBJECTS[s.config.subject].label} · ${formatDate(s.createdAt)}`}
      trailing={<ScorePill score={s.evaluation.overallScore} />}
      chevron
      accessibilityHint="Opens the full feedback for this session"
    />
  );
}

export function WeaknessRow({ weakness, base }: { weakness: Weakness; base: ExerciseConfig }) {
  const c = useColors();
  const w = weakness;
  const trend = { improving: "Improving", stable: "Stable", worsening: "Worsening" }[w.trend];
  return (
    <Row
      onPress={() => startExercise({ ...base, ...w.recommendation.config } as ExerciseConfig)}
      title={
        <View style={{ gap: 4 }}>
          <Text variant="body" numberOfLines={2}>
            {w.label}
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Badge tone={w.severity === "high" ? "bad" : w.severity === "medium" ? "warn" : "neutral"}>
              {w.severity === "high" ? "High priority" : w.severity === "medium" ? "Medium" : "Low"}
            </Badge>
            <Badge tone={w.trend === "improving" ? "good" : w.trend === "worsening" ? "bad" : "neutral"}>{trend}</Badge>
          </View>
        </View>
      }
      subtitle={`${w.description} Next: ${w.recommendation.title}.`}
      chevron
      iconTint={c.accent}
      accessibilityHint="Starts the recommended exercise"
    />
  );
}
