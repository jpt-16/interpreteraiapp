import AsyncStorage from "@react-native-async-storage/async-storage";
import { newId, type Repository } from "@/lib/data/repository";
import { DEFAULT_PREFERENCES, type PracticeSession, type TermEntry, type UserPreferences } from "@/lib/types";

const KEYS = { sessions: "decalage.sessions.v1", terms: "decalage.terms.v1", prefs: "decalage.prefs.v1" };

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);

/** On-device repository (demo mode, or when Supabase is not configured). Recordings are never persisted. */
export function createDeviceRepository(): Repository {
  return {
    mode: "local",
    listSessions: () => read<PracticeSession[]>(KEYS.sessions, []),
    async saveSession(session) {
      const all = await read<PracticeSession[]>(KEYS.sessions, []);
      const saved = { ...session, recording: { stored: false } };
      await write(KEYS.sessions, [saved, ...all.filter((s) => s.id !== session.id)].slice(0, 500));
      return saved;
    },
    async deleteSession(id) {
      await write(KEYS.sessions, (await read<PracticeSession[]>(KEYS.sessions, [])).filter((s) => s.id !== id));
    },
    async deleteAllSessions() {
      await write(KEYS.sessions, []);
    },
    getRecordingUrl: async () => null,
    deleteAllRecordings: async () => 0,
    listTerms: () => read<TermEntry[]>(KEYS.terms, []),
    async saveTerm(term) {
      const all = await read<TermEntry[]>(KEYS.terms, []);
      const existing = term.id ? all.find((t) => t.id === term.id) : undefined;
      const saved: TermEntry = { ...term, id: existing?.id ?? newId(), createdAt: existing?.createdAt ?? new Date().toISOString() };
      await write(KEYS.terms, [saved, ...all.filter((t) => t.id !== saved.id)]);
      return saved;
    },
    async deleteTerm(id) {
      await write(KEYS.terms, (await read<TermEntry[]>(KEYS.terms, [])).filter((t) => t.id !== id));
    },
    async getPreferences() {
      return { ...DEFAULT_PREFERENCES, ...(await read<Partial<UserPreferences>>(KEYS.prefs, {})) };
    },
    async savePreferences(prefs) {
      await write(KEYS.prefs, prefs);
    },
    async syncWeaknesses() {},
  };
}
