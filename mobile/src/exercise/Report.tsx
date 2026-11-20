import { useState } from "react";
import { View } from "react-native";
import { EXERCISE_TYPES, SCORE_LABELS } from "@/lib/exercises/catalog";
import type { Evaluation, ExerciseConfig, MeaningUnit, ScoreKey, Severity, UnitStatus } from "@/lib/types";
import { useColors } from "~/theme/theme";
import { Badge, Card, EmptyState } from "~/ui/Controls";
import { Row } from "~/ui/Row";
import { ScoreBar, ScoreRing } from "~/ui/Score";
import { Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { startExercise } from "~/ui/helpers";

const SEV: Record<Severity, "bad" | "warn" | "neutral"> = { critical: "bad", major: "warn", minor: "neutral" };
const STATUS: Record<UnitStatus, { label: string; tone: "good" | "warn" | "bad" }> = {
  conveyed: { label: "Conveyed", tone: "good" },
  partial: { label: "Partial", tone: "warn" },
  omitted: { label: "Omitted", tone: "bad" },
  distorted: { label: "Distorted", tone: "bad" },
};

export function Report({
  evaluation: e,
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
  const c = useColors();
  const [showUnits, setShowUnits] = useState(false);
  const unitMap = new Map(units?.map((u) => [u.id, u]));

  return (
    <View style={{ gap: 28 }}>
      {warning ? (
        <View style={{ backgroundColor: c.warnFill, borderRadius: 12, padding: 14 }}>
          <Text variant="subheadline">{warning}</Text>
        </View>
      ) : null}

      <Card>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <ScoreRing score={e.overallScore} size={96} caption="Score" />
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="title3">Performance evaluation</Text>
            {e.mode === "ai" ? <Badge tone="accent">{`AI · ${e.model ?? e.provider}`}</Badge> : <Badge tone="warn">Demo evaluator</Badge>}
          </View>
        </View>
        <Text variant="callout">{e.summary}</Text>
        {e.strengths.length > 0 && (
          <View style={{ gap: 4 }}>
            {e.strengths.map((s) => (
              <Text key={s} variant="subheadline" tone="good">
                ✓ {s}
              </Text>
            ))}
          </View>
        )}
      </Card>

      <Section title="Scores" footer={e.disclaimer}>
        <Card>
          <View style={{ gap: 14 }}>
            {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
              <ScoreBar key={k} label={SCORE_LABELS[k]} score={e.scores[k]} />
            ))}
          </View>
        </Card>
      </Section>

      <Section title={`Omitted information · ${e.omissions.length}`}>
        {e.omissions.length ? (
          e.omissions.map((o, i) => (
            <Row
              key={i}
              title={o.content}
              trailing={
                <View style={{ gap: 4, alignItems: "flex-end" }}>
                  <Badge tone={SEV[o.severity]}>{o.severity}</Badge>
                  <Badge>{o.category}</Badge>
                </View>
              }
            />
          ))
        ) : (
          <Row title="Nothing significant was omitted." />
        )}
      </Section>

      <Section title={`Incorrect information · ${e.errors.length}`}>
        {e.errors.length ? (
          e.errors.map((er, i) => (
            <Row
              key={i}
              title={
                <View style={{ gap: 3 }}>
                  <Text variant="subheadline">
                    <Text variant="subheadline" tone="secondary">
                      Source:{" "}
                    </Text>
                    {er.source}
                  </Text>
                  <Text variant="subheadline">
                    <Text variant="subheadline" tone="secondary">
                      Rendered:{" "}
                    </Text>
                    <Text variant="subheadline" tone="bad">
                      {er.rendered}
                    </Text>
                  </Text>
                </View>
              }
              subtitle={er.explanation}
              trailing={<Badge tone={SEV[er.severity]}>{er.severity}</Badge>}
            />
          ))
        ) : (
          <Row title="No meaning errors detected." />
        )}
      </Section>

      <Section title={`Unsupported additions · ${e.additions.length}`}>
        {e.additions.length ? (
          e.additions.map((a, i) => <Row key={i} title={`“${a.rendered}”`} subtitle={a.explanation} trailing={<Badge tone={SEV[a.severity]}>{a.severity}</Badge>} />)
        ) : (
          <Row title="No unsupported additions detected." />
        )}
      </Section>

      <Section
        title="Acceptable differences"
        footer={e.mode === "ai" ? undefined : "The demo evaluator matches concepts, never wording, so rephrasing is not penalised. AI evaluation also explains which reformulations were fine."}
      >
        {e.acceptableVariations.length ? (
          e.acceptableVariations.map((v, i) => <Row key={i} title={`${v.source} → ${v.rendered}`} subtitle={v.note} />)
        ) : (
          <Row title={e.mode === "ai" ? "No notable rephrasing to comment on." : "Not assessed in demo mode."} />
        )}
      </Section>

      {e.probeResults && e.probeResults.length > 0 && (
        <Section title="Detail check" footer={`${e.probeResults.filter((p) => p.correct).length} of ${e.probeResults.length} correct`}>
          {e.probeResults.map((p) => (
            <Row
              key={p.unitId}
              title={p.question}
              subtitle={`Your answer: ${p.answer || "—"}${p.correct ? "" : ` · Expected: ${p.expected}`}`}
              trailing={<Badge tone={p.correct ? "good" : "bad"}>{p.correct ? "Correct" : "Missed"}</Badge>}
            />
          ))}
        </Section>
      )}

      <Section title="Delivery" footer="Measured from timing and the transcript.">
        <Row title="Words per minute" value={e.fluency.wordsPerMinute === null ? "—" : String(e.fluency.wordsPerMinute)} />
        <Row title="Filler sounds" value={String(e.fluency.fillerCount)} />
        <Row title="Restarts" value={String(e.fluency.restarts)} />
        {e.fluency.notes.map((n) => (
          <Row key={n} title={n} />
        ))}
      </Section>

      <Section title="Recommended follow-up" footer="Targeted at what this rendition revealed.">
        {e.recommendations.map((r, i) => {
          const cfg = { ...config, ...r.config, scenarioId: undefined } as ExerciseConfig;
          if (cfg.type === "dialogue") cfg.type = "consecutive";
          return (
            <Row
              key={i}
              title={r.title}
              subtitle={`${r.reason} (${EXERCISE_TYPES[cfg.type].short}, level ${cfg.difficulty}, ${cfg.length})`}
              chevron
              onPress={() => startExercise(cfg)}
              accessibilityHint="Starts this follow-up exercise"
            />
          );
        })}
      </Section>

      {units && units.length > 0 && (
        <Section title="Meaning units" footer="The information the speaker intended to convey, and how each unit came through.">
          <Row title={showUnits ? "Hide breakdown" : "Show breakdown"} onPress={() => setShowUnits((v) => !v)} chevron />
          {showUnits
            ? e.unitResults.map((r) => {
                const u = unitMap.get(r.unitId);
                if (!u) return null;
                const s = STATUS[r.status];
                return <Row key={r.unitId} title={u.label} subtitle={r.note || undefined} trailing={<Badge tone={s.tone}>{s.label}</Badge>} />;
              })
            : null}
        </Section>
      )}

      <Section title="Source speech">
        <Card>
          <Text variant="callout">{sourceText}</Text>
        </Card>
      </Section>
      <Section title="Your rendition">
        <Card>
          {transcript ? <Text variant="callout">{transcript}</Text> : <EmptyState title="No rendition was captured." />}
        </Card>
      </Section>
    </View>
  );
}
