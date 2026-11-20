import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { analyzeWeaknesses } from "@/lib/coach/analyze";
import type { Repository } from "@/lib/data/repository";
import { getSampleSessions } from "@/lib/data/sample";
import { createSupabaseRepository } from "@/lib/data/supabase";
import { DEFAULT_PREFERENCES, type PracticeSession, type TermEntry, type UserPreferences, type Weakness } from "@/lib/types";
import { fetchStatus, type ServiceStatus } from "./api";
import { hasApi, hasSupabase } from "./config";
import { createDeviceRepository } from "./storage";
import { getSupabase } from "./supabase";

type AuthState = "loading" | "signedOut" | "signedIn" | "demo";

interface DataState {
  ready: boolean;
  auth: AuthState;
  email: string | null;
  mode: Repository["mode"];
  status: ServiceStatus | null;
  prefs: UserPreferences;
  sessions: PracticeSession[];
  visibleSessions: PracticeSession[];
  sampleIncluded: boolean;
  weaknesses: Weakness[];
  terms: TermEntry[];
  error: string | null;
  saveSession(s: PracticeSession): Promise<PracticeSession>;
  deleteSession(id: string): Promise<void>;
  deleteAllSessions(): Promise<void>;
  saveTerm(t: Omit<TermEntry, "id" | "createdAt"> & { id?: string }): Promise<void>;
  deleteTerm(id: string): Promise<void>;
  updatePrefs(patch: Partial<UserPreferences>): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(hasSupabase ? "loading" : "demo");
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [terms, setTerms] = useState<TermEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Track the Supabase session; the repository follows the signed-in user.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setEmail(data.session?.user.email ?? null);
      setAuth(data.session ? "signedIn" : "signedOut");
    });
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      setAuth(session ? "signedIn" : "signedOut");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const repo = useMemo<Repository>(() => {
    const sb = getSupabase();
    // The shared repository was typed against the web project's copy of supabase-js.
    return sb && auth === "signedIn" ? createSupabaseRepository(sb as never) : createDeviceRepository();
  }, [auth]);

  useEffect(() => {
    if (auth === "loading" || auth === "signedOut") {
      setSessions([]);
      setTerms([]);
      if (auth === "signedOut") setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [p, s, t] = await Promise.all([repo.getPreferences(), repo.listSessions(), repo.listTerms()]);
        if (cancelled) return;
        setPrefs(p);
        setSessions(s);
        setTerms(t);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your data");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, auth]);

  useEffect(() => {
    if (hasApi) fetchStatus().then(setStatus);
  }, [auth]);

  const samples = useMemo(() => (ready && prefs.showSampleData ? getSampleSessions() : []), [ready, prefs.showSampleData]);
  const visibleSessions = useMemo(() => [...sessions, ...samples].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [sessions, samples]);
  const weaknesses = useMemo(() => analyzeWeaknesses(visibleSessions), [visibleSessions]);

  const lastSync = useRef("");
  useEffect(() => {
    if (!ready || repo.mode !== "supabase") return;
    const own = analyzeWeaknesses(sessions);
    const sig = own.map((w) => `${w.key}:${w.occurrences}:${w.severity}`).join("|");
    if (sig === lastSync.current) return;
    lastSync.current = sig;
    repo.syncWeaknesses(own).catch(() => undefined);
  }, [ready, sessions, repo]);

  const saveSession = useCallback(
    async (session: PracticeSession) => {
      const saved = await repo.saveSession(session, null, prefs);
      setSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      return saved;
    },
    [repo, prefs],
  );

  const value: DataState = {
    ready,
    auth,
    email,
    mode: repo.mode,
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
      setSessions((p) => p.filter((s) => s.id !== id));
    },
    async deleteAllSessions() {
      await repo.deleteAllSessions();
      setSessions([]);
    },
    async saveTerm(term) {
      const saved = await repo.saveTerm(term);
      setTerms((p) => [saved, ...p.filter((t) => t.id !== saved.id)]);
    },
    async deleteTerm(id) {
      await repo.deleteTerm(id);
      setTerms((p) => p.filter((t) => t.id !== id));
    },
    async updatePrefs(patch) {
      const next = { ...prefs, ...patch };
      setPrefs(next);
      await repo.savePreferences(next);
    },
    async signOut() {
      await getSupabase()?.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
