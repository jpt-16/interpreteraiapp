import { useMemo, useState } from "react";
import { View } from "react-native";
import { dailySeries, delta, formatDuration, metricMean, totals } from "@/lib/analytics/aggregate";
import { recommendNext } from "@/lib/coach/analyze";
import { AUDIO_LENGTH, DIFFICULTY, EXERCISE_TYPES, langPairLabel, SUBJECTS } from "@/lib/exercises/catalog";
import type { ExerciseConfig } from "@/lib/types";
import { useData } from "~/data/store";
import { useColors } from "~/theme/theme";
import { Button } from "~/ui/Button";
import { LineChart, StatTile } from "~/ui/Charts";
import { Badge, Card, EmptyState } from "~/ui/Controls";
import { Row } from "~/ui/Row";
import { SessionRow, WeaknessRow } from "~/ui/Rows";
import { Screen, Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { startExercise } from "~/ui/helpers";
import { router } from "expo-router";

export default function OverviewScreen() {
  const { ready, visibleSessions, sessions, sampleIncluded, weaknesses, prefs, updatePrefs } = useData();
  const c = useColors();
  const [now] = useState(() => Date.now());

  const fallback: ExerciseConfig = {
    type: "consecutive",
    sourceLang: prefs.defaultSourceLang,
    targetLang: prefs.defaultTargetLang,
    difficulty: 2,
    subject: "medical",
    length: "medium",
    contentSource: "library",
  };
  const next = useMemo(() => recommendNext(visibleSessions, weaknesses, fallback), [visibleSessions, weaknesses]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ready) return <Screen><View /></Screen>;

  const t = totals(visibleSessions);
  const recent = visibleSessions.slice(0, 10);
  const last30 = visibleSessions.filter((s) => new Date(s.createdAt).getTime() >= now - 30 * 86_400_000);
  const series = dailySeries(last30, ["overall", "semanticAccuracy", "completeness"]);
  const nextCfg = next.config;

  return (
    <Screen>
      {sampleIncluded && (
        <View style={{ backgroundColor: c.warnFill, borderRadius: 12, padding: 14, gap: 6 }}>
          <Badge tone="warn">Sample data</Badge>
          <Text variant="subheadline">
            {sessions.length
              ? `Showing your ${sessions.length} session${sessions.length === 1 ? "" : "s"} plus ${visibleSessions.length - sessions.length} simulated samples.`
              : "These figures come from simulated sessions so you can explore the app."}
          </Text>
          <Text variant="subheadline" tone="accent" weight="600" onPress={() => updatePrefs({ showSampleData: false })} accessibilityRole="button">
            Hide sample data
          </Text>
        </View>
      )}

      <Section title="Recommended next">
        <Card tint>
          <Text variant="title3">{next.title}</Text>
          <Text variant="subheadline" tone="secondary">
            {next.reason}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Badge tone="accent">{EXERCISE_TYPES[nextCfg.type].short}</Badge>
            <Badge>{langPairLabel(nextCfg.sourceLang, nextCfg.targetLang)}</Badge>
            <Badge>{SUBJECTS[nextCfg.subject].label}</Badge>
            <Badge>{`Level ${nextCfg.difficulty} · ${DIFFICULTY[nextCfg.difficulty].label}`}</Badge>
            <Badge>{AUDIO_LENGTH[nextCfg.length].label}</Badge>
          </View>
          <Button title="Start exercise" trailingIcon="arrow" onPress={() => startExercise(nextCfg)} />
        </Card>
      </Section>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Sessions" value={t.count} sub="Total practice sessions" />
          <StatTile label="Practice time" value={formatDuration(t.seconds)} sub="Listening and rendition" />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Recent score" value={metricMean(recent, "overall") ?? "—"} delta={delta(recent, "overall")} sub="Last 10 sessions" />
          <StatTile label="Accuracy" value={metricMean(visibleSessions, "semanticAccuracy") ?? "—"} sub="Semantic accuracy" />
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Retention" value={metricMean(visibleSessions, "informationRetention") ?? "—"} sub="Details retained" />
          <StatTile label="Completeness" value={metricMean(visibleSessions, "completeness") ?? "—"} sub="Main points present" />
        </View>
      </View>

      <Section title="Recent performance" footer="Daily average over the last 30 days.">
        <Card>
          {series.length ? (
            <LineChart
              labels={series.map((r) => String(r.label))}
              series={[
                { label: "Overall", values: series.map((r) => r.overall as number | null) },
                { label: "Accuracy", values: series.map((r) => r.semanticAccuracy as number | null) },
                { label: "Completeness", values: series.map((r) => r.completeness as number | null) },
              ]}
            />
          ) : (
            <EmptyState title="No sessions in the last 30 days" message="Complete an exercise to start your trend." />
          )}
        </Card>
      </Section>

      <Section title="Recurring weaknesses" footer="Patterns across your recent sessions, not one-off slips. Tap one to practise it.">
        {weaknesses.length ? (
          weaknesses.slice(0, 3).map((w) => <WeaknessRow key={w.key} weakness={w} base={nextCfg} />)
        ) : (
          <EmptyState title="No recurring patterns yet" message="After a few sessions, the coach highlights what to work on." />
        )}
      </Section>

      <Section
        title="Recent sessions"
        action={
          <Text variant="footnote" tone="accent" weight="600" onPress={() => router.push("/progress")} accessibilityRole="button">
            See All
          </Text>
        }
      >
        {recent.length ? (
          recent.slice(0, 5).map((s) => <SessionRow key={s.id} session={s} />)
        ) : (
          <EmptyState title="No sessions yet" message="Your completed exercises and their feedback appear here." />
        )}
      </Section>
      {!recent.length && <Row title="Open Practice" chevron onPress={() => router.push("/practice")} />}
    </Screen>
  );
}
