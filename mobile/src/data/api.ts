import { Platform } from "react-native";
import { evaluateHeuristic } from "@/lib/eval/heuristic";
import type { EvaluationRequest } from "@/lib/eval/types";
import type { Evaluation, ExerciseConfig, MeaningUnit } from "@/lib/types";
import { API_KEY, API_URL, hasApi } from "./config";
import { getSupabase } from "./supabase";

export interface ServiceStatus {
  supabase: boolean;
  evaluation: { provider: string; model: string | null; live: boolean };
  passageGeneration: { live: boolean };
  stt: { provider: string; live: boolean };
  tts: { provider: string; live: boolean };
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (API_KEY) headers["x-api-key"] = API_KEY;
  return headers;
}

async function call(path: string, init: RequestInit & { json?: unknown } = {}, timeoutMs = 90_000) {
  const { json, headers, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(await authHeaders()), ...(headers as Record<string, string>) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStatus(): Promise<ServiceStatus | null> {
  if (!hasApi) return null;
  try {
    const res = await call("/api/status", {}, 8000);
    return res.ok ? ((await res.json()) as ServiceStatus) : null;
  } catch {
    return null;
  }
}

/** Server (Gemini) evaluation, with on-device scoring as the fallback so feedback is never lost. */
export async function requestEvaluation(req: EvaluationRequest): Promise<{ evaluation: Evaluation; warning?: string }> {
  if (!hasApi) return { evaluation: evaluateHeuristic(req) };
  try {
    const res = await call("/api/evaluate", { method: "POST", json: req });
    if (res.status === 401) throw new Error("signed-out");
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as { evaluation: Evaluation; warning?: string };
  } catch (e) {
    const why = e instanceof Error && e.message === "signed-out" ? "Your session expired" : "The evaluation service could not be reached";
    return { evaluation: evaluateHeuristic(req), warning: `${why}, so this result was scored on your device by the demo evaluator.` };
  }
}

export async function transcribe(uri: string, lang: "en" | "es", mime: string): Promise<string | null> {
  if (!hasApi) return null;
  try {
    const form = new FormData();
    const name = `rendition.${mime.includes("wav") ? "wav" : mime.includes("webm") ? "webm" : "m4a"}`;
    if (Platform.OS === "web") form.append("audio", await (await fetch(uri)).blob(), name);
    else form.append("audio", { uri, name, type: mime } as unknown as Blob);
    form.append("lang", lang);
    const res = await call("/api/transcribe", { method: "POST", body: form }, 120_000);
    if (!res.ok) return null;
    return ((await res.json()) as { transcript: string }).transcript ?? "";
  } catch {
    return null;
  }
}

/** Raw WAV/MP3 bytes for a passage, or null when the server has no voice configured. */
export async function synthesize(text: string, lang: "en" | "es", rate: number): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!hasApi) return null;
  try {
    const res = await call("/api/tts", { method: "POST", json: { text, lang, rate } }, 120_000);
    if (!res.ok) return null;
    return { bytes: new Uint8Array(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "audio/wav" };
  } catch {
    return null;
  }
}

export interface GeneratedPassage {
  title: string;
  context: string;
  segments: { text: string; units: MeaningUnit[] }[];
}

export async function generatePassage(config: ExerciseConfig): Promise<GeneratedPassage | null> {
  if (!hasApi) return null;
  try {
    const res = await call("/api/passages/generate", { method: "POST", json: { config } }, 120_000);
    return res.ok ? ((await res.json()) as GeneratedPassage) : null;
  } catch {
    return null;
  }
}
