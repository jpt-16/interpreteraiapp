"use client";
import { LANGUAGES } from "@/lib/exercises/catalog";
import type { Lang } from "@/lib/types";

/**
 * Browser speech fallbacks used in demo mode:
 * - speechSynthesis for source audio (when no server TTS is configured)
 * - Web Speech API recognition for transcripts (when no server STT is configured)
 * Both are clearly labelled in the UI as browser/demo integrations.
 */

export function hasSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!hasSpeechSynthesis()) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1200);
  });
}

export async function pickVoice(lang: Lang, preferredURI?: string) {
  const voices = await loadVoices();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  return (
    matching.find((v) => v.voiceURI === preferredURI) ??
    matching.find((v) => /natural|neural|premium|enhanced|google/i.test(v.name)) ??
    matching.find((v) => v.lang === LANGUAGES[lang].bcp47) ??
    matching[0] ??
    null
  );
}

/* ------------------------------------------------------------------ */
/* Speech recognition                                                  */
/* ------------------------------------------------------------------ */

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function hasSpeechRecognition() {
  return recognitionCtor() !== null;
}

export interface LiveRecognizer {
  stop(): Promise<{ transcript: string; firstResultAt: number | null }>;
  current(): string;
  error(): string | null;
}

/** Continuous recognition that restarts itself after Chrome's silence timeouts. */
export function startRecognizer(lang: Lang, onUpdate?: (text: string) => void): LiveRecognizer | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  let finals: string[] = [];
  let interim = "";
  let active = true;
  let firstResultAt: number | null = null;
  let lastError: string | null = null;
  let rec: RecognitionLike;
  let endResolver: (() => void) | null = null;

  const spawn = () => {
    rec = new Ctor();
    rec.lang = LANGUAGES[lang].bcp47;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      if (firstResultAt === null) firstResultAt = performance.now();
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals.push(r[0].transcript.trim());
        else interim += r[0].transcript;
      }
      onUpdate?.(text());
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") lastError = e.error;
    };
    rec.onend = () => {
      if (active && !lastError) {
        try {
          spawn();
        } catch {
          /* ignore */
        }
      } else endResolver?.();
    };
    rec.start();
  };

  const text = () => [...finals, interim.trim()].filter(Boolean).join(" ");

  try {
    spawn();
  } catch {
    return null;
  }

  return {
    current: text,
    error: () => lastError,
    stop: () =>
      new Promise((resolve) => {
        active = false;
        const finish = () => {
          const t = text();
          finals = [];
          resolve({ transcript: t, firstResultAt });
        };
        endResolver = finish;
        try {
          rec.stop();
        } catch {
          finish();
        }
        setTimeout(finish, 1500);
      }),
  };
}
