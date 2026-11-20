"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PREFERENCES,
  type Evaluation,
  type ExerciseConfig,
  type PracticeSession,
  type ResponseCapture,
  type TermEntry,
  type UserPreferences,
} from "@/lib/types";
import type { Repository } from "./repository";

/**
 * Supabase-backed repository. All queries run with the signed-in user's JWT,
 * so Row Level Security restricts every read and write to their own rows.
 */

interface SessionRow {
  id: string;
  created_at: string;
  exercise_title: string;
  word_count: number;
  unit_count: number;
  duration_sec: number | null;
  exercise_configs: {
    exercise_type: ExerciseConfig["type"];
    source_lang: ExerciseConfig["sourceLang"];
    target_lang: ExerciseConfig["targetLang"];
    difficulty: ExerciseConfig["difficulty"];
    subject: ExerciseConfig["subject"];
    audio_length: ExerciseConfig["length"];
    content_source: ExerciseConfig["contentSource"];
    scenario_id: string | null;
  } | null;
  exercise_transcripts: { kind: string; content: string; transcription_source: string | null; metadata: Partial<ResponseCapture> }[];
  evaluation_results: { details: Evaluation } | { details: Evaluation }[] | null;
  recordings: { storage_path: string; expires_at: string }[];
}

function toSession(row: SessionRow): PracticeSession | null {
  const cfg = row.exercise_configs;
  const evalRow = Array.isArray(row.evaluation_results) ? row.evaluation_results[0] : row.evaluation_results;
  if (!cfg || !evalRow) return null;
  const source = row.exercise_transcripts.find((t) => t.kind === "source");
  const rendition = row.exercise_transcripts.find((t) => t.kind === "rendition");
  const rec = row.recordings?.[0];
  return {
    id: row.id,
    createdAt: row.created_at,
    config: {
      type: cfg.exercise_type,
      sourceLang: cfg.source_lang,
      targetLang: cfg.target_lang,
      difficulty: cfg.difficulty,
      subject: cfg.subject,
      length: cfg.audio_length,
      contentSource: cfg.content_source,
      scenarioId: cfg.scenario_id ?? undefined,
    },
    exerciseTitle: row.exercise_title,
    sourceText: source?.content ?? "",
    wordCount: row.word_count,
    unitCount: row.unit_count,
    durationSec: row.duration_sec,
    response: {
      durationSec: null,
      ...(rendition?.metadata ?? {}),
      transcript: rendition?.content ?? "",
      transcriptionSource: (rendition?.transcription_source as ResponseCapture["transcriptionSource"]) ?? "typed",
    },
    evaluation: evalRow.details,
    recording: rec ? { stored: true, path: rec.storage_path, expiresAt: rec.expires_at } : { stored: false },
  };
}

