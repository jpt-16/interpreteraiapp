import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { byExerciseType, bySubject, dailySeries, delta, metricMean } from "@/lib/analytics/aggregate";
import { EXERCISE_TYPES, SUBJECTS } from "@/lib/exercises/catalog";
import type { ExerciseType, Subject } from "@/lib/types";
import { useData } from "~/data/store";
import { Badge, Card, Chips, EmptyState, Segmented } from "~/ui/Controls";
import { BarList, LineChart, StatTile } from "~/ui/Charts";
import { SessionRow } from "~/ui/Rows";
import { Screen, Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";

type Range = "30" | "90" | "all";

export default function ProgressScreen() {
  const { ready, visibleSessions, sampleIncluded, updatePrefs } = useData();
  const [range, setRange] = useState<Range>("90");
  const [type, setType] = useState<ExerciseType | "all">("all");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const since = range === "all" ? 0 : now - Number(range) * 86_400_000;
    return visibleSessions.filter(
      (s) => new Date(s.createdAt).getTime() >= since && (type === "all" || s.config.type === type) && (subject === "all" || s.config.subject === subject),
    );
  }, [visibleSessions, range, type, subject, now]);

  if (!ready) return <Screen><View /></Screen>;

  const accuracy = dailySeries(filtered, ["semanticAccuracy", "fidelity"]);
  const retention = dailySeries(filtered, ["informationRetention", "numbersDates"]);
  const quality = dailySeries(filtered, ["completeness", "fluency"]);
  const types = byExerciseType(filtered);
  const subjects = bySubject(filtered);
  const lab = (rows: typeof accuracy) => rows.map((r) => String(r.label));
  const vals = (rows: typeof accuracy, k: string) => rows.map((r) => r[k] as number | null);

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Segmented
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "all", label: "All time" },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chips
            label="Exercise type"
            value={type as string}
            onChange={(v) => setType(v as ExerciseType | "all")}
            options={[{ value: "all", label: "All types" }, ...Object.entries(EXERCISE_TYPES).map(([k, v]) => ({ value: k, label: v.short }))]}
          />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chips
            label="Subject"
            value={subject as string}
            onChange={(v) => setSubject(v as Subject | "all")}
            options={[{ value: "all", label: "All subjects" }, ...Object.entries(SUBJECTS).map(([k, v]) => ({ value: k, label: v.label }))]}
          />
        </ScrollView>
        {sampleIncluded && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Badge tone="warn">Sample data</Badge>
            <Text variant="footnote" tone="accent" onPress={() => updatePrefs({ showSampleData: false })} accessibilityRole="button">
              Hide
            </Text>
          </View>
        )}
      </View>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title="No sessions match these filters" message="Complete an exercise or widen the filters." />
        </Card>
      ) : (
        <>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatTile label="Overall" value={metricMean(filtered, "overall") ?? "—"} delta={delta(filtered, "overall")} sub="Earlier vs later half" />
              <StatTile label="Accuracy" value={metricMean(filtered, "semanticAccuracy") ?? "—"} delta={delta(filtered, "semanticAccuracy")} />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StatTile label="Retention" value={metricMean(filtered, "informationRetention") ?? "—"} delta={delta(filtered, "informationRetention")} />
              <StatTile label="Completeness" value={metricMean(filtered, "completeness") ?? "—"} delta={delta(filtered, "completeness")} />
            </View>
          </View>

          <Section title="Accuracy over time" footer="Semantic accuracy and absence of unsupported additions. Daily averages.">
            <Card>
              <LineChart labels={lab(accuracy)} series={[{ label: "Semantic accuracy", values: vals(accuracy, "semanticAccuracy") }, { label: "Fidelity", values: vals(accuracy, "fidelity") }]} />
            </Card>
          </Section>
          <Section title="Retention over time" footer="Specific details, and numbers & dates.">
            <Card>
              <LineChart labels={lab(retention)} series={[{ label: "Info retention", values: vals(retention, "informationRetention") }, { label: "Numbers & dates", values: vals(retention, "numbersDates") }]} />
            </Card>
          </Section>
          <Section title="Completeness and fluency" footer="Omission avoidance and delivery.">
            <Card>
              <LineChart labels={lab(quality)} series={[{ label: "Completeness", values: vals(quality, "completeness") }, { label: "Fluency", values: vals(quality, "fluency") }]} />
            </Card>
          </Section>
          <Section title="By exercise type" footer="Average overall training score.">
            <Card>
              <BarList rows={types.map((r) => ({ label: r.label, value: r.overall, detail: `${r.sessions} session${r.sessions === 1 ? "" : "s"}` }))} />
            </Card>
          </Section>
          <Section title="By subject matter" footer="Average overall training score per domain.">
            <Card>
              <BarList rows={subjects.map((r) => ({ label: r.label, value: r.overall, detail: `${r.sessions} session${r.sessions === 1 ? "" : "s"}${r.terminology !== null ? ` · terminology ${r.terminology}` : ""}` }))} />
            </Card>
          </Section>

          <Section title={`History · ${filtered.length}`} footer="Open any session to review its full feedback.">
            {filtered.slice(0, 40).map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </Section>
        </>
      )}
    </Screen>
  );
}
