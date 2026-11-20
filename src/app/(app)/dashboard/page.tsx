"use client";
import { ArrowRight, Clock, Gauge, Layers, ListChecks, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { SERIES } from "@/components/charts/palette";
import { TrendChart } from "@/components/charts/TrendChart";
import { WeaknessList } from "@/components/coach/WeaknessList";
import { SessionList } from "@/components/sessions/SessionList";
import { Badge, SampleBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { dailySeries, delta, formatDuration, metricMean, totals } from "@/lib/analytics/aggregate";
import { recommendNext } from "@/lib/coach/analyze";
import { useData } from "@/lib/data/store";
import { AUDIO_LENGTH, DIFFICULTY, EXERCISE_TYPES, langPairLabel, SUBJECTS } from "@/lib/exercises/catalog";
import { configToParams } from "@/lib/exercises/builder";
import type { ExerciseConfig } from "@/lib/types";

export default function DashboardPage() {
  const { ready, visibleSessions, sessions, sampleIncluded, weaknesses, prefs, updatePrefs } = useData();

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

  const t = totals(visibleSessions);
  const recent = visibleSessions.slice(0, 10);
  const since = Date.now() - 30 * 86_400_000;
  const last30 = visibleSessions.filter((s) => new Date(s.createdAt).getTime() >= since);
  const series = dailySeries(last30, ["overall", "semanticAccuracy", "completeness"]);

  if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;

  return (
    <div className="animate-rise">
      <PageHeader
        title="Dashboard"
        description="Your interpreting performance at a glance."
        actions={
          <ButtonLink href="/practice">
            New exercise <ArrowRight size={15} />
          </ButtonLink>
        }
      />

      {sampleIncluded && (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-[13px] text-ink-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <SampleBadge />
            {sessions.length
              ? `Showing ${sessions.length} of your sessions plus ${visibleSessions.length - sessions.length} simulated sample sessions.`
              : "These figures come from simulated sample sessions so you can explore the product."}
          </span>
          <button className="text-left text-[13px] font-medium text-warn hover:underline" onClick={() => updatePrefs({ showSampleData: false })}>
            Hide sample data
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Sessions" value={t.count} icon={<Layers size={15} />} sub="Total practice sessions" />
        <Stat label="Practice time" value={formatDuration(t.seconds)} icon={<Clock size={15} />} sub="Listening and rendition" />
        <Stat
          label="Recent"
          value={metricMean(recent, "overall") ?? "—"}
          delta={delta(recent, "overall")}
          icon={<Gauge size={15} />}
          sub="Overall, last 10 sessions"
        />
        <Stat label="Accuracy" value={metricMean(visibleSessions, "semanticAccuracy") ?? "—"} icon={<Target size={15} />} sub="Semantic accuracy" />
        <Stat label="Retention" value={metricMean(visibleSessions, "informationRetention") ?? "—"} icon={<Sparkles size={15} />} sub="Details retained" />
        <Stat label="Completeness" value={metricMean(visibleSessions, "completeness") ?? "—"} icon={<ListChecks size={15} />} sub="Main points present" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Recommended next exercise" description="Chosen by your performance coach from recent results." />
          <CardBody>
            <div className="rounded-lg border border-accent/25 bg-accent-soft p-4">
              <div className="text-[15px] font-medium text-ink">{next.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{next.reason}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="accent">{EXERCISE_TYPES[next.config.type].short}</Badge>
                <Badge>{langPairLabel(next.config.sourceLang, next.config.targetLang)}</Badge>
                <Badge>{SUBJECTS[next.config.subject].label}</Badge>
                <Badge>Level {next.config.difficulty} · {DIFFICULTY[next.config.difficulty].label}</Badge>
                <Badge>{AUDIO_LENGTH[next.config.length].label}</Badge>
              </div>
              <ButtonLink href={`/exercise?${configToParams(next.config)}`} className="mt-4 w-full">
                Start exercise <ArrowRight size={15} />
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <ChartCard
          className="lg:col-span-3"
          title="Recent performance"
          description="Daily average, last 30 days"
          legend={[
            { label: "Overall", color: SERIES[0] },
            { label: "Accuracy", color: SERIES[1] },
            { label: "Completeness", color: SERIES[2] },
          ]}
          table={{
            columns: ["Day", "Overall", "Accuracy", "Completeness"],
            rows: series.map((r) => [r.label, r.overall, r.semanticAccuracy, r.completeness]),
          }}
        >
          {series.length ? (
            <TrendChart
              data={series}
              series={[
                { key: "overall", label: "Overall" },
                { key: "semanticAccuracy", label: "Accuracy" },
                { key: "completeness", label: "Completeness" },
              ]}
            />
          ) : (
            <EmptyState title="No sessions in the last 30 days" description="Complete an exercise to start tracking your trend." />
          )}
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Recent sessions"
            action={
              <Link href="/analytics#history" className="text-[12.5px] text-accent-strong hover:underline">
                View all
              </Link>
            }
          />
          <div className="mt-3">
            {recent.length ? (
              <SessionList sessions={recent.slice(0, 6)} />
            ) : (
              <EmptyState
                title="No sessions yet"
                description="Your completed exercises and their feedback will appear here."
                action={<ButtonLink href="/practice">Start practising</ButtonLink>}
              />
            )}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Recurring weaknesses" description="Patterns across your recent sessions, not one-off slips." />
          <CardBody>
            {weaknesses.length ? (
              <WeaknessList weaknesses={weaknesses} base={next.config} limit={3} />
            ) : (
              <EmptyState title="No recurring patterns yet" description="After a few sessions, the coach will highlight what to work on." />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
