import { NextResponse } from "next/server";
import { guard } from "@/lib/api/guard";
import { getSttAdapter } from "@/lib/speech/server";

export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // Gemini inline audio limit is ~20 MB per request

/**
 * Server speech-to-text. Audio is processed in memory and never persisted here.
 * Returns 501 when no provider is configured so the client uses browser recognition.
 */
export async function POST(request: Request) {
  const denied = await guard(request, "transcribe", 20);
  if (denied) return denied;
  const adapter = getSttAdapter();
  if (!adapter) return NextResponse.json({ error: "No speech-to-text provider configured", demo: true }, { status: 501 });
  const form = await request.formData();
  const audio = form.get("audio");
  const lang = form.get("lang") === "es" ? "es" : "en";
  if (!(audio instanceof Blob)) return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "Recording too large" }, { status: 413 });
  try {
    const transcript = await adapter.transcribe(audio, lang);
    return NextResponse.json({ transcript, provider: adapter.id });
  } catch (err) {
    console.error("[api/transcribe]", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
