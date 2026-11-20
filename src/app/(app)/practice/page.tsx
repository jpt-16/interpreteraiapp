"use client";
import { ArrowRight, Brain, Hash, Headphones, Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { FieldLabel, Segmented } from "@/components/ui/Fields";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/lib/data/store";
import { configToParams, estimateDuration, normalizeConfig, speechRateFor, wordBudget } from "@/lib/exercises/builder";
import { AUDIO_LENGTH, DIFFICULTY, EXERCISE_TYPES, LANGUAGES, otherLang, SUBJECTS } from "@/lib/exercises/catalog";
import type { AudioLength, ContentSource, Difficulty, ExerciseConfig, ExerciseType, Lang, Subject } from "@/lib/types";

const TYPE_ICONS: Record<Exclude<ExerciseType, "dialogue">, typeof Brain> = {
  memory: Brain,
  consecutive: Mic,
  simultaneous: Headphones,
  "info-retention": Hash,
};

const TYPES: Exclude<ExerciseType, "dialogue">[] = ["memory", "consecutive", "simultaneous", "info-retention"];

export default function PracticeCenterPage() {
  const { prefs, status } = useData();
  const [config, setConfig] = useState<ExerciseConfig>({
    type: "consecutive",
    sourceLang: "en",
    targetLang: "es",
    difficulty: 2,
    subject: "medical",
    length: "medium",
    contentSource: "library",
  });

  useEffect(() => {
    setConfig((c) => ({ ...c, sourceLang: prefs.defaultSourceLang, targetLang: otherLang(prefs.defaultSourceLang) }));
  }, [prefs.defaultSourceLang]);

  const set = (patch: Partial<ExerciseConfig>) => setConfig((c) => normalizeConfig({ ...c, ...patch, targetLang: patch.targetLang ?? c.targetLang }));

  const setSource = (lang: Lang) =>
    setConfig((c) => normalizeConfig({ ...c, sourceLang: lang, targetLang: c.type === "memory" ? lang : otherLang(lang) }));

  const setType = (type: ExerciseType) =>
    setConfig((c) =>
      normalizeConfig({
        ...c,
        type,
        targetLang: type === "memory" ? c.sourceLang : otherLang(c.sourceLang),
        contentSource: type === "info-retention" ? "generated" : c.contentSource === "generated" ? "library" : c.contentSource,
      }),
    );

  const rate = speechRateFor(config, prefs.speechRateMultiplier);
  const words = wordBudget(config);
  const seconds = estimateDuration(words, config.sourceLang, rate);
  const aiLive = Boolean(status?.passageGeneration.live);

  return (
    <div className="animate-rise">
      <PageHeader title="Practice Center" description="Configure a focused exercise. Difficulty raises speed, length and information density together." />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Exercise type" />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {TYPES.map((t) => {
                const info = EXERCISE_TYPES[t];
                const Icon = TYPE_ICONS[t];
                const active = config.type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      active ? "border-accent/60 bg-accent-soft" : "border-line bg-surface-2/40 hover:border-line-strong hover:bg-surface-2",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className={active ? "text-accent" : "text-muted"} />
                      <span className="text-[14px] font-medium text-ink">{info.label}</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{info.description}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {info.skills.map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                  </button>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-6 sm:grid-cols-2">
              <div>
                <FieldLabel>Source language</FieldLabel>
                <Segmented
                  ariaLabel="Source language"
                  value={config.sourceLang}
                  onChange={setSource}
                  options={(Object.keys(LANGUAGES) as Lang[]).map((l) => ({ value: l, label: LANGUAGES[l].label }))}
                />
              </div>
              <div>
                <FieldLabel hint={config.type === "memory" ? "Same language for memory work" : undefined}>Target language</FieldLabel>
                <Segmented
                  ariaLabel="Target language"
                  value={config.targetLang}
                  onChange={(l: Lang) => set({ targetLang: l })}
                  options={(Object.keys(LANGUAGES) as Lang[]).map((l) => ({
                    value: l,
                    label: LANGUAGES[l].label,
                    disabled: config.type === "memory" ? l !== config.sourceLang : l === config.sourceLang,
                  }))}
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel hint={DIFFICULTY[config.difficulty].description}>Difficulty</FieldLabel>
                <Segmented
                  ariaLabel="Difficulty"
                  value={config.difficulty}
                  onChange={(d: Difficulty) => set({ difficulty: d })}
                  options={([1, 2, 3, 4, 5] as Difficulty[]).map((d) => ({
                    value: d,
                    label: (
                      <span className="flex flex-col items-center leading-tight">
                        <span>{d}</span>
                        <span className="hidden text-[10.5px] font-normal text-faint sm:block">{DIFFICULTY[d].label}</span>
                      </span>
                    ),
                  }))}
                />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel>Subject matter</FieldLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(SUBJECTS) as Subject[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => set({ subject: s })}
                      aria-pressed={config.subject === s}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        config.subject === s ? "border-accent/60 bg-accent-soft" : "border-line hover:border-line-strong hover:bg-surface-2",
                      )}
                    >
                      <div className="text-[13px] font-medium text-ink">{SUBJECTS[s].label}</div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{SUBJECTS[s].description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Audio length</FieldLabel>
                <Segmented
                  ariaLabel="Audio length"
                  value={config.length}
                  onChange={(l: AudioLength) => set({ length: l })}
                  options={(Object.keys(AUDIO_LENGTH) as AudioLength[]).map((l) => ({
                    value: l,
                    label: `${AUDIO_LENGTH[l].label}`,
                    title: AUDIO_LENGTH[l].approx,
                  }))}
                />
              </div>
              <div>
                <FieldLabel hint={!aiLive ? "AI needs ANTHROPIC_API_KEY" : undefined}>Content</FieldLabel>
                <Segmented
                  ariaLabel="Content source"
                  value={config.contentSource === "ai" ? "ai" : "standard"}
                  onChange={(v: string) =>
                    set({
                      contentSource: (v === "ai" ? "ai" : config.type === "info-retention" ? "generated" : "library") as ContentSource,
                    })
                  }
                  options={[
                    { value: "standard", label: config.type === "info-retention" ? "Generated" : "Curated" },
                    { value: "ai", label: "AI-written", disabled: !aiLive },
                  ]}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader title="Session summary" />
            <CardBody className="space-y-4">
              <dl className="grid grid-cols-2 gap-y-3 text-[13px]">
                <dt className="text-muted">Exercise</dt>
                <dd className="text-right text-ink">{EXERCISE_TYPES[config.type].short}</dd>
                <dt className="text-muted">Direction</dt>
                <dd className="text-right text-ink">
                  {LANGUAGES[config.sourceLang].label} → {LANGUAGES[config.targetLang].label}
                </dd>
                <dt className="text-muted">Level</dt>
                <dd className="text-right text-ink">
                  {config.difficulty} · {DIFFICULTY[config.difficulty].label}
                </dd>
                <dt className="text-muted">Passage</dt>
                <dd className="tabular text-right text-ink">≈ {words} words</dd>
                <dt className="text-muted">Audio</dt>
                <dd className="tabular text-right text-ink">≈ {Math.round(seconds / 5) * 5} s</dd>
                <dt className="text-muted">Speech rate</dt>
                <dd className="tabular text-right text-ink">{rate.toFixed(2)}×</dd>
              </dl>
              <div className="border-t border-line pt-4">
                <div className="mb-2 text-[12px] font-medium uppercase tracking-wider text-muted">How it works</div>
                <ol className="space-y-1.5 text-[12.5px] leading-relaxed text-ink-2">
                  {EXERCISE_TYPES[config.type].instructions.map((i, n) => (
                    <li key={n} className="flex gap-2">
                      <span className="tabular text-faint">{n + 1}.</span>
                      {i}
                    </li>
                  ))}
                </ol>
              </div>
              <ButtonLink href={`/exercise?${configToParams(config)}`} size="lg" className="w-full">
                Begin exercise <ArrowRight size={16} />
              </ButtonLink>
              <p className="text-center text-[11.5px] text-faint">Opens a distraction-free exercise view. A microphone is recommended.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
