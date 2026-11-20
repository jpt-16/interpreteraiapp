"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasSpeechSynthesis, pickVoice } from "@/lib/speech/browser";
import type { Lang } from "@/lib/types";

export type PlayerState = "idle" | "loading" | "playing" | "ended" | "error";
export type AudioEngine = "server" | "browser";

interface PassageAudio {
  segments: string[];
  lang: Lang;
  rate: number;
}

/**
 * Plays a passage either from server TTS (real audio + analyser) or the
 * browser's speechSynthesis (segment by segment, which also avoids long
 * utterance cut-offs). Exposes progress and an amplitude source for the
 * waveform.
 */
export function usePassagePlayer({ useServer, preferredVoice }: { useServer: boolean; preferredVoice?: string }) {
  const [state, setState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);
  const [engine, setEngine] = useState<AudioEngine>(useServer ? "server" : "browser");
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const speakingRef = useRef(false);
  const boundaryRef = useRef(0);
  const cancelledRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const bufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    speakingRef.current = false;
  }, []);

  useEffect(() => () => {
    stop();
    ctxRef.current?.close().catch(() => undefined);
  }, [stop]);

  const playBrowser = useCallback(
    async ({ segments, lang, rate }: PassageAudio) => {
      if (!hasSpeechSynthesis()) throw new Error("This browser cannot synthesise speech.");
      const voice = await pickVoice(lang, preferredVoice);
      const totalChars = segments.reduce((a, s) => a + s.length, 0) || 1;
      let doneChars = 0;
      window.speechSynthesis.cancel();
      for (const seg of segments) {
        if (cancelledRef.current) return;
        await new Promise<void>((resolve, reject) => {
          const u = new SpeechSynthesisUtterance(seg);
          u.lang = voice?.lang ?? (lang === "en" ? "en-US" : "es-ES");
          if (voice) u.voice = voice;
          u.rate = rate;
          u.onstart = () => (speakingRef.current = true);
          u.onboundary = (e) => {
            boundaryRef.current = performance.now();
            setProgress(Math.min(0.999, (doneChars + e.charIndex) / totalChars));
          };
          u.onend = () => {
            speakingRef.current = false;
            resolve();
          };
          u.onerror = (e) => {
            speakingRef.current = false;
            if (e.error === "interrupted" || e.error === "canceled") resolve();
            else reject(new Error(`Speech synthesis error: ${e.error}`));
          };
          window.speechSynthesis.speak(u);
        });
        doneChars += seg.length;
        setProgress(doneChars / totalChars);
        // natural pause between sentences
        await new Promise((r) => setTimeout(r, 280 / rate));
      }
    },
    [preferredVoice],
  );

  const playServer = useCallback(async ({ segments, lang, rate }: PassageAudio) => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: segments.join(" "), lang, rate }),
    });
    if (!res.ok) throw new Error("server-tts-unavailable");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    await ctx.resume();
    await new Promise<void>((resolve, reject) => {
      audio.ontimeupdate = () => audio.duration && setProgress(audio.currentTime / audio.duration);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("Audio playback failed"));
      audio.play().catch(reject);
    });
    URL.revokeObjectURL(url);
  }, []);

  /** Plays the passage; resolves with the listening time in seconds when finished. */
  const play = useCallback(
    async (audio: PassageAudio) => {
      cancelledRef.current = false;
      setError(null);
      setProgress(0);
      setState("loading");
      startedAtRef.current = performance.now();
      try {
        if (useServer) {
          try {
            setState("playing");
            await playServer(audio);
            setEngine("server");
          } catch (e) {
            if (e instanceof Error && e.message === "server-tts-unavailable") {
              setEngine("browser");
              await playBrowser(audio);
            } else throw e;
          }
        } else {
          setEngine("browser");
          setState("playing");
          await playBrowser(audio);
        }
        if (cancelledRef.current) return 0;
        setProgress(1);
        setState("ended");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Playback failed");
        setState("error");
      }
      return (performance.now() - (startedAtRef.current ?? performance.now())) / 1000;
    },
    [useServer, playServer, playBrowser],
  );

  /** Amplitude 0..1 for the waveform. Synthetic for browser speech (no audio stream is exposed). */
  const getLevel = useCallback(() => {
    if (analyserRef.current && engine === "server" && audioRef.current && !audioRef.current.paused) {
      const a = analyserRef.current;
      bufRef.current ??= new Uint8Array(a.fftSize) as Uint8Array<ArrayBuffer>;
      a.getByteTimeDomainData(bufRef.current);
      let sum = 0;
      for (const v of bufRef.current) sum += ((v - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / bufRef.current.length) * 3.2);
    }
    if (!speakingRef.current) return 0;
    const sinceBoundary = performance.now() - boundaryRef.current;
    const syllable = 0.5 + 0.5 * Math.sin(performance.now() / 55);
    const envelope = sinceBoundary < 260 ? 1 : 0.65;
    return Math.min(1, (0.25 + 0.55 * syllable * Math.random()) * envelope);
  }, [engine]);

  return { state, progress, engine, error, play, stop, getLevel };
}