async function requireUserId(sb: SupabaseClient) {
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function createSupabaseRepository(sb: SupabaseClient): Repository {
  return {
    mode: "supabase",

    async listSessions() {
      const { data, error } = await sb
        .from("practice_sessions")
        .select(
          "id, created_at, exercise_title, word_count, unit_count, duration_sec, exercise_configs(exercise_type, source_lang, target_lang, difficulty, subject, audio_length, content_source, scenario_id), exercise_transcripts(kind, content, transcription_source, metadata), evaluation_results(details), recordings(storage_path, expires_at)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return ((data ?? []) as unknown as SessionRow[]).map(toSession).filter((s): s is PracticeSession => s !== null);
    },

    async saveSession(session, recording, prefs) {
      const { data: id, error } = await sb.rpc("save_practice_session", { payload: session });
      if (error) throw error;
      const saved: PracticeSession = { ...session, id: (id as string) ?? session.id, recording: { stored: false } };

      // Recordings are opt-in and always carry an expiry date.
      if (recording && prefs.storeRecordings) {
        const userId = await requireUserId(sb);
        const ext = recording.type.includes("ogg") ? "ogg" : recording.type.includes("mp4") ? "m4a" : "webm";
        const path = `${userId}/${saved.id}.${ext}`;
        const up = await sb.storage.from("recordings").upload(path, recording, { contentType: recording.type || "audio/webm" });
        if (!up.error) {
          const expiresAt = new Date(Date.now() + prefs.recordingRetentionDays * 86_400_000).toISOString();
          const meta = await sb.from("recordings").insert({
            session_id: saved.id,
            storage_path: path,
            mime_type: recording.type || "audio/webm",
            duration_sec: session.response.durationSec,
            size_bytes: recording.size,
            expires_at: expiresAt,
          });
          if (!meta.error) saved.recording = { stored: true, path, expiresAt };
        }
      }
      return saved;
    },

    async deleteSession(id) {
      const { data: recs } = await sb.from("recordings").select("storage_path").eq("session_id", id);
      if (recs?.length) await sb.storage.from("recordings").remove(recs.map((r) => r.storage_path));
      const { error } = await sb.from("practice_sessions").delete().eq("id", id);
      if (error) throw error;
    },

    async deleteAllSessions() {
      await this.deleteAllRecordings();
      const userId = await requireUserId(sb);
      const { error } = await sb.from("practice_sessions").delete().eq("user_id", userId);
      if (error) throw error;
      await sb.from("exercise_configs").delete().eq("user_id", userId);
      await sb.from("recurring_weaknesses").delete().eq("user_id", userId);
    },

    async getRecordingUrl(session) {
      if (!session.recording?.stored || !session.recording.path) return null;
      const { data } = await sb.storage.from("recordings").createSignedUrl(session.recording.path, 300);
      return data?.signedUrl ?? null;
    },

    async deleteAllRecordings() {
      const { data } = await sb.from("recordings").select("id, storage_path");
      if (!data?.length) return 0;
      await sb.storage.from("recordings").remove(data.map((r) => r.storage_path));
      await sb.from("recordings").delete().in("id", data.map((r) => r.id));
      return data.length;
    },

    async listTerms() {
      const { data, error } = await sb.from("custom_terms").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r): TermEntry => ({
          id: r.id,
          sourceLang: r.source_lang,
          source: r.source_term,
          target: r.target_term,
          domain: r.domain,
          notes: r.notes ?? undefined,
          createdAt: r.created_at,
        }),
      );
    },

    async saveTerm(term) {
      const row = {
        source_lang: term.sourceLang,
        source_term: term.source,
        target_term: term.target,
        domain: term.domain,
        notes: term.notes ?? null,
      };
      const q = term.id
        ? sb.from("custom_terms").update(row).eq("id", term.id).select().single()
        : sb.from("custom_terms").insert(row).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return {
        id: data.id,
        sourceLang: data.source_lang,
        source: data.source_term,
        target: data.target_term,
        domain: data.domain,
        notes: data.notes ?? undefined,
        createdAt: data.created_at,
      };
    },

    async deleteTerm(id) {
      const { error } = await sb.from("custom_terms").delete().eq("id", id);
      if (error) throw error;
    },

    async getPreferences() {
      const userId = await requireUserId(sb);
      const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (!data) return DEFAULT_PREFERENCES;
      return {
        ...DEFAULT_PREFERENCES,
        displayName: data.display_name,
        defaultSourceLang: data.default_source_lang,
        defaultTargetLang: data.default_target_lang,
        speechRateMultiplier: Number(data.speech_rate_multiplier),
        storeRecordings: data.store_recordings,
        recordingRetentionDays: data.recording_retention_days,
        showSampleData: data.show_sample_data,
      } satisfies UserPreferences;
    },

    async savePreferences(prefs) {
      const userId = await requireUserId(sb);
      const { error } = await sb
        .from("profiles")
        .update({
          display_name: prefs.displayName,
          default_source_lang: prefs.defaultSourceLang,
          default_target_lang: prefs.defaultTargetLang,
          speech_rate_multiplier: prefs.speechRateMultiplier,
          store_recordings: prefs.storeRecordings,
          recording_retention_days: prefs.recordingRetentionDays,
          show_sample_data: prefs.showSampleData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;
    },

    async syncWeaknesses(weaknesses) {
      const userId = await requireUserId(sb);
      const now = new Date().toISOString();
      if (weaknesses.length) {
        await sb.from("recurring_weaknesses").upsert(
          weaknesses.map((w) => ({
            user_id: userId,
            weakness_key: w.key,
            label: w.label,
            description: w.description,
            severity: w.severity,
            occurrences: w.occurrences,
            trend: w.trend,
            evidence: w.evidence,
            recommendation: w.recommendation,
            status: "active",
            first_seen: w.firstSeen,
            last_seen: w.lastSeen,
            updated_at: now,
          })),
          { onConflict: "user_id,weakness_key" },
        );
      }
      const active = weaknesses.map((w) => w.key);
      let q = sb.from("recurring_weaknesses").update({ status: "resolved", updated_at: now }).eq("user_id", userId).eq("status", "active");
      if (active.length) q = q.not("weakness_key", "in", `(${active.map((k) => `"${k}"`).join(",")})`);
      await q;
    },
  };
}
