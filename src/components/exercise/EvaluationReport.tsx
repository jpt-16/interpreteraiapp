"use client";
import { ArrowRight, Check, CircleAlert, CircleMinus, CirclePlus, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { ScoreBar, ScoreRing } from "@/components/ui/Score";
import { configToParams } from "@/lib/exercises/builder";
import { EXERCISE_TYPES, SCORE_DESCRIPTIONS, SCORE_LABELS } from "@/lib/exercises/catalog";
import type { Evaluation, ExerciseConfig, MeaningUnit, ScoreKey, Severity, UnitStatus } from "@/lib/types";

const SEV_TONE: Record<Severity, "bad" | "warn" | "neutral"> = { critical: "bad", major: "warn", minor: "neutral" };
const STATUS: Record<UnitStatus, { label: string; tone: "good" | "accent" | "warn" | "bad" }> = {
  conveyed: { label: "Conveyed", tone: "good" },
  partial: { label: "Partial", tone: "warn" },
  omitted: { label: "Omitted", tone: "bad" },
  distorted: { label: "Distorted", tone: "bad" },
};

function Section({ title, icon, count, children, empty }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode; empty: string }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
            <span className="tabular text-[12px] font-normal text-muted">{count}</span>
          </span>
        }
      />
      <CardBody className="pt-3">{count ? children : <p className="text-[13px] text-muted">{empty}</p>}</CardBody>
    </Card>
  );
}

