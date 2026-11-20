import type { PracticeSession, TermEntry, UserPreferences, Weakness } from "@/lib/types";

/**
 * Persistence boundary. The UI only talks to this interface, so storage can be
 * the browser (demo mode) or Supabase (authenticated, RLS-protected).
 */
export interface Repository {
  mode: "local" | "supabase";
  listSessions(): Promise<PracticeSession[]>;
  saveSession(session: PracticeSession, recording: Blob | null, prefs: UserPreferences): Promise<PracticeSession>;
  deleteSession(id: string): Promise<void>;
  deleteAllSessions(): Promise<void>;
  getRecordingUrl(session: PracticeSession): Promise<string | null>;
  deleteAllRecordings(): Promise<number>;

  listTerms(): Promise<TermEntry[]>;
  saveTerm(term: Omit<TermEntry, "id" | "createdAt"> & { id?: string }): Promise<TermEntry>;
  deleteTerm(id: string): Promise<void>;

  getPreferences(): Promise<UserPreferences>;
  savePreferences(prefs: UserPreferences): Promise<void>;

  syncWeaknesses(weaknesses: Weakness[]): Promise<void>;
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
