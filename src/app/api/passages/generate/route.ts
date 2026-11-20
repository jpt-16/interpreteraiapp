import { NextResponse } from "next/server";
import { integrationStatus } from "@/lib/config/env";
import { normalizeConfig } from "@/lib/exercises/builder";
import { generatePassage } from "@/lib/exercises/ai-generate";
import type { ExerciseConfig } from "@/lib/types";

export const maxDuration = 120;

/** Generates a fresh, annotated source passage with Claude. 501 when no API key is configured. */
export async function POST(request: Request) {
  if (!integrationStatus().passageGeneration.live) {
    return NextResponse.json({ error: "AI passage generation is not configured", demo: true }, { status: 501 });
  }
  const body = (await request.json().catch(() => null)) as { config?: ExerciseConfig } | null;
  if (!body?.config?.type || !body.config.sourceLang) return NextResponse.json({ error: "Missing config" }, { status: 400 });
  try {
    return NextResponse.json(await generatePassage(normalizeConfig(body.config)));
  } catch (err) {
    console.error("[api/passages/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 502 });
  }
}
