"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { analyzeWeaknesses } from "@/lib/coach/analyze";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { DEFAULT_PREFERENCES, type PracticeSession, type TermEntry, type UserPreferences, type Weakness } from "@/lib/types";
import { createLocalRepository } from "./local";
import type { Repository } from "./repository";
import { getSampleSessions } from "./sample";
import { createSupabaseRepository } from "./supabase";

export interface IntegrationStatusClient {
  supabase: boolean;
  evaluation: { provider: string; model: string | null; live: boolean };
  passageGeneration: { live: boolean };
  stt: { provider: string; live: boolean };
  tts: { provider: string; live: boolean };
  recordingPurge: boolean;
}

interface DataState {
  ready: boolean;
  mode: Repository["mode"];
  user: { email: string | null } | null;
  status: IntegrationStatusClient | null;
  prefs: UserPreferences;
  /** The user's own sessions only. */
  sessions: PracticeSession[];
  /** Own sessions plus labelled sample sessions when enabled. */
  visibleSessions: PracticeSession[];
  sampleIncluded: boolean;
  weaknesses: Weakness[];
  terms: TermEntry[];
  error: string | null;
  saveSession(session: PracticeSession, recording: Blob | null): Promise<PracticeSession>;
  deleteSession(id: string): Promise<void>;
  deleteAllSessions(): Promise<void>;
  deleteAllRecordings(): Promise<number>;
  getRecordingUrl(session: PracticeSession): Promise<string | null>;
  saveTerm(term: Omit<TermEntry, "id" | "createdAt"> & { id?: string }): Promise<void>;
  deleteTerm(id: string): Promise<void>;
  updatePrefs(patch: Partial<UserPreferences>): Promise<void>;
  signOut(): Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const repo = useMemo<Repository>(() => {
    const sb = getBrowserSupabase();
    return sb ? createSupabaseRepository(sb) : createLocalRepository();
  }, []);

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<DataState["user"]>(null);
  const [status, setStatus] = useState<IntegrationStatusClient | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getBrowserSupabase();
        if (sb) {
          const { data } = await sb.auth.getUser();
          if (!cancelled) setUser(data.user ? { email: data.user.email ?? null } : null);
        }
        const [p, s, t] = await Promise.all([repo.getPreferences(), repo.listSessions(), repo.listTerms()]);
        if (cancelled) return;
        setPrefs(p);
        setSessions(s);
        setTerms(t);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your data");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => !cancelled && s && setStatus(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const samples = useMemo(() => (ready && prefs.showSampleData ? getSampleSessions() : []), [ready, prefs.showSampleData]);
  const visibleSessions = useMemo(
    () => [...sessions, ...samples].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sessions, samples],
  );
  const weaknesses = useMemo(() => analyzeWeaknesses(visibleSessions), [visibleSessions]);

  // Persist recurring weaknesses derived from the user's real history only.
  const lastSync = useRef<string>("");
  useEffect(() => {
    if (!ready || repo.mode !== "supabase") return;
    const own = analyzeWeaknesses(sessions);
    const sig = own.map((w) => `${w.key}:${w.occurrences}:${w.severity}`).join("|");
    if (sig === lastSync.current) return;
    lastSync.current = sig;
    repo.syncWeaknesses(own).catch(() => undefined);
  }, [ready, sessions, repo]);

  const saveSession = useCallback(
    async (session: PracticeSession, recording: Blob | null) => {
      const saved = await repo.saveSession(session, recording, prefs);
      setSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      return saved;
    },
    [repo, prefs],
  );

  const value: DataState = {
    ready,
    mode: repo.mode,
    user,
    status,
    prefs,
    sessions,
    visibleSessions,
    sampleIncluded: samples.length > 0,
    weaknesses,
    terms,
    error,
    saveSession,
    async deleteSession(id) {
      await repo.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    },
    async deleteAllSessions() {
      await repo.deleteAllSessions();
      setSessions([]);
    },
    async deleteAllRecordings() {
      const n = await repo.deleteAllRecordings();
      setSessions((prev) => prev.map((s) => ({ ...s, recording: { stored: false } })));
      return n;
    },
    getRecordingUrl: (s) => repo.getRecordingUrl(s),
    async saveTerm(term) {
      const saved = await repo.saveTerm(term);
      setTerms((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)]);
    },
    async deleteTerm(id) {
      await repo.deleteTerm(id);
      setTerms((prev) => prev.filter((t) => t.id !== id));
    },
    async updatePrefs(patch) {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      await repo.savePreferences(next);
    },
    async signOut() {
      const sb = getBrowserSupabase();
      await sb?.auth.signOut();
      window.location.href = "/login";
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
