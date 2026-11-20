"use client";
import { DEFAULT_PREFERENCES, type PracticeSession, type TermEntry, type UserPreferences } from "@/lib/types";
import { newId, type Repository } from "./repository";

/**
 * Demo-mode repository: data lives only in this browser's localStorage.
 * Recordings are never persisted in demo mode.
 */
const KEYS = {
  sessions: "iat.sessions.v1",
  terms: "iat.terms.v1",
  prefs: "iat.prefs.v1",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked — data stays in memory for this visit
  }
}

export function createLocalRepository(): Repository {
  return {
    mode: "local",
    async listSessions() {
      return read<PracticeSession[]>(KEYS.sessions, []);
    },
    async saveSession(session) {
      const all = read<PracticeSession[]>(KEYS.sessions, []);
      const saved = { ...session, recording: { stored: false } };
      write(KEYS.sessions, [saved, ...all.filter((s) => s.id !== session.id)].slice(0, 500));
      return saved;
    },
    async deleteSession(id) {
      write(KEYS.sessions, read<PracticeSession[]>(KEYS.sessions, []).filter((s) => s.id !== id));
    },
    async deleteAllSessions() {
      write(KEYS.sessions, []);
    },
    async getRecordingUrl() {
      return null;
    },
    async deleteAllRecordings() {
      return 0;
    },
    async listTerms() {
      return read<TermEntry[]>(KEYS.terms, []);
    },
    async saveTerm(term) {
      const all = read<TermEntry[]>(KEYS.terms, []);
      const existing = term.id ? all.find((t) => t.id === term.id) : undefined;
      const saved: TermEntry = {
        ...term,
        id: existing?.id ?? newId(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      write(KEYS.terms, [saved, ...all.filter((t) => t.id !== saved.id)]);
      return saved;
    },
    async deleteTerm(id) {
      write(KEYS.terms, read<TermEntry[]>(KEYS.terms, []).filter((t) => t.id !== id));
    },
    async getPreferences() {
      return { ...DEFAULT_PREFERENCES, ...read<Partial<UserPreferences>>(KEYS.prefs, {}) };
    },
    async savePreferences(prefs) {
      write(KEYS.prefs, prefs);
    },
    async syncWeaknesses() {
      // Weaknesses are derived on the fly from local history in demo mode.
    },
  };
}
