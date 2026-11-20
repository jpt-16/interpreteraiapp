import { NextResponse } from "next/server";
import { guard } from "@/lib/api/guard";
import { evaluate } from "@/lib/eval";
import type { EvaluationRequest } from "@/lib/eval/types";

export const maxDuration = 120;

const MAX_TRANSCRIPT = 20_000;

export async function POST(request: Request) {
  const denied = await guard(request, "evaluate", 12);
  if (denied) return denied;
  let body: EvaluationRequest;
  try {
    body = (await request.json()) as EvaluationRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.exercise?.text || !Array.isArray(body.exercise.units) || typeof body.response?.transcript !== "string") {
    return NextResponse.json({ error: "Missing exercise or response" }, { status: 400 });
  }
  if (body.response.transcript.length > MAX_TRANSCRIPT || body.exercise.text.length > MAX_TRANSCRIPT) {
    return NextResponse.json({ error: "Input too long" }, { status: 413 });
  }
  try {
    const result = await evaluate(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/evaluate]", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