export function EvaluationReport({
  evaluation,
  config,
  sourceText,
  transcript,
  units,
  warning,
}: {
  evaluation: Evaluation;
  config: ExerciseConfig;
  sourceText: string;
  transcript: string;
  units?: MeaningUnit[];
  warning?: string;
}) {
  const [showUnits, setShowUnits] = useState(false);
  const e = evaluation;
  const unitMap = new Map(units?.map((u) => [u.id, u]));

  return (
    <div className="space-y-5">
      {warning && (
        <div className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-ink-2">
          <CircleAlert size={15} className="mt-0.5 shrink-0 text-warn" /> {warning}
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-6 md:flex-row md:items-center">
          <ScoreRing score={e.overallScore} size={112} stroke={8} label="Training score" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Performance evaluation</h2>
              {e.mode === "ai" ? (
                <Badge tone="accent">
                  <Sparkles size={11} /> AI evaluation{e.model ? ` · ${e.model}` : ""}
                </Badge>
              ) : (
                <Badge tone="warn">Demo heuristic evaluator</Badge>
              )}
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{e.summary}</p>
            {e.strengths.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {e.strengths.map((s) => (
                  <li key={s} className="flex items-center gap-1.5 rounded-md bg-good-soft px-2 py-1 text-[12px] text-good">
                    <Check size={12} /> {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
        <div className="grid gap-x-8 gap-y-4 border-t border-line px-5 py-5 sm:grid-cols-2">
          {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
            <ScoreBar key={k} label={SCORE_LABELS[k]} score={e.scores[k]} hint={SCORE_DESCRIPTIONS[k]} />
          ))}
        </div>
        <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[11.5px] leading-relaxed text-faint">
          <Info size={13} className="mt-px shrink-0" /> {e.disclaimer}
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Omitted information" icon={<CircleMinus size={15} className="text-bad" />} count={e.omissions.length} empty="Nothing significant was omitted.">
          <ul className="space-y-2">
            {e.omissions.map((o, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-[13px]">
                <span className="text-ink-2">{o.content}</span>
                <span className="flex shrink-0 gap-1">
                  <Badge>{o.category}</Badge>
                  <Badge tone={SEV_TONE[o.severity]}>{o.severity}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Incorrect information" icon={<CircleAlert size={15} className="text-warn" />} count={e.errors.length} empty="No meaning errors detected.">
          <ul className="space-y-3">
            {e.errors.map((er, i) => (
              <li key={i} className="text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-muted">Source:</span> <span className="text-ink-2">{er.source}</span>
                    <br />
                    <span className="text-muted">Rendered:</span> <span className="text-bad">{er.rendered}</span>
                  </div>
                  <Badge tone={SEV_TONE[er.severity]}>{er.severity}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{er.explanation}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Unsupported additions" icon={<CirclePlus size={15} className="text-warn" />} count={e.additions.length} empty="No unsupported additions detected.">
          <ul className="space-y-3">
            {e.additions.map((a, i) => (
              <li key={i} className="text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-ink-2">“{a.rendered}”</span>
                  <Badge tone={SEV_TONE[a.severity]}>{a.severity}</Badge>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{a.explanation}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Acceptable differences"
          icon={<Check size={15} className="text-good" />}
          count={e.acceptableVariations.length}
          empty={
            e.mode === "ai"
              ? "No notable rephrasing to comment on."
              : "The demo evaluator matches concepts, not wording, so rephrasing is never penalised. AI evaluation also explains which reformulations were acceptable."
          }
        >
          <ul className="space-y-3">
            {e.acceptableVariations.map((v, i) => (
              <li key={i} className="text-[13px]">
                <span className="text-muted">{v.source}</span> <ArrowRight size={12} className="inline text-faint" /> <span className="text-ink-2">{v.rendered}</span>
                <p className="mt-1 text-[12.5px] text-muted">{v.note}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {e.probeResults && e.probeResults.length > 0 && (
        <Card>
          <CardHeader title="Detail check" description={`${e.probeResults.filter((p) => p.correct).length} of ${e.probeResults.length} answered correctly`} />
          <CardBody className="pt-3">
            <ul className="divide-y divide-line">
              {e.probeResults.map((p) => (
                <li key={p.unitId} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                  <div>
                    <div className="text-ink-2">{p.question}</div>
                    <div className="text-muted">
                      Your answer: <span className={p.correct ? "text-good" : "text-bad"}>{p.answer || "—"}</span>
                      {!p.correct && <> · Expected: {p.expected}</>}
                    </div>
                  </div>
                  <Badge tone={p.correct ? "good" : "bad"}>{p.correct ? "Correct" : "Missed"}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Delivery" description="Measured from timing and the transcript." />
          <CardBody className="space-y-4 pt-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Words / min", e.fluency.wordsPerMinute ?? "—"],
                ["Fillers", e.fluency.fillerCount],
                ["Restarts", e.fluency.restarts],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-line bg-surface-2/50 py-3">
                  <div className="tabular text-lg font-semibold text-ink">{v}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted">{l}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5 text-[13px] text-ink-2">
              {e.fluency.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="text-faint">–</span>
                  {n}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recommended follow-up" description="Targeted at what this rendition revealed." />
          <CardBody className="space-y-2.5 pt-3">
            {e.recommendations.map((r, i) => {
              const cfg = { ...config, ...r.config, scenarioId: undefined } as ExerciseConfig;
              if (cfg.type === "dialogue") cfg.type = "consecutive";
              return (
                <Link
                  key={i}
                  href={`/exercise?${configToParams(cfg)}`}
                  className="group block rounded-lg border border-line bg-surface-2/40 p-3 transition-colors hover:border-accent/40 hover:bg-accent-soft"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium text-ink">{r.title}</span>
                    <ArrowRight size={14} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{r.reason}</p>
                  <div className="mt-2 flex gap-1">
                    <Badge>{EXERCISE_TYPES[cfg.type].short}</Badge>
                    <Badge>Level {cfg.difficulty}</Badge>
                    <Badge>{cfg.length}</Badge>
                  </div>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {units && units.length > 0 && (
        <Card>
          <CardHeader
            title="Meaning units"
            description="The information the speaker intended to convey, and how each unit came through."
            action={
              <button onClick={() => setShowUnits((v) => !v)} className="text-[12.5px] text-accent-strong hover:underline">
                {showUnits ? "Hide" : "Show"} breakdown
              </button>
            }
          />
          {showUnits && (
            <CardBody className="pt-3">
              <ul className="divide-y divide-line">
                {e.unitResults.map((r) => {
                  const u = unitMap.get(r.unitId);
                  if (!u) return null;
                  const s = STATUS[r.status];
                  return (
                    <li key={r.unitId} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                      <div>
                        <span className="text-ink-2">{u.label}</span>
                        {r.note && <div className="text-[12px] text-muted">{r.note}</div>}
                      </div>
                      <span className="flex shrink-0 gap-1">
                        <Badge>{u.category}</Badge>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          )}
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Source speech" />
          <CardBody className="pt-3 text-[13.5px] leading-relaxed text-ink-2">{sourceText}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Your rendition (transcript)" />
          <CardBody className={cn("pt-3 text-[13.5px] leading-relaxed", transcript ? "text-ink-2" : "text-muted")}>
            {transcript || "No rendition was captured."}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
