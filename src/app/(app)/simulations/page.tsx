"use client";
import { ArrowRight, MessagesSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/lib/data/store";
import { configToParams } from "@/lib/exercises/builder";
import { DIFFICULTY, LANGUAGES, SUBJECTS } from "@/lib/exercises/catalog";
import { SCENARIOS } from "@/lib/exercises/scenarios";

export default function SimulationsPage() {
  const { status } = useData();
  return (
    <div className="animate-rise">
      <PageHeader
        title="Live Simulations"
        description="Dialogue interpreting between two parties. Switch direction every turn, as in a real assignment."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map((s) => {
          const href = `/exercise?${configToParams({
            type: "dialogue",
            sourceLang: s.parties[0].lang,
            targetLang: s.parties[1].lang,
            difficulty: s.difficulty,
            subject: s.subject,
            length: "medium",
            contentSource: "library",
            scenarioId: s.id,
          })}`;
          return (
            <Card key={s.id} className="flex flex-col">
              <CardHeader
                title={s.title}
                description={s.setting}
                action={<MessagesSquare size={16} className="text-muted" />}
              />
              <CardBody className="flex flex-1 flex-col">
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{SUBJECTS[s.subject].label}</Badge>
                  <Badge>
                    Level {s.difficulty} · {DIFFICULTY[s.difficulty].label}
                  </Badge>
                  <Badge>{s.turns.length} turns</Badge>
                </div>
                <ul className="mt-4 space-y-2">
                  {s.parties.map((p) => (
                    <li key={p.name} className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-2">
                        {p.name} <span className="text-muted">· {p.role}</span>
                      </span>
                      <Badge tone="accent">{LANGUAGES[p.lang].label}</Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <ButtonLink href={href} className="w-full">
                    Start simulation <ArrowRight size={15} />
                  </ButtonLink>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Sparkles size={18} className="shrink-0 text-accent" />
          <div className="flex-1">
            <div className="text-[14px] font-medium text-ink">Adaptive AI role-play</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              Next on the roadmap: AI-voiced parties that react to your rendition in real time, with interruptions and clarification requests.
              It will use the same Claude integration as evaluation{status?.evaluation.live ? ", which is already configured" : " (requires ANTHROPIC_API_KEY)"}.
              The scripted scenarios above are fully functional today.
            </p>
          </div>
          <Badge tone="neutral">Planned</Badge>
        </CardBody>
      </Card>
    </div>
  );
}
