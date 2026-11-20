import "server-only";
import { integrationStatus } from "@/lib/config/env";
import type { Lang } from "@/lib/types";

/**
 * Replaceable server-side speech adapters.
 * Each adapter is a plain function behind a provider id so vendors can be
 * swapped with STT_PROVIDER / TTS_PROVIDER without touching the UI.
 * When none is configured the client falls back to the browser's built-in
 * speech APIs (clearly labelled as demo mode).
 */

export interface SttAdapter {
  id: string;
  transcribe(audio: Blob, lang: Lang): Promise<string>;
}

export interface TtsAdapter {
  id: string;
  synthesize(text: string, lang: Lang, rate: number): Promise<{ audio: ArrayBuffer; contentType: string }>;
}

const openaiStt: SttAdapter = {
  id: "openai",
  async transcribe(audio, lang) {
    const form = new FormData();
    form.append("file", audio, "rendition.webm");
    form.append("model", process.env.OPENAI_STT_MODEL || "gpt-4o-transcribe");
    form.append("language", lang);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    });
    if (!res.ok) throw new Error(`OpenAI transcription failed: ${res.status}`);
    const json = (await res.json()) as { text?: string };
    return json.text ?? "";
  },
};

const deepgramStt: SttAdapter = {
  id: "deepgram",
  async transcribe(audio, lang) {
    const model = process.env.DEEPGRAM_MODEL || "nova-3";
    const res = await fetch(`https://api.deepgram.com/v1/listen?model=${model}&language=${lang}&smart_format=true&filler_words=true`, {
      method: "POST",
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, "Content-Type": audio.type || "audio/webm" },
      body: audio,
    });
    if (!res.ok) throw new Error(`Deepgram transcription failed: ${res.status}`);
    const json = (await res.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };
    return json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  },
};

const openaiTts: TtsAdapter = {
  id: "openai",
  async synthesize(text, lang, rate) {
    const voice = process.env.OPENAI_TTS_VOICE || (lang === "es" ? "nova" : "alloy");
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "tts-1-hd",
        voice,
        input: text,
        speed: Math.min(4, Math.max(0.25, rate)),
        response_format: "mp3",
      }),
    });
    if (!res.ok) throw new Error(`OpenAI speech synthesis failed: ${res.status}`);
    return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
  },
};

const elevenlabsTts: TtsAdapter = {
  id: "elevenlabs",
  async synthesize(text, lang, rate) {
    const voiceId =
      (lang === "es" ? process.env.ELEVENLABS_VOICE_ID_ES : process.env.ELEVENLABS_VOICE_ID_EN) ||
      process.env.ELEVENLABS_VOICE_ID;
    if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID is not set");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: Math.min(1.2, Math.max(0.7, rate)) },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs synthesis failed: ${res.status}`);
    return { audio: await res.arrayBuffer(), contentType: "audio/mpeg" };
  },
};

const STT: Record<string, SttAdapter> = { openai: openaiStt, deepgram: deepgramStt };
const TTS: Record<string, TtsAdapter> = { openai: openaiTts, elevenlabs: elevenlabsTts };

export function getSttAdapter(): SttAdapter | null {
  const s = integrationStatus().stt;
  return s.live ? STT[s.provider] ?? null : null;
}

export function getTtsAdapter(): TtsAdapter | null {
  const s = integrationStatus().tts;
  return s.live ? TTS[s.provider] ?? null : null;
}
