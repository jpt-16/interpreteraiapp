"use client";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EvaluationReport } from "@/components/exercise/EvaluationReport";
import { formatDate } from "@/components/sessions/SessionList";
import { Badge, SampleBadge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useData } from "@/lib/data/store";
import { configToParams } from "@/lib/exercises/builder";
import { DIFFICULTY, EXERCISE_TYPES, langPairLabel, SUBJECTS } from "@/lib/exercises/catalog";

export default function SessionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready, visibleSessions, deleteSession, getRecordingUrl } = useData();
  const session = visibleSessions.find((s) => s.id === decodeURIComponent(id));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.recording?.stored) getRecordingUrl(session).then(setAudioUrl);
  }, [session, getRecordingUrl]);

  if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!session)
    return (
      <Card>
        <EmptyState title="Session not found" description="It may have been deleted." action={<ButtonLink href="/analytics">Back to analytics</ButtonLink>} />
      </Card>
    );

  const c = session.config;
  return (
    <div className="animate-rise">
      <Link href="/analytics#history" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink-2">
        <ArrowLeft size={14} /> Session history
      </Link>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{session.exerciseTitle}</h1>
            {session.isSample && <SampleBadge />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{EXERCISE_TYPES[c.type].label}</Badge>
            <Badge>{c.type === "dialogue" ? "EN ⇄ ES" : langPairLabel(c.sourceLang, c.targetLang)}</Badge>
            <Badge>{SUBJECTS[c.subject].label}</Badge>
            <Badge>Level {c.difficulty} · {DIFFICULTY[c.difficulty].label}</Badge>
            <Badge>{formatDate(session.createdAt, true)}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {!session.isSample && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm("Delete this session and any stored recording? This cannot be undone.")) return;
                await deleteSession(session.id);
                router.push("/analytics");
              }}
            >
              <Trash2 size={15} /> Delete
            </Button>
          )}
          <ButtonLink href={`/exercise?${configToParams({ ...c, contentSource: c.contentSource === "ai" ? "library" : c.contentSource })}`}>
            Practise again
          </ButtonLink>
        </div>
      </div>

      {audioUrl && (
        <Card className="mb-5 p-4">
          <div className="mb-2 text-[12px] text-muted">
            Stored recording · deleted automatically {session.recording?.expiresAt ? `on ${formatDate(session.recording.expiresAt)}` : ""}
          </div>
          <audio controls src={audioUrl} className="w-full" />
        </Card>
      )}

      <EvaluationReport evaluation={session.evaluation} config={c} sourceText={session.sourceText} transcript={session.response.transcript} />
    </div>
  );
}
