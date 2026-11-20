import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/exercises/catalog";
import type { Lang } from "@/lib/types";
import { synthesize } from "~/data/api";

export type PlayerState = "idle" | "playing" | "ended" | "error";

interface Passage {
  segments: string[];
  lang: Lang;
  rate: number;
}

const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Plays a source passage. With a server voice configured, the audio is fetched
 * once per (text, language, rate) and cached on the device, so repeated
 * passages cost nothing. Otherwise it uses the iPhone's built-in voices.
 */
export function useSourceAudio(useServerVoice: boolean) {
  const [state, setState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(0);
  const [engine, setEngine] = useState<"server" | "device">(useServerVoice ? "server" : "device");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const stop = useCallback(() => {
    cancelled.current = true;
    stopTimer();
    Speech.stop();
    try {
      playerRef.current?.pause();
      playerRef.current?.remove();
    } catch {
      /* already released */
    }
    playerRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => stop, [stop]);

  /** Speech-activity visualisation: neither engine exposes live amplitude, so this follows speaking state. */
  const startActivity = () => {
    stopTimer();
    timer.current = setInterval(() => setLevel(0.25 + Math.random() * 0.6), 90);
  };

  const playDevice = useCallback(async ({ segments, lang, rate }: Passage) => {
    const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
    const match = voices.filter((v) => v.language.toLowerCase().startsWith(lang));
    const voice = match.find((v) => String(v.quality) === "Enhanced") ?? match[0];
    const total = segments.reduce((a, s) => a + wordsOf(s), 0) || 1;
    let done = 0;
    for (const seg of segments) {
      if (cancelled.current) return;
      const w = wordsOf(seg);
      const started = Date.now();
      const expected = (w / (150 * rate)) * 60_000;
      const tick = setInterval(() => setProgress(Math.min(0.999, (done + w * Math.min(0.98, (Date.now() - started) / expected)) / total)), 150);
      await new Promise<void>((resolve, reject) => {
        Speech.speak(seg, {
          language: LANGUAGES[lang].bcp47,
          voice: voice?.identifier,
          rate,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: (e) => reject(e),
        });
      }).finally(() => clearInterval(tick));
      done += w;
      setProgress(done / total);
      await sleep(260 / rate);
    }
  }, []);

  const playServer = useCallback(async ({ segments, lang, rate }: Passage) => {
    const text = segments.join(" ");
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${lang}|${rate}|${text}`);
    const dir = new Directory(Paths.cache, "tts");
    if (!dir.exists) dir.create();
    const file = new File(dir, `${key}.wav`);
    if (!file.exists) {
      const audio = await synthesize(text, lang, rate);
      if (!audio) throw new Error("server-voice-unavailable");
      file.create();
      file.write(audio.bytes);
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    const player = createAudioPlayer(file.uri);
    playerRef.current = player;
    await new Promise<void>((resolve, reject) => {
      const sub = player.addListener("playbackStatusUpdate", (s) => {
        if (s.duration > 0) setProgress(Math.min(1, s.currentTime / s.duration));
        if (s.error) {
          sub.remove();
          reject(new Error(s.error));
        } else if (s.didJustFinish) {
          sub.remove();
          resolve();
        }
      });
      player.play();
    });
    player.remove();
    playerRef.current = null;
  }, []);

  /** Resolves with the seconds spent listening. */
  const play = useCallback(
    async (p: Passage) => {
      cancelled.current = false;
      setError(null);
      setProgress(0);
      setState("playing");
      startActivity();
      const t0 = Date.now();
      try {
        if (useServerVoice) {
          try {
            setEngine("server");
            await playServer(p);
          } catch (e) {
            if (cancelled.current) return 0;
            if (!(e instanceof Error) || e.message !== "server-voice-unavailable") throw e;
            setEngine("device");
            await playDevice(p);
          }
        } else {
          setEngine("device");
          await playDevice(p);
        }
        if (!cancelled.current) {
          setProgress(1);
          setState("ended");
        }
      } catch (e) {
        setError((e instanceof Error && e.message) || "no voice is available on this device");
        setState("error");
      } finally {
        stopTimer();
        setLevel(0);
      }
      return (Date.now() - t0) / 1000;
    },
    [useServerVoice, playServer, playDevice],
  );

  return { state, progress, level, engine, error, play, stop };
}
