import { NextResponse } from "next/server";
import { getTtsAdapter } from "@/lib/speech/server";

export const maxDuration = 60;

/** Server text-to-speech. Returns 501 when no provider is configured (client uses browser speech). */
export async function POST(request: Request) {
  const adapter = getTtsAdapter();
  if (!adapter) return NextResponse.json({ error: "No text-to-speech provider configured", demo: true }, { status: 501 });
  const body = (await request.json().catch(() => null)) as { text?: string; lang?: string; rate?: number } | null;
  if (!body?.text || body.text.length > 6000) return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  try {
    const { audio, contentType } = await adapter.synthesize(body.text, body.lang === "es" ? "es" : "en", Number(body.rate) || 1);
    return new Response(audio, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    console.error("[api/tts]", err);
    return NextResponse.json({ error: "Speech synthesis failed" }, { status: 502 });
  }
}
