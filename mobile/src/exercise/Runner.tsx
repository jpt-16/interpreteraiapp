import * as Haptics from "expo-haptics";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mergeEvaluations } from "@/lib/eval/merge";
import { newId } from "@/lib/data/repository";
import { DIFFICULTY, EXERCISE_TYPES, LANGUAGES, langPairLabel } from "@/lib/exercises/catalog";
import type { ExercisePlan } from "@/lib/exercises/plan";
import type { Evaluation, PracticeSession, TranscriptionSource } from "@/lib/types";
import { requestEvaluation, transcribe } from "~/data/api";
import { useData } from "~/data/store";
import { MAX_CONTENT_WIDTH, useColors } from "~/theme/theme";
import { Button } from "~/ui/Button";
import { Badge, Card, TextField } from "~/ui/Controls";
import { Icon } from "~/ui/Icon";
import { Text } from "~/ui/Text";
import { fmtTime } from "~/ui/helpers";
import { Report } from "./Report";
import { recordingMime, useRenditionRecorder } from "./useRenditionRecorder";
import { useSourceAudio } from "./useSourceAudio";
import { LiveBars, PassageShape } from "./Waveform";

type Phase = "brief" | "listening" | "ready" | "recording" | "transcribing" | "review" | "probes" | "evaluating" | "results";

interface Capture {
  transcript: string;
  durationSec: number | null;
  source: TranscriptionSource;
  firstSpeechOffsetSec: number | null;
}

const STEPS = ["Listen", "Render", "Review", "Feedback"] as const;
const stepOf = (p: Phase) => (p === "brief" || p === "listening" ? 0 : p === "ready" || p === "recording" || p === "transcribing" ? 1 : p === "review" || p === "probes" ? 2 : 3);

