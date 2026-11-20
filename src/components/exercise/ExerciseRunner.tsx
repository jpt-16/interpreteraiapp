"use client";
import { ArrowRight, Headphones, Keyboard, Loader2, Mic, NotebookPen, Play, RotateCcw, Square, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { useData } from "@/lib/data/store";
import { newId } from "@/lib/data/repository";
import { requestEvaluation } from "@/lib/eval/client";
import { mergeEvaluations } from "@/lib/eval/merge";
import { DIFFICULTY, EXERCISE_TYPES, LANGUAGES, langPairLabel } from "@/lib/exercises/catalog";
import { hasSpeechRecognition, startRecognizer, type LiveRecognizer } from "@/lib/speech/browser";
import type { Evaluation, PracticeSession, TranscriptionSource } from "@/lib/types";
import { EvaluationReport } from "./EvaluationReport";
import type { ExercisePlan } from "./plan";
import { usePassagePlayer } from "./usePassagePlayer";
import { useRecorder } from "./useRecorder";
import { LiveWaveform, PassageWaveform } from "./Waveform";

type Phase = "brief" | "listening" | "ready" | "recording" | "transcribing" | "review" | "probes" | "evaluating" | "results";

interface Capture {
  transcript: string;
  durationSec: number | null;
  source: TranscriptionSource;
  blob: Blob | null;
  firstSpeechOffsetSec: number | null;
}

const STEPS = ["Listen", "Render", "Review", "Feedback"] as const;

function stepIndex(phase: Phase) {
  if (phase === "brief" || phase === "listening") return 0;
  if (phase === "ready" || phase === "recording" || phase === "transcribing") return 1;
  if (phase === "review" || phase === "probes") return 2;
  return 3;
}

function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ExerciseRunner({ plan, onRestart }: { plan: ExercisePlan; onRestart: () => void }) {
  const { status, prefs, terms, saveSession } = useData();
  const cfg = plan.config;
  const isSimul = cfg.type === "simultaneous";
  const isDialogue = plan.turns.length > 1;
  const allowNotes = cfg.type === "consecutive" || cfg.type === "dialogue";

  const [phase, setPhase] = useState<Phase>("brief");
  const [turn, setTurn] = useState(0);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [typed, setTyped] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [probeAnswers, setProbeAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ evaluation: Evaluation; warning?: string; session?: PracticeSession } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [simulEnded, setSimulEnded] = useState(false);

  const listeningSecRef = useRef(0);
  const recognizerRef = useRef<LiveRecognizer | null>(null);
  const sourceStartRef = useRef<number>(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = usePassagePlayer({ useServer: Boolean(status?.tts.live), preferredVoice: undefined });
  const recorder = useRecorder();
  const current = plan.turns[turn];
  const serverStt = Boolean(status?.stt.live);
  const browserStt = !serverStt && hasSpeechRecognition();

  // Warn before leaving mid-exercise
  useEffect(() => {
    const active = phase === "listening" || phase === "recording" || phase === "ready";
    if (!active) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  useEffect(
    () => () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      recognizerRef.current?.stop();
    },
    [],
  );

  /* ---------------------------- capture helpers --------------------------- */

  const beginCapture = useCallback(async () => {
    setLiveText("");
    if (typed) return true;
    const ok = await recorder.start();
    if (!ok) return false;
    if (browserStt) recognizerRef.current = startRecognizer(current.targetLang, setLiveText);
    return true;
  }, [typed, recorder, browserStt, current]);

  const endCapture = useCallback(async (): Promise<Capture> => {
    if (typed) {
      const t = typedText.trim();
      setTypedText("");
      return { transcript: t, durationSec: null, source: "typed", blob: null, firstSpeechOffsetSec: null };
    }
    const [{ blob, durationSec }, rec] = await Promise.all([
      recorder.stop(),
      recognizerRef.current ? recognizerRef.current.stop() : Promise.resolve(null),
    ]);
    recognizerRef.current = null;
    let transcript = rec?.transcript ?? "";
    let source: TranscriptionSource = rec ? "browser" : "typed";
    const firstSpeechOffsetSec =
      isSimul && rec?.firstResultAt ? Math.max(0, (rec.firstResultAt - sourceStartRef.current) / 1000) : null;

    if (serverStt && blob) {
      setPhase("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "rendition.webm");
        form.append("lang", current.targetLang);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        if (res.ok) {
          transcript = ((await res.json()) as { transcript: string }).transcript;
          source = "server";
        }
      } catch {
        /* keep browser transcript if any */
      }
    }
    return { transcript, durationSec, source, blob, firstSpeechOffsetSec };
  }, [typed, typedText, recorder, serverStt, current, isSimul]);

  const finishTurn = useCallback(
    (cap: Capture) => {
      setCaptures((prev) => {
        const next = [...prev];
        next[turn] = cap;
        return next;
      });
      recorder.reset();
      if (turn < plan.turns.length - 1) {
        setTurn((t) => t + 1);
        setPhase("brief");
      } else {
        setPhase("review");
      }
    },
    [turn, plan.turns.length, recorder],
  );

  /* ------------------------------ phase actions ---------------------------- */

  const listen = useCallback(async () => {
    setSimulEnded(false);
    if (isSimul) {
      const ok = await beginCapture();
      if (!ok && !typed) {
        // Could not access the microphone: fall back to typed mode for this exercise.
        setTyped(true);
      }
    }
    setPhase("listening");
    sourceStartRef.current = performance.now();
    const secs = await player.play({ segments: current.segments, lang: current.sourceLang, rate: plan.speechRate });
    listeningSecRef.current += secs;
    if (isSimul) {
      setSimulEnded(true);
      autoStopRef.current = setTimeout(() => {
        document.getElementById("stop-rendition")?.click();
      }, 8000);
    } else {
      setPhase("ready");
    }
  }, [isSimul, beginCapture, typed, player, current, plan.speechRate]);

  const startRendition = useCallback(async () => {
    const ok = await beginCapture();
    if (ok) setPhase("recording");
  }, [beginCapture]);

  const stopRendition = useCallback(async () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    player.stop();
    const cap = await endCapture();
    finishTurn(cap);
  }, [endCapture, finishTurn, player]);

  const updateTranscript = (i: number, text: string) =>
    setCaptures((prev) => prev.map((c, j) => (j === i ? { ...c, transcript: text } : c)));

  const evaluate = useCallback(async () => {
    setPhase("evaluating");
    const glossaryFor = (src: string) =>
      terms
        .map((t) => (t.sourceLang === src ? { source: t.source, target: t.target } : { source: t.target, target: t.source }))
        .slice(0, 80);

    const results = await Promise.all(
      plan.turns.map((t, i) => {
        const cap = captures[i] ?? { transcript: "", durationSec: null, source: "typed" as const, blob: null, firstSpeechOffsetSec: null };
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
    const warning = results.find((r) => r.warning)?.warning;

    const transcript = isDialogue
      ? plan.turns.map((t, i) => `[${t.speaker}] ${captures[i]?.transcript ?? ""}`).join("\n")
      : (captures[0]?.transcript ?? "");
    const responseSec = captures.reduce((a, c) => a + (c?.durationSec ?? 0), 0);
    const session: PracticeSession = {
      id: newId(),
      createdAt: new Date().toISOString(),
      config: cfg,
      exerciseTitle: plan.title,
      sourceText: isDialogue ? plan.turns.map((t) => `[${t.speaker}] ${t.text}`).join("\n") : plan.turns[0].text,
      wordCount: plan.turns.reduce((a, t) => a + t.wordCount, 0),
      unitCount: plan.turns.reduce((a, t) => a + t.units.length, 0),
      durationSec: Math.round(listeningSecRef.current + responseSec),
      response: {
        transcript,
        durationSec: responseSec || null,
        transcriptionSource: captures[0]?.source ?? "typed",
        firstSpeechOffsetSec: captures[0]?.firstSpeechOffsetSec ?? null,
      },
      evaluation,
    };
    let saved: PracticeSession | undefined;
    try {
      saved = await saveSession(session, isDialogue ? null : (captures[0]?.blob ?? null));
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save this session.");
    }
    setResult({ evaluation, warning, session: saved });
    setPhase("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [plan, captures, cfg, terms, probeAnswers, isDialogue, saveSession]);

  const recordingUrl = useMemo(() => {
    const b = captures[0]?.blob;
    return b && phase === "review" && !isDialogue ? URL.createObjectURL(b) : null;
  }, [captures, phase, isDialogue]);
  useEffect(() => () => void (recordingUrl && URL.revokeObjectURL(recordingUrl)), [recordingUrl]);

  /* --------------------------------- render -------------------------------- */

  const typeInfo = EXERCISE_TYPES[cfg.type];
  const step = stepIndex(phase);
  const ttsLabel = status?.tts.live ? `Server voice (${status.tts.provider})` : "Browser voice (demo)";
  const sttLabel = typed ? "Typed" : serverStt ? `Server transcription (${status?.stt.provider})` : browserStt ? "Browser recognition (demo)" : "No recognition available";

  return (
    <div className="min-h-screen">
      {/* Focus-mode top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[960px] items-center gap-3 px-4">
          <Link href="/practice" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Exit exercise">
            <X size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium text-ink">{typeInfo.label}</div>
          </div>
          <div className="hidden items-center gap-1.5 sm:flex">
            {isDialogue ? <Badge>EN ⇄ ES</Badge> : <Badge>{langPairLabel(cfg.sourceLang, cfg.targetLang)}</Badge>}
            <Badge>Level {cfg.difficulty} · {DIFFICULTY[cfg.difficulty].label}</Badge>
          </div>
        </div>
        <div className="mx-auto flex max-w-[960px] items-center gap-2 px-4 pb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-surface-3")} />
              <span className={cn("hidden text-[11px] uppercase tracking-wider sm:inline", i === step ? "text-ink-2" : "text-faint")}>{s}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-[960px] px-4 py-8">
        {phase === "results" && result ? (
          <div className="animate-rise">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{plan.title}</h1>
                <p className="text-[13px] text-muted">
                  {result.session ? "Saved to your history." : "This session could not be saved."} {saveError}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onRestart}>
                  <RotateCcw size={15} /> New passage
                </Button>
                <ButtonLink href="/analytics" variant="secondary">
                  Analytics
                </ButtonLink>
                <ButtonLink href="/practice">Practice Center</ButtonLink>
              </div>
            </div>
            <EvaluationReport
              evaluation={result.evaluation}
              config={cfg}
              warning={result.warning}
              sourceText={result.session?.sourceText ?? plan.turns.map((t) => t.text).join("\n")}
              transcript={result.session?.response.transcript ?? captures.map((c) => c?.transcript).join("\n")}
              units={plan.turns.flatMap((t) => t.units)}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-[720px] animate-rise">
            <div className="mb-6 text-center">
              <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
                {isDialogue ? `Turn ${turn + 1} of ${plan.turns.length}` : typeInfo.short}
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{plan.title}</h1>
              <p className="mt-1.5 text-[14px] text-muted">{plan.context}</p>
            </div>

            {/* ------------------------- brief ------------------------- */}
            {phase === "brief" && (
              <Card className="p-6">
                {turn === 0 && (
                  <ol className="mb-6 space-y-2.5">
                    {typeInfo.instructions.map((i, n) => (
                      <li key={n} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
                        <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-[12px] text-muted">
                          {n + 1}
                        </span>
                        {i}
                      </li>
                    ))}
                  </ol>
                )}
                {isDialogue && (
                  <div className="mb-6 rounded-lg border border-line bg-surface-2/50 p-4 text-[13.5px]">
                    <span className="text-muted">Next speaker:</span>{" "}
                    <span className="font-medium text-ink">{current.speaker}</span>{" "}
                    <span className="text-muted">
                      ({LANGUAGES[current.sourceLang].label}) — interpret into {LANGUAGES[current.targetLang].label}
                    </span>
                  </div>
                )}
                <div className="grid gap-3 text-[12.5px] text-muted sm:grid-cols-3">
                  <div className="rounded-lg border border-line px-3 py-2">
                    <div className="text-faint">Passage</div>
                    <div className="tabular text-ink-2">
                      {current.wordCount} words · ~{fmtTime((current.wordCount / 150 / plan.speechRate) * 60)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-line px-3 py-2">
                    <div className="text-faint">Audio</div>
                    <div className="text-ink-2">{ttsLabel}</div>
                  </div>
                  <div className="rounded-lg border border-line px-3 py-2">
                    <div className="text-faint">Transcript</div>
                    <div className="text-ink-2">{sttLabel}</div>
                  </div>
                </div>
                {isSimul && (
                  <p className="mt-4 flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
                    <Headphones size={14} /> Use headphones: recording starts with the source audio.
                  </p>
                )}
                {!recorder.supported && !typed && (
                  <p className="mt-4 text-[12.5px] text-warn">Recording is not supported in this browser — you can type your rendition.</p>
                )}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <Button size="lg" onClick={listen} className="min-w-[220px]">
                    <Play size={16} /> {isSimul ? "Start source & recording" : turn === 0 ? "Play source speech" : `Play turn ${turn + 1}`}
                  </Button>
                  <button
                    onClick={() => setTyped((v) => !v)}
                    className="flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink-2"
                    aria-pressed={typed}
                  >
                    <Keyboard size={13} /> {typed ? "Use microphone instead" : "Type my rendition instead (no fluency score)"}
                  </button>
                </div>
              </Card>
            )}

            {/* ------------------------ listening ----------------------- */}
            {(phase === "listening" || phase === "ready" || phase === "recording" || phase === "transcribing") && (
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="mb-3 flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium uppercase tracking-wider text-muted">
                      <span className={cn("h-1.5 w-1.5 rounded-full", player.state === "playing" ? "bg-accent" : "bg-faint")} />
                      Source · {LANGUAGES[current.sourceLang].label}
                      {current.speaker && ` · ${current.speaker}`}
                    </span>
                    <span className="text-faint">{player.engine === "browser" ? "Browser voice (demo)" : "Server voice"}</span>
                  </div>
                  <PassageWaveform text={current.text} progress={player.progress} live={player.state === "playing"} getLevel={player.getLevel} />
                  {player.state === "loading" && <p className="mt-3 text-center text-[12.5px] text-muted">Preparing audio…</p>}
                  {player.error && (
                    <div className="mt-3 text-center text-[12.5px] text-bad">
                      {player.error}{" "}
                      <button className="underline" onClick={() => setPhase("ready")}>
                        Continue without audio
                      </button>
                    </div>
                  )}
                  {phase === "listening" && !isSimul && player.state === "playing" && (
                    <p className="mt-3 text-center text-[13px] text-muted">Listen carefully. Recording opens when the speaker finishes.</p>
                  )}
                </Card>

                {(isSimul || phase !== "listening") && (
                  <Card className="p-6">
                    <div className="mb-3 flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 font-medium uppercase tracking-wider text-muted">
                        <span className={cn("h-1.5 w-1.5 rounded-full", recorder.state === "recording" ? "bg-bad" : "bg-faint")} />
                        Your rendition · {LANGUAGES[current.targetLang].label}
                      </span>
                      <span className="tabular text-ink-2">{typed ? "Typed" : fmtTime(recorder.elapsed)}</span>
                    </div>

                    {typed ? (
                      <textarea
                        value={typedText}
                        onChange={(e) => setTypedText(e.target.value)}
                        disabled={phase === "listening" && !isSimul}
                        rows={6}
                        placeholder={`Type your rendition in ${LANGUAGES[current.targetLang].label}…`}
                        className="w-full resize-y rounded-lg border border-line-strong bg-surface-2 p-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
                      />
                    ) : (
                      <LiveWaveform getLevel={recorder.getLevel} active={recorder.state === "recording"} color="#e5636b" />
                    )}

                    {!typed && liveText && recorder.state === "recording" && (
                      <p className="mt-3 line-clamp-2 text-center text-[12.5px] italic text-faint">{liveText}</p>
                    )}
                    {recorder.error && <p className="mt-3 text-center text-[12.5px] text-bad">{recorder.error}</p>}

                    <div className="mt-5 flex flex-col items-center gap-3">
                      {phase === "ready" && (
                        <>
                          {typed ? (
                            <Button size="lg" onClick={stopRendition} disabled={!typedText.trim()}>
                              Submit rendition <ArrowRight size={16} />
                            </Button>
                          ) : (
                            <Button size="lg" onClick={startRendition} className="min-w-[220px]">
                              <Mic size={16} /> Start rendition
                            </Button>
                          )}
                          {!typed && recorder.state === "error" && (
                            <button onClick={() => setTyped(true)} className="text-[12.5px] text-accent-strong hover:underline">
                              Type my rendition instead
                            </button>
                          )}
                        </>
                      )}
                      {(phase === "recording" || (isSimul && phase === "listening")) && (
                        <>
                          <button
                            id="stop-rendition"
                            onClick={stopRendition}
                            aria-label="Stop and submit rendition"
                            className="recording-pulse flex h-14 w-14 items-center justify-center rounded-full bg-bad text-white transition-transform hover:scale-105"
                          >
                            <Square size={18} fill="currentColor" />
                          </button>
                          <span className="text-[12.5px] text-muted">
                            {isSimul && simulEnded ? "Source finished — complete your sentence. Auto-stops in a few seconds." : "Stop when you have finished"}
                          </span>
                        </>
                      )}
                      {phase === "transcribing" && (
                        <span className="flex items-center gap-2 text-[13px] text-muted">
                          <Loader2 size={15} className="animate-spin" /> Transcribing…
                        </span>
                      )}
                    </div>
                  </Card>
                )}

                {allowNotes && (
                  <Card className="p-0">
                    <button onClick={() => setNotesOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-3 text-[13px] text-ink-2">
                      <span className="flex items-center gap-2">
                        <NotebookPen size={14} className="text-muted" /> Consecutive notepad
                      </span>
                      <span className="text-[12px] text-faint">{notesOpen ? "Hide" : "Show"} · not saved or evaluated</span>
                    </button>
                    {notesOpen && (
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={6}
                        placeholder="Symbols, key words, numbers…"
                        className="block w-full resize-y border-t border-line bg-transparent p-4 font-mono text-[13px] text-ink outline-none placeholder:text-faint"
                      />
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* -------------------------- review ------------------------ */}
            {phase === "review" && (
              <Card className="p-6">
                <h2 className="text-[15px] font-medium text-ink">Review transcript</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Correct obvious recognition errors only. Do not improve your rendition — the evaluation should reflect what you actually said.
                </p>
                <div className="mt-5 space-y-5">
                  {plan.turns.map((t, i) => (
                    <div key={t.id}>
                      <div className="mb-1.5 flex items-center justify-between text-[12px] text-muted">
                        <span>
                          {isDialogue ? `Turn ${i + 1} · ${t.speaker} → ${LANGUAGES[t.targetLang].label}` : `Rendition · ${LANGUAGES[t.targetLang].label}`}
                        </span>
                        <span>
                          {captures[i]?.source === "browser" && "Browser recognition"}
                          {captures[i]?.source === "server" && "Server transcription"}
                          {captures[i]?.source === "typed" && "Typed"}
                          {captures[i]?.durationSec ? ` · ${fmtTime(captures[i].durationSec!)}` : ""}
                        </span>
                      </div>
                      <textarea
                        value={captures[i]?.transcript ?? ""}
                        onChange={(e) => updateTranscript(i, e.target.value)}
                        rows={isDialogue ? 3 : 7}
                        placeholder={
                          captures[i]?.source === "browser" || !browserStt
                            ? "No speech was recognised. If you spoke, type what you said."
                            : ""
                        }
                        className="w-full resize-y rounded-lg border border-line-strong bg-surface-2 p-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
                      />
                    </div>
                  ))}
                </div>
                {recordingUrl && (
                  <div className="mt-4">
                    <div className="mb-1.5 text-[12px] text-muted">Your recording {prefs.storeRecordings ? `(stored for ${prefs.recordingRetentionDays} days)` : "(not stored)"}</div>
                    <audio controls src={recordingUrl} className="w-full" />
                  </div>
                )}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button variant="ghost" onClick={onRestart}>
                    <RotateCcw size={15} /> Discard & restart
                  </Button>
                  <Button size="lg" onClick={() => (plan.probes?.length ? setPhase("probes") : evaluate())}>
                    {plan.probes?.length ? "Continue to detail check" : "Evaluate my rendition"} <ArrowRight size={16} />
                  </Button>
                </div>
              </Card>
            )}

            {/* -------------------------- probes ------------------------ */}
            {phase === "probes" && plan.probes && (
              <Card className="p-6">
                <h2 className="text-[15px] font-medium text-ink">Detail check</h2>
                <p className="mt-1 text-[13px] text-muted">Answer from memory. Short answers are fine.</p>
                <div className="mt-5 space-y-4">
                  {plan.probes.map((p) => (
                    <label key={p.unitId} className="block">
                      <span className="mb-1.5 block text-[13.5px] text-ink-2">{p.question[cfg.targetLang]}</span>
                      <input
                        value={probeAnswers[p.unitId] ?? ""}
                        onChange={(e) => setProbeAnswers((a) => ({ ...a, [p.unitId]: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-line-strong bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button size="lg" onClick={evaluate}>
                    Evaluate <ArrowRight size={16} />
                  </Button>
                </div>
              </Card>
            )}

            {/* ------------------------- evaluating --------------------- */}
            {phase === "evaluating" && (
              <Card className="flex flex-col items-center p-10 text-center">
                <Loader2 size={26} className="animate-spin text-accent" />
                <p className="mt-4 text-[15px] font-medium text-ink">Evaluating meaning, not wording…</p>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
                  {status?.evaluation.live
                    ? "The AI evaluator is comparing your rendition with the speaker's intended meaning. This can take up to a minute."
                    : "The demo evaluator is matching your rendition against the passage's annotated meaning units."}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
