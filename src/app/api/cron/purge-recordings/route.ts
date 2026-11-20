import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Deletes recordings whose retention period has passed.
 * Schedule it (e.g. hourly via Vercel Cron) with header
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !serviceKey || !SUPABASE_URL) {
    return NextResponse.json({ error: "Recording purge is not configured" }, { status: 501 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from("recordings")
    .select("id, storage_path")
    .lte("expires_at", new Date().toISOString())
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ purged: 0 });

  const { error: storageError } = await admin.storage.from("recordings").remove(data.map((r) => r.storage_path));
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });
  const { error: deleteError } = await admin.from("recordings").delete().in("id", data.map((r) => r.id));
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ purged: data.length });
}