export function ExerciseRunner({ plan, onRestart, banner }: { plan: ExercisePlan; onRestart: () => void; banner?: string | null }) {
  const { status, terms, saveSession, prefs } = useData();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const cfg = plan.config;
  const isSimul = cfg.type === "simultaneous";
  const isDialogue = plan.turns.length > 1;
  const sttLive = Boolean(status?.stt.live);
  // Simultaneous interpreting needs live transcription; without it the rendition is typed after listening.
  const simulLive = isSimul && sttLive;
  const allowNotes = cfg.type === "consecutive" || cfg.type === "dialogue";

  const [phase, setPhase] = useState<Phase>("brief");
  const [turn, setTurn] = useState(0);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [typed, setTyped] = useState(!sttLive);
  const [typedText, setTypedText] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [probeAnswers, setProbeAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ evaluation: Evaluation; warning?: string; session?: PracticeSession } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bannerShown, setBannerShown] = useState(true);
  const [simulEnded, setSimulEnded] = useState(false);

  const listenSec = useRef(0);
  const sourceStart = useRef(0);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useSourceAudio(Boolean(status?.tts.live));
  const rec = useRenditionRecorder();
  const current = plan.turns[turn];
  const midExercise = phase !== "brief" && phase !== "results" && phase !== "evaluating";

  // Leaving mid-exercise discards it, so confirm first (also for the Android back button).
  const requestClose = useCallback(() => {
    if (!midExercise) return router.back();
    Alert.alert("Leave this exercise?", "Your progress in this exercise will be lost.", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          audio.stop();
          router.back();
        },
      },
    ]);
  }, [midExercise, audio]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [requestClose]);
  useEffect(() => () => void (autoStop.current && clearTimeout(autoStop.current)), []);

  /* ------------------------------ capturing ------------------------------ */

  const endCapture = useCallback(async (): Promise<Capture> => {
    if (typed) {
      const t = typedText.trim();
      setTypedText("");
      return { transcript: t, durationSec: null, source: "typed", firstSpeechOffsetSec: null };
    }
    const { uri, durationSec } = await rec.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setPhase("transcribing");
    let transcript = "";
    let source: TranscriptionSource = "typed";
    if (uri) {
      const text = await transcribe(uri, current.targetLang, recordingMime());
      if (text !== null) {
        transcript = text;
        source = "server";
      } else {
        setNotice("Transcription was unavailable. Type what you said in the review step.");
      }
      try {
        new File(uri).delete(); // recordings are not kept
      } catch {
        /* already gone */
      }
    }
    return { transcript, durationSec, source, firstSpeechOffsetSec: null };
  }, [typed, typedText, rec, current]);

  const finishTurn = useCallback(
    (cap: Capture) => {
      setCaptures((prev) => {
        const next = [...prev];
        next[turn] = cap;
        return next;
      });
      if (turn < plan.turns.length - 1) {
        setTurn((t) => t + 1);
        setPhase("brief");
      } else setPhase("review");
    },
    [turn, plan.turns.length],
  );

  /* ------------------------------- actions -------------------------------- */

  const listen = useCallback(async () => {
    setSimulEnded(false);
    setNotice(null);
    let recording = false;
    if (simulLive && !typed) {
      recording = await rec.start();
      if (!recording) setTyped(true);
    }
    setPhase("listening");
    sourceStart.current = Date.now();
    const secs = await audio.play({ segments: current.segments, lang: current.sourceLang, rate: plan.speechRate });
    listenSec.current += secs;
    if (recording) {
      setSimulEnded(true);
      autoStop.current = setTimeout(() => stopRendition(), 8000); // eslint-disable-line @typescript-eslint/no-use-before-define
    } else setPhase((p) => (p === "listening" ? "ready" : p));
  }, [simulLive, typed, rec, audio, current, plan.speechRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRendition = useCallback(async () => {
    const ok = await rec.start();
    if (ok) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      setPhase("recording");
    } else setTyped(true);
  }, [rec]);

  const stopRendition = useCallback(async () => {
    if (autoStop.current) clearTimeout(autoStop.current);
    audio.stop();
    finishTurn(await endCapture());
  }, [audio, endCapture, finishTurn]);

  const evaluate = useCallback(async () => {
    setPhase("evaluating");
    const glossaryFor = (src: string) => terms.map((t) => (t.sourceLang === src ? { source: t.source, target: t.target } : { source: t.target, target: t.source })).slice(0, 80);
    const results = await Promise.all(
      plan.turns.map((t, i) => {
        const cap = captures[i] ?? { transcript: "", durationSec: null, source: "typed" as const, firstSpeechOffsetSec: null };
        return requestEvaluation({
          exercise: {
            config: { ...cfg, sourceLang: t.sourceLang, targetLang: t.targetLang },
            title: plan.title,
            context: plan.context,
            text: t.text,
            units: t.units,
            wordCount: t.wordCount,
            probes: plan.probes,
          },
          response: {
            transcript: cap.transcript,
            durationSec: cap.durationSec,
            transcriptionSource: cap.source,
            firstSpeechOffsetSec: cap.firstSpeechOffsetSec,
            probeAnswers: plan.probes ? Object.entries(probeAnswers).map(([unitId, answer]) => ({ unitId, answer })) : undefined,
          },
          glossary: glossaryFor(t.sourceLang),
        });
      }),
    );
    const evaluation = mergeEvaluations(
      results.map((r, i) => ({
        evaluation: r.evaluation,
        weight: plan.turns[i].units.reduce((a, u) => a + u.weight, 0),
        label: plan.turns[i].speaker ? `Turn ${i + 1} (${plan.turns[i].speaker})` : `Turn ${i + 1}`,
      })),
      cfg,
    );
    const responseSec = captures.reduce((a, x) => a + (x?.durationSec ?? 0), 0);
    const session: PracticeSession = {
      id: newId(),
      createdAt: new Date().toISOString(),
      config: cfg,
      exerciseTitle: plan.title,
      sourceText: isDialogue ? plan.turns.map((t) => `[${t.speaker}] ${t.text}`).join("\n") : plan.turns[0].text,
      wordCount: plan.turns.reduce((a, t) => a + t.wordCount, 0),
      unitCount: plan.turns.reduce((a, t) => a + t.units.length, 0),
      durationSec: Math.round(listenSec.current + responseSec),
      response: {
        transcript: isDialogue ? plan.turns.map((t, i) => `[${t.speaker}] ${captures[i]?.transcript ?? ""}`).join("\n") : (captures[0]?.transcript ?? ""),
        durationSec: responseSec || null,
        transcriptionSource: captures[0]?.source ?? "typed",
        firstSpeechOffsetSec: captures[0]?.firstSpeechOffsetSec ?? null,
      },
      evaluation,
    };
    let saved: PracticeSession | undefined;
    try {
      saved = await saveSession(session);
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save this session.");
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setResult({ evaluation, warning: results.find((r) => r.warning)?.warning, session: saved ?? session });
    setPhase("results");
  }, [plan, captures, cfg, terms, probeAnswers, isDialogue, saveSession]);

  /* -------------------------------- render -------------------------------- */

  const typeInfo = EXERCISE_TYPES[cfg.type];
  const step = stepOf(phase);
  const voiceLabel = status?.tts.live ? `Studio voice (${status.tts.provider})` : "iPhone voice";
  const inputLabel = typed ? "Typed or dictated" : "Voice transcription";
  const showRecorderCard = phase === "ready" || phase === "recording" || phase === "transcribing" || (simulLive && phase === "listening");

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Focus-mode header */}
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10, borderBottomColor: c.separator, borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: c.background }}>
        <View style={styles.headerRow}>
          <Pressable onPress={requestClose} accessibilityRole="button" accessibilityLabel="Close exercise" hitSlop={12} style={[styles.close, { backgroundColor: c.fill }]}>
            <Icon name="close" size={16} color={c.secondaryLabel} weight="bold" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text variant="headline" numberOfLines={1}>
              {typeInfo.label}
            </Text>
            <Text variant="caption1" tone="secondary">
              {isDialogue ? "EN ⇄ ES" : langPairLabel(cfg.sourceLang, cfg.targetLang)} · Level {cfg.difficulty} · {DIFFICULTY[cfg.difficulty].label}
            </Text>
          </View>
          <View style={{ width: 30 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }} accessible accessibilityLabel={`Step ${step + 1} of 4: ${STEPS[step]}`}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1, gap: 4 }}>
              <View style={{ height: 3, borderRadius: 2, backgroundColor: i <= step ? c.accent : c.fill }} />
              <Text variant="caption2" tone={i === step ? "primary" : "tertiary"} numberOfLines={1}>
                {s}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: MAX_CONTENT_WIDTH, gap: 16 }}>
            {phase === "results" && result ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text variant="title2">{plan.title}</Text>
                  <Text variant="footnote" tone={result.session && !saveError ? "secondary" : "bad"}>
                    {result.session && !saveError ? "Saved to your history." : `This session could not be saved. ${saveError ?? ""}`}
                  </Text>
                </View>
                <Report
                  evaluation={result.evaluation}
                  config={cfg}
                  warning={result.warning}
                  sourceText={result.session?.sourceText ?? ""}
                  transcript={result.session?.response.transcript ?? ""}
                  units={plan.turns.flatMap((t) => t.units)}
                />
                <View style={{ gap: 10 }}>
                  <Button title="Done" onPress={() => router.back()} />
                  <Button title="New passage" variant="tinted" icon="restart" onPress={onRestart} />
                </View>
              </>
            ) : (
              <>
                <View style={{ alignItems: "center", gap: 4, paddingTop: 4 }}>
                  <Text variant="footnote" tone="accent" weight="600">
                    {(isDialogue ? `TURN ${turn + 1} OF ${plan.turns.length}` : typeInfo.short).toUpperCase()}
                  </Text>
                  <Text variant="title2" style={{ textAlign: "center" }}>
                    {plan.title}
                  </Text>
                  <Text variant="subheadline" tone="secondary" style={{ textAlign: "center" }}>
                    {plan.context}
                  </Text>
                </View>

                {phase === "brief" && (
                  <Card>
                    {banner && bannerShown && turn === 0 && (
                      <Text variant="footnote" tone="warn" onPress={() => setBannerShown(false)} accessibilityRole="button" accessibilityHint="Dismisses this notice">
                        {banner}
                      </Text>
                    )}
                    {turn === 0 &&
                      typeInfo.instructions.map((line, n) => (
                        <View key={n} style={{ flexDirection: "row", gap: 12 }}>
                          <View style={[styles.stepDot, { borderColor: c.separator }]}>
                            <Text variant="caption1" tone="secondary" tabular>
                              {n + 1}
                            </Text>
                          </View>
                          <Text variant="callout" style={{ flex: 1 }}>
                            {line}
                          </Text>
                        </View>
                      ))}
                    {isDialogue && (
                      <Text variant="callout">
                        <Text variant="callout" tone="secondary">
                          Next speaker:{" "}
                        </Text>
                        <Text variant="callout" weight="600">
                          {current.speaker}
                        </Text>
                        <Text variant="callout" tone="secondary">
                          {` (${LANGUAGES[current.sourceLang].label}). Interpret into ${LANGUAGES[current.targetLang].label}.`}
                        </Text>
                      </Text>
                    )}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      <Badge>{`${current.wordCount} words · ~${fmtTime((current.wordCount / 150 / plan.speechRate) * 60)}`}</Badge>
                      <Badge>{voiceLabel}</Badge>
                      <Badge tone={typed ? "neutral" : "accent"}>{inputLabel}</Badge>
                    </View>
                    {isSimul && (
                      <Text variant="footnote" tone="warn">
                        {simulLive
                          ? "Use headphones: recording starts together with the source audio."
                          : "Live interpreting needs voice transcription, which is not configured. You will type your rendition after listening."}
                      </Text>
                    )}
                    <Button title={isSimul && simulLive ? "Start source and recording" : turn === 0 ? "Play source speech" : `Play turn ${turn + 1}`} icon="play" onPress={listen} />
                    {sttLive && (
                      <Text variant="footnote" tone="accent" onPress={() => setTyped((v) => !v)} accessibilityRole="button" style={{ textAlign: "center" }}>
                        {typed ? "Use my voice instead" : "Type my rendition instead (no fluency score)"}
                      </Text>
                    )}
                  </Card>
                )}

                {(phase === "listening" || showRecorderCard) && (
                  <Card>
                    <View style={styles.between}>
                      <Text variant="footnote" tone="secondary" weight="600">
                        {`SOURCE · ${LANGUAGES[current.sourceLang].label.toUpperCase()}${current.speaker ? ` · ${current.speaker.toUpperCase()}` : ""}`}
                      </Text>
                      <Text variant="caption1" tone="tertiary">
                        {audio.engine === "server" ? "Studio voice" : "iPhone voice"}
                      </Text>
                    </View>
                    <PassageShape text={current.text} progress={audio.progress} />
                    {audio.state === "playing" && !isSimul && (
                      <Text variant="footnote" tone="secondary" style={{ textAlign: "center" }}>
                        Listen carefully. The rendition step opens when the speaker finishes.
                      </Text>
                    )}
                    {audio.state === "error" && (
                      <Text variant="footnote" tone="bad">
                        Audio could not be played: {audio.error}.{" "}
                        {phase === "listening" && !isSimul ? (
                          <Text variant="footnote" tone="accent" onPress={() => setPhase("ready")} accessibilityRole="button">
                            Continue without audio
                          </Text>
                        ) : null}
                      </Text>
                    )}
                  </Card>
                )}

                {showRecorderCard && (
                  <Card>
                    <View style={styles.between}>
                      <Text variant="footnote" tone="secondary" weight="600">
                        {`YOUR RENDITION · ${LANGUAGES[current.targetLang].label.toUpperCase()}`}
                      </Text>
                      <Text variant="body" tabular tone={rec.isRecording ? "bad" : "secondary"}>
                        {typed ? "" : fmtTime(rec.elapsed)}
                      </Text>
                    </View>

                    {typed ? (
                      <>
                        <TextField
                          value={typedText}
                          onChangeText={setTypedText}
                          editable={phase === "ready" || simulLive}
                          multiline
                          placeholder={`Write or dictate your rendition in ${LANGUAGES[current.targetLang].label}…`}
                          accessibilityLabel="Your rendition"
                          style={{ backgroundColor: c.cardElevated }}
                        />
                        {Platform.OS === "ios" && (
                          <Text variant="caption1" tone="tertiary">
                            Tip: tap the microphone key on the keyboard to dictate.
                          </Text>
                        )}
                        {phase === "ready" && <Button title="Submit rendition" trailingIcon="arrow" onPress={stopRendition} disabled={!typedText.trim()} />}
                      </>
                    ) : (
                      <>
                        <LiveBars level={rec.level} active={rec.isRecording} color={c.bad} />
                        {rec.error && (
                          <Text variant="footnote" tone="bad">
                            {rec.error}
                          </Text>
                        )}
                        {phase === "ready" && <Button title="Start rendition" icon="mic" onPress={startRendition} />}
                        {(phase === "recording" || (simulLive && phase === "listening")) && (
                          <View style={{ alignItems: "center", gap: 8 }}>
                            <Pressable
                              onPress={stopRendition}
                              accessibilityRole="button"
                              accessibilityLabel="Stop and submit rendition"
                              style={({ pressed }) => [styles.stop, { backgroundColor: c.bad, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                            >
                              <Icon name="stop" size={24} color="#FFFFFF" />
                            </Pressable>
                            <Text variant="footnote" tone="secondary" style={{ textAlign: "center" }}>
                              {simulEnded ? "Source finished. Complete your sentence; recording stops in a few seconds." : "Tap to stop when you have finished"}
                            </Text>
                          </View>
                        )}
                        {phase === "transcribing" && (
                          <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" }}>
                            <ActivityIndicator />
                            <Text variant="subheadline" tone="secondary">
                              Transcribing…
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                    {phase === "ready" && sttLive && (
                      <Text variant="footnote" tone="accent" onPress={() => setTyped((v) => !v)} accessibilityRole="button" style={{ textAlign: "center" }}>
                        {typed ? "Use my voice instead" : "Type my rendition instead"}
                      </Text>
                    )}
                  </Card>
                )}

                {allowNotes && (phase === "listening" || phase === "ready" || phase === "recording") && (
                  <Card>
                    <Pressable onPress={() => setNotesOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: notesOpen }} style={styles.between}>
                      <Text variant="headline">Consecutive notepad</Text>
                      <Text variant="footnote" tone="secondary">
                        {notesOpen ? "Hide" : "Show"} · not saved
                      </Text>
                    </Pressable>
                    {notesOpen && (
                      <TextField value={notes} onChangeText={setNotes} multiline placeholder="Symbols, key words, numbers…" accessibilityLabel="Notepad" style={{ backgroundColor: c.cardElevated, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) }} />
                    )}
                  </Card>
                )}

                {phase === "review" && (
                  <Card>
                    <Text variant="title3">Review transcript</Text>
                    <Text variant="subheadline" tone="secondary">
                      Correct obvious recognition errors only. Do not improve your rendition: the evaluation should reflect what you actually said.
                    </Text>
                    {notice && (
                      <Text variant="footnote" tone="warn">
                        {notice}
                      </Text>
                    )}
                    {plan.turns.map((t, i) => (
                      <View key={t.id} style={{ gap: 6 }}>
                        <Text variant="footnote" tone="secondary">
                          {isDialogue ? `Turn ${i + 1} · ${t.speaker} → ${LANGUAGES[t.targetLang].label}` : `Rendition · ${LANGUAGES[t.targetLang].label}`}
                          {captures[i]?.durationSec ? ` · ${fmtTime(captures[i].durationSec!)}` : ""}
                          {captures[i]?.source === "server" ? " · transcribed" : ""}
                        </Text>
                        <TextField
                          value={captures[i]?.transcript ?? ""}
                          onChangeText={(text) => setCaptures((p) => p.map((x, j) => (j === i ? { ...x, transcript: text } : x)))}
                          multiline
                          accessibilityLabel={`Transcript, turn ${i + 1}`}
                          placeholder="Nothing was captured. Type what you said."
                          style={{ backgroundColor: c.cardElevated, minHeight: isDialogue ? 90 : 160 }}
                        />
                      </View>
                    ))}
                    <Button title={plan.probes?.length ? "Continue to detail check" : "Evaluate my rendition"} trailingIcon="arrow" onPress={() => (plan.probes?.length ? setPhase("probes") : evaluate())} />
                    <Button
                      title="Discard and restart"
                      variant="plain"
                      onPress={() =>
                        Alert.alert("Discard this attempt?", "Your rendition will be deleted.", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Discard", style: "destructive", onPress: onRestart },
                        ])
                      }
                    />
                  </Card>
                )}

                {phase === "probes" && plan.probes && (
                  <Card>
                    <Text variant="title3">Detail check</Text>
                    <Text variant="subheadline" tone="secondary">
                      Answer from memory. Short answers are fine.
                    </Text>
                    {plan.probes.map((p) => (
                      <View key={p.unitId} style={{ gap: 6 }}>
                        <Text variant="callout">{p.question[cfg.targetLang]}</Text>
                        <TextField
                          value={probeAnswers[p.unitId] ?? ""}
                          onChangeText={(text) => setProbeAnswers((a) => ({ ...a, [p.unitId]: text }))}
                          accessibilityLabel={p.question[cfg.targetLang]}
                          returnKeyType="done"
                          style={{ backgroundColor: c.cardElevated }}
                        />
                      </View>
                    ))}
                    <Button title="Evaluate" trailingIcon="arrow" onPress={evaluate} />
                  </Card>
                )}

                {phase === "evaluating" && (
                  <Card>
                    <View style={{ alignItems: "center", gap: 12, paddingVertical: 20 }}>
                      <ActivityIndicator size="large" />
                      <Text variant="headline">Evaluating meaning, not wording…</Text>
                      <Text variant="subheadline" tone="secondary" style={{ textAlign: "center" }}>
                        {status?.evaluation.live
                          ? "The AI evaluator is comparing your rendition with the speaker's intended meaning. This can take a few seconds."
                          : "The demo evaluator is matching your rendition against the passage's annotated meaning units."}
                      </Text>
                    </View>
                  </Card>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  stop: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
