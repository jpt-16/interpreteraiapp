"use client";
import { CheckCircle2, CircleDashed, Download, LogOut, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FieldLabel, Segmented, Select, TextInput, Toggle } from "@/components/ui/Fields";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/lib/data/store";
import { hasSpeechSynthesis, pickVoice } from "@/lib/speech/browser";
import type { Lang } from "@/lib/types";

function Row({ ok, name, detail, env }: { ok: boolean; name: string; detail: string; env: string }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="flex gap-3">
        {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-good" /> : <CircleDashed size={16} className="mt-0.5 shrink-0 text-warn" />}
        <div>
          <div className="text-[13.5px] text-ink">{name}</div>
          <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{detail}</div>
          {!ok && <code className="mt-1 inline-block rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2">{env}</code>}
        </div>
      </div>
      <Badge tone={ok ? "good" : "warn"}>{ok ? "Live" : "Demo"}</Badge>
    </li>
  );
}

function NameEditor({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial);
  return (
    <div className="flex gap-2">
      <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Display name" />
      <Button variant="secondary" onClick={() => onSave(name.trim() || "Interpreter")} disabled={name === initial}>
        Save
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { prefs, updatePrefs, status, mode, user, signOut, deleteAllRecordings, deleteAllSessions, sessions, terms } = useData();
  const [notice, setNotice] = useState<string | null>(null);

  const testVoice = async (lang: Lang) => {
    if (!hasSpeechSynthesis()) return;
    const v = await pickVoice(lang);
    const u = new SpeechSynthesisUtterance(
      lang === "en" ? "The patient was admitted on March twelfth with a temperature of thirty-nine degrees." : "El paciente ingresó el doce de marzo con una temperatura de treinta y nueve grados.",
    );
    if (v) u.voice = v;
    u.lang = v?.lang ?? (lang === "en" ? "en-US" : "es-ES");
    u.rate = prefs.speechRateMultiplier;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), preferences: prefs, sessions, glossary: terms }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "decalage-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="animate-rise">
      <PageHeader title="Settings" description="Profile, playback, privacy and integrations." />
      {notice && <div className="mb-4 rounded-lg border border-good/30 bg-good-soft px-4 py-2 text-[13px] text-good">{notice}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile & languages" />
          <CardBody className="space-y-5">
            <div>
              <FieldLabel>Display name</FieldLabel>
              <NameEditor key={prefs.displayName} initial={prefs.displayName} onSave={(n) => updatePrefs({ displayName: n })} />
            </div>
            <div>
              <FieldLabel>Default source language</FieldLabel>
              <Segmented
                value={prefs.defaultSourceLang}
                onChange={(v: Lang) => updatePrefs({ defaultSourceLang: v, defaultTargetLang: v === "en" ? "es" : "en" })}
                options={[
                  { value: "en", label: "English → Spanish" },
                  { value: "es", label: "Spanish → English" },
                ]}
              />
            </div>
            <div>
              <FieldLabel hint={`${prefs.speechRateMultiplier.toFixed(2)}×`}>Speech rate adjustment</FieldLabel>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.05}
                value={prefs.speechRateMultiplier}
                onChange={(e) => updatePrefs({ speechRateMultiplier: Number(e.target.value) })}
                className="w-full accent-[var(--color-accent)]"
                aria-label="Speech rate adjustment"
              />
              <p className="mt-1 text-[12px] text-muted">Applied on top of each difficulty level&apos;s base speed.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => testVoice("en")}>
                  <Volume2 size={14} /> Test English voice
                </Button>
                <Button variant="secondary" size="sm" onClick={() => testVoice("es")}>
                  <Volume2 size={14} /> Test Spanish voice
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Privacy & data" description="Recordings are never kept by default. Transcripts and scores are stored so you can track progress." />
          <CardBody className="space-y-4">
            <Toggle
              checked={prefs.storeRecordings}
              onChange={(v) => updatePrefs({ storeRecordings: v })}
              label="Store audio recordings"
              description={
                mode === "supabase"
                  ? "Uploads your rendition audio to private storage so you can replay it. Deleted automatically after the retention period."
                  : "Not available in demo mode — recordings are only kept in memory during an exercise."
              }
            />
            {prefs.storeRecordings && mode === "supabase" && (
              <div>
                <FieldLabel>Delete recordings after</FieldLabel>
                <Select
                  value={String(prefs.recordingRetentionDays)}
                  onChange={(v) => updatePrefs({ recordingRetentionDays: Number(v) })}
                  options={[1, 3, 7, 14, 30].map((d) => ({ value: String(d), label: `${d} day${d > 1 ? "s" : ""}` }))}
                />
              </div>
            )}
            <Toggle
              checked={prefs.showSampleData}
              onChange={(v) => updatePrefs({ showSampleData: v })}
              label="Show sample data"
              description="Adds clearly labelled simulated sessions to the dashboard and analytics. Never mixed into your stored history."
            />
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button variant="secondary" size="sm" onClick={exportData}>
                <Download size={14} /> Export my data
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const n = await deleteAllRecordings();
                  setNotice(`${n} stored recording${n === 1 ? "" : "s"} deleted.`);
                }}
              >
                <Trash2 size={14} /> Delete all recordings
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (!confirm("Delete your entire practice history, evaluations and recordings? This cannot be undone.")) return;
                  await deleteAllSessions();
                  setNotice("Practice history deleted.");
                }}
              >
                <Trash2 size={14} /> Delete practice history
              </Button>
            </div>
            <p className="text-[12px] leading-relaxed text-faint">
              When browser speech recognition is used (demo mode), your browser vendor may process the audio to produce the transcript.
              Configure a server transcription provider to keep processing under your control.
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2" id="integrations">
          <CardHeader
            title="Integrations"
            description="Server-side services are configured with environment variables. Anything not configured runs in a clearly labelled demo mode."
          />
          <CardBody className="pt-2">
            {status ? (
              <ul className="divide-y divide-line">
                <Row
                  ok={status.supabase}
                  name="Accounts & database (Supabase)"
                  detail={status.supabase ? "Sign-in and synced history with row-level security." : "Without Supabase, data is stored only in this browser."}
                  env="NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
                />
                <Row
                  ok={status.evaluation.live}
                  name="AI performance evaluation"
                  detail={
                    status.evaluation.live
                      ? `Meaning-based evaluation with ${status.evaluation.model}.`
                      : "Using the demo heuristic evaluator (concept matching against annotated meaning units)."
                  }
                  env="GEMINI_API_KEY"
                />
                <Row
                  ok={status.passageGeneration.live}
                  name="AI passage generation"
                  detail={status.passageGeneration.live ? "Fresh annotated passages on demand." : "Using the curated passage library and procedural detail briefings."}
                  env="GEMINI_API_KEY"
                />
                <Row
                  ok={status.stt.live}
                  name="Speech-to-text"
                  detail={status.stt.live ? `Server transcription via ${status.stt.provider}.` : "Using the browser's built-in speech recognition (Chrome, Edge, Safari)."}
                  env="GEMINI_API_KEY (or OPENAI_API_KEY / DEEPGRAM_API_KEY)"
                />
                <Row
                  ok={status.tts.live}
                  name="Text-to-speech"
                  detail={status.tts.live ? `Studio voices via ${status.tts.provider}.` : "Using the browser's built-in voices."}
                  env="GEMINI_API_KEY (or OPENAI_API_KEY / ELEVENLABS_API_KEY)"
                />
                <Row
                  ok={status.recordingPurge}
                  name="Automatic recording deletion"
                  detail={status.recordingPurge ? "Expired recordings are purged by the scheduled job." : "Needed only if users opt in to storing recordings."}
                  env="SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET"
                />
              </ul>
            ) : (
              <p className="py-4 text-[13px] text-muted">Checking integration status…</p>
            )}
          </CardBody>
        </Card>

        {mode === "supabase" && (
          <Card className="lg:col-span-2">
            <CardBody className="flex items-center justify-between">
              <div className="text-[13px] text-muted">
                Signed in as <span className="text-ink-2">{user?.email}</span>
              </div>
              <Button variant="secondary" onClick={signOut}>
                <LogOut size={15} /> Sign out
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
