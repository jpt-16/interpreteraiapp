import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Protects the AI endpoints, which spend the server's Gemini quota.
 *
 * - Supabase configured: the caller must be a signed-in user, via the web
 *   session cookie or `Authorization: Bearer <access token>` from the mobile app.
 * - Otherwise: if API_ACCESS_TOKEN is set, callers must send it as `x-api-key`.
 *   With neither, the API is open (fine for local demos; do not deploy that way
 *   with a Gemini key).
 * - A small per-caller rate limit applies in every mode. It is in-memory, so it
 *   is best-effort on serverless; use the Gemini key's own quota as the hard cap.
 */
const windows = new Map<string, number[]>();

function limited(key: string, perMinute: number) {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) {
    windows.set(key, recent);
    return true;
  }
  recent.push(now);
  windows.set(key, recent);
  if (windows.size > 5000) windows.clear();
  return false;
}

async function userId(request: Request): Promise<string | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (bearer) {
    const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }).auth.getUser(bearer);
    return data.user?.id ?? null;
  }
  const { data } = await (await getServerSupabase()).auth.getUser();
  return data.user?.id ?? null;
}

export async function guard(request: Request, scope: string, perMinute = 20): Promise<NextResponse | null> {
  let caller: string;
  if (isSupabaseConfigured) {
    const id = await userId(request).catch(() => null);
    if (!id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    caller = id;
  } else {
    const token = process.env.API_ACCESS_TOKEN;
    if (token && request.headers.get("x-api-key") !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  }
  if (limited(`${scope}:${caller}`, perMinute)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  return null;
}
