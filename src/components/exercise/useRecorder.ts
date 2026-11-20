"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "stopped" | "error";

/**
 * Microphone recording with a live level meter and timer.
 * Audio stays in memory; it is only uploaded if the user has opted in to
 * storing recordings (Settings → Privacy).
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const supported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const start = useCallback(async () => {
    setError(null);
    if (!supported) {
      setError("Recording is not supported in this browser.");
      setState("error");
      return false;
    }
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start(1000);
      recorderRef.current = rec;
      startRef.current = performance.now();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((performance.now() - startRef.current) / 1000), 200);
      setState("recording");
      return true;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings, or type your rendition instead."
          : name === "NotFoundError"
            ? "No microphone was found. You can type your rendition instead."
            : "Could not start recording.",
      );
      setState("error");
      cleanup();
      return false;
    }
  }, [supported, cleanup]);

  const stop = useCallback(async (): Promise<{ blob: Blob | null; durationSec: number }> => {
    const rec = recorderRef.current;
    const durationSec = (performance.now() - startRef.current) / 1000;
    if (!rec || rec.state === "inactive") {
      cleanup();
      setState("stopped");
      return { blob: null, durationSec: 0 };
    }
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    cleanup();
    setElapsed(durationSec);
    setState("stopped");
    return { blob, durationSec };
  }, [cleanup]);

  const getLevel = useCallback(() => {
    const a = analyserRef.current;
    if (!a) return 0;
    bufRef.current ??= new Uint8Array(a.fftSize) as Uint8Array<ArrayBuffer>;
    a.getByteTimeDomainData(bufRef.current);
    let sum = 0;
    for (const v of bufRef.current) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / bufRef.current.length) * 4);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setElapsed(0);
    setError(null);
  }, []);

  return { state, elapsed, error, supported, start, stop, getLevel, reset };
}
