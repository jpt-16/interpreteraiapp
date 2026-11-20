"use client";
import { useMemo, useState } from "react";
import { BarBreakdown } from "@/components/charts/BarBreakdown";
import { ChartCard } from "@/components/charts/ChartCard";
import { SERIES } from "@/components/charts/palette";
import { TrendChart } from "@/components/charts/TrendChart";
import { SessionList } from "@/components/sessions/SessionList";
import { SampleBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented, Select } from "@/components/ui/Fields";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { byExerciseType, bySubject, dailySeries, delta, metricMean } from "@/lib/analytics/aggregate";
import { useData } from "@/lib/data/store";
import { EXERCISE_TYPES, SUBJECTS } from "@/lib/exercises/catalog";
import type { ExerciseType, Subject } from "@/lib/types";

type Range = "30" | "90" | "all";

export default function AnalyticsPage() {
  const { ready, visibleSessions, sampleIncluded, updatePrefs } = useData();
  const [range, setRange] = useState<Range>("90");
  const [type, setType] = useState<ExerciseType | "all">("all");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const since = range === "all" ? 0 : now - Number(range) * 86_400_000;
    return visibleSessions.filter(
      (s) =>
        new Date(s.createdAt).getTime() >= since &&
        (type === "all" || s.config.type === type) &&
        (subject === "all" || s.config.subject === subject),
    );
  }, [visibleSessions, range, type, subject, now]);

  const accuracy = dailySeries(filtered, ["semanticAccuracy", "fidelity"]);
  const retention = dailySeries(filtered, ["informationRetention", "numbersDates"]);
  const quality = dailySeries(filtered, ["completeness", "fluency"]);
  const types = byExerciseType(filtered);
  const subjects = bySubject(filtered);

  if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;

  return (
    <div className="animate-rise">
      <PageHeader title="Performance Analytics" description="Trends across your stored sessions. Every point is the daily average." />

      {/* Filters: one row above the charts */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 md:flex-row md:items-center">
        <Segmented
          ariaLabel="Time range"
          value={range}
          onChange={setRange}
          className="md:w-[260px]"
          options={[
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
            { value: "all", label: "All time" },
          ]}
        />
        <Select
          ariaLabel="Exercise type"
          value={type}
          onChange={(v) => setType(v as ExerciseType | "all")}
          className="md:w-[220px]"
          options={[{ value: "all", label: "All exercise types" }, ...Object.entries(EXERCISE_TYPES).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        <Select
          ariaLabel="Subject"
          value={subject}
          onChange={(v) => setSubject(v as Subject | "all")}
          className="md:w-[200px]"
          options={[{ value: "all", label: "All subjects" }, ...Object.entries(SUBJECTS).map(([k, v]) => ({ value: k, label: v.label }))]}
        />
        {sampleIncluded && (
          <div className="flex items-center gap-2 md:ml-auto">
            <SampleBadge />
            <button className="text-[12.5px] text-warn hover:underline" onClick={() => updatePrefs({ showSampleData: false })}>
              Hide
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="No sessions match these filters"
            description="Complete an exercise or widen the filters to see your analytics."
            action={<ButtonLink href="/practice">Start practising</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Overall" value={metricMean(filtered, "overall") ?? "—"} delta={delta(filtered, "overall")} sub="Change: earlier vs later half" />
            <Stat label="Accuracy" value={metricMean(filtered, "semanticAccuracy") ?? "—"} delta={delta(filtered, "semanticAccuracy")} />
            <Stat label="Retention" value={metricMean(filtered, "informationRetention") ?? "—"} delta={delta(filtered, "informationRetention")} />
            <Stat label="Completeness" value={metricMean(filtered, "completeness") ?? "—"} delta={delta(filtered, "completeness")} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Accuracy over time"
              description="Semantic accuracy and absence of unsupported additions"
              legend={[
                { label: "Semantic accuracy", color: SERIES[0] },
                { label: "Fidelity", color: SERIES[1] },
              ]}
              table={{ columns: ["Day", "Accuracy", "Fidelity"], rows: accuracy.map((r) => [r.label, r.semanticAccuracy, r.fidelity]) }}
            >
              <TrendChart
                data={accuracy}
                series={[
                  { key: "semanticAccuracy", label: "Semantic accuracy" },
                  { key: "fidelity", label: "Fidelity" },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="Retention over time"
              description="Specific details, and numbers & dates"
              legend={[
                { label: "Information retention", color: SERIES[0] },
                { label: "Numbers & dates", color: SERIES[1] },
              ]}
              table={{ columns: ["Day", "Retention", "Numbers & dates"], rows: retention.map((r) => [r.label, r.informationRetention, r.numbersDates]) }}
            >
              <TrendChart
                data={retention}
                series={[
                  { key: "informationRetention", label: "Information retention" },
                  { key: "numbersDates", label: "Numbers & dates" },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="Completeness and fluency"
              description="Omission avoidance and delivery"
              legend={[
                { label: "Completeness", color: SERIES[0] },
                { label: "Fluency", color: SERIES[1] },
              ]}
              table={{ columns: ["Day", "Completeness", "Fluency"], rows: quality.map((r) => [r.label, r.completeness, r.fluency]) }}
            >
              <TrendChart
                data={quality}
                series={[
                  { key: "completeness", label: "Completeness" },
                  { key: "fluency", label: "Fluency" },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="By exercise type"
              description="Average overall training score"
              table={{ columns: ["Type", "Sessions", "Overall", "Accuracy", "Completeness"], rows: types.map((r) => [r.label, r.sessions, r.overall, r.accuracy, r.completeness]) }}
            >
              <BarBreakdown data={types} valueKey="overall" valueLabel="Overall" />
            </ChartCard>
            <ChartCard
              className="lg:col-span-2"
              title="By subject matter"
              description="Average overall training score per domain"
              table={{ columns: ["Subject", "Sessions", "Overall", "Terminology"], rows: subjects.map((r) => [r.label, r.sessions, r.overall, r.terminology]) }}
            >
              <BarBreakdown data={subjects} valueKey="overall" valueLabel="Overall" />
            </ChartCard>
          </div>

          <Card className="mt-5" id="history">
            <CardHeader title="Session history" description={`${filtered.length} sessions · open any session to review its full feedback`} />
            <div className="mt-3">
              <SessionList sessions={filtered} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
