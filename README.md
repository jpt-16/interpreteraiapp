# Décalage — interpreter performance training

A training platform for working interpreters and advanced trainees. It is **not** a language-learning app: users already know their languages. It trains short-term auditory memory, active listening, consecutive and simultaneous interpreting, completeness, fidelity (no unsupported additions), numbers and names, terminology and delivery under cognitive load — and evaluates renditions by **meaning**, not word overlap.

**Two parts, one codebase:**

| Part | What it is |
|---|---|
| [`mobile/`](mobile/README.md) | **The app.** Expo / React Native, iOS-first, designed to Apple's Human Interface Guidelines. |
| repo root | The **API** the app calls (evaluation, transcription, voices, passage writing; holds the Gemini key) and a desktop **web version** of the same product. Built with Next.js 16, TypeScript, Tailwind CSS v4, Supabase. |

AI runs on **Google Gemini** through a single server-side key: evaluation, passage writing, speech-to-text and text-to-speech. The key never reaches the app.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — every integration has a demo fallback
npm run dev                  # http://localhost:3000
```

With no environment variables the app runs fully in **demo mode**:

| Capability | Live (configured) | Demo fallback (clearly labelled in the UI) |
|---|---|---|
| Accounts & history | Supabase auth + Postgres with RLS | Browser / device storage |
| Performance evaluation | Gemini (`GEMINI_API_KEY`) | Heuristic concept-matching against annotated meaning units |
| Passage content | Curated library + AI-written passages | Curated bilingual library + procedural detail briefings |
| Speech-to-text | Gemini audio understanding (OpenAI / Deepgram adapters also included) | Web: browser recognition. Mobile: typed or keyboard-dictated rendition |
| Text-to-speech | Gemini TTS (OpenAI / ElevenLabs adapters also included) | Browser / iPhone built-in voices |

**Settings → Integrations** (web) and **Settings → Services** (mobile) show exactly which services are live and which environment variables each one needs. API keys are only read server-side (`src/lib/config/env.ts`, `src/lib/ai/gemini.ts`, `src/lib/speech/server.ts`); clients only ever see booleans from `/api/status`.

**Protecting the API.** The AI endpoints spend your Gemini quota, so they are guarded (`src/lib/api/guard.ts`): with Supabase configured, callers must be signed in (web cookie or `Authorization: Bearer` from the app); without it, set `API_ACCESS_TOKEN` and send it as `x-api-key`. A per-caller rate limit applies as well. Do not deploy with a Gemini key and neither protection.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Evaluator, number-normalisation and coach tests (`node:test` via `tsx`) |
| `npm run typecheck` / `lint` | TypeScript and ESLint |

## Product tour

- **Dashboard** — sessions, practice time, recent performance, accuracy, retention, completeness, the coach's recommended next exercise, recent sessions and recurring weaknesses. Simulated *sample data* is shown (and labelled) until you hide it.
- **Practice Center** — choose source/target language (EN ⇄ ES), exercise type, difficulty 1–5, subject, audio length and content source. Difficulty raises speech rate, passage length and information density together.
- **Exercise view** (`/exercise`) — distraction-free: source audio with waveform and progress, recording with live level meter and timer, step progress, language-pair and level indicators, a consecutive notepad, transcript review (fix recognition errors only), detail-check questions for information retention, then the evaluation report.
- **Live Simulations** — scripted dialogue interpreting (ER triage, asylum intake, factory audit): direction switches every turn; each turn is evaluated and combined.
- **Performance Analytics** — accuracy, retention, completeness and fluency over time; by exercise type and subject; filters; table view for every chart; full history with per-session review and deletion.
- **Vocabulary & Terminology** — personal glossary with CSV import/export. Entries are passed to the AI evaluator as preferred equivalents when judging terminology.
- **Settings** — profile, default direction, speech-rate adjustment, privacy controls (recording storage opt-in, retention, delete recordings, delete history, export), sample data, integration status.

### Exercise types

| Type | Flow |
|---|---|
| Memory retention | Listen once (no notes) → reproduce the meaning in the same language |
| Consecutive | Listen (notepad available) → record the rendition in the target language |
| Simultaneous | Source and recording start together; auto-stops shortly after the speaker ends; décalage is reported |
| Information retention | Detail-dense generated briefing → rendition → detail-check questions |
| Dialogue (Live Simulations) | Alternating speakers and directions, turn by turn |

## AI performance evaluation

`src/lib/eval/` is a provider registry (`index.ts`). Each provider receives the source text, its **annotated meaning units** (ideas, numbers, dates, names, quantities, terms — each weighted 1–3), the rendition transcript, timing and the user's glossary, and returns the same `Evaluation` shape:

- overall training score and seven category scores: semantic accuracy, information retention, completeness, fidelity (no unsupported additions), numbers & dates, terminology, fluency;
- specific omissions, incorrect information (source vs rendered + explanation), unsupported additions, and **acceptable differences** (rephrasing that was fine);
- per-unit status (conveyed / partial / omitted / distorted), delivery stats, detail-check results and recommended follow-up exercises;
- a disclaimer that scores are training feedback, not certification.

**Gemini provider** (`gemini.ts`, `gemini-spec.ts`) asks `gemini-3.8-flash` (override with `GEMINI_EVAL_MODEL`; try a Flash-Lite model to cut cost further) for schema-constrained JSON, validates it with Zod, and maps it to the `Evaluation` type. The prompt instructs the model to judge meaning, to treat reformulation as acceptable, to be exact about figures, and to tolerate obvious speech-recognition artefacts; the rendition is fenced as data. Fluency is measured deterministically from timing and the transcript (pace, fillers, restarts), not guessed by the model. If the AI call fails, the heuristic result is returned with a visible warning. The schema, prompts and mapping are unit-tested without a network (`tests/gemini.test.ts`); **the live Gemini calls themselves have not been exercised in this repository's CI or sandbox**, so run one real evaluation and one real transcription after adding your key.

**Heuristic demo provider** (`heuristic.ts`) never compares word overlap. It matches bilingual concept cues per meaning unit, normalises numbers in both languages (spelled-out, decimals, scales, times, `48,6 millones` = `48.6 million`), detects changed figures, unsupported figures and embellishment, and is tested in `tests/evaluation.test.ts`.

To try another model or vendor, add a provider to the registry and select it with `EVALUATION_PROVIDER`.

**Cost and privacy.** The heuristic evaluator is free and runs on-device in the mobile app. Server audio for passages is cached on the device per (text, language, rate), so repeated passages are not re-synthesised. On Gemini's free tier, Google's terms may allow prompts and responses to be used to improve its products; for confidential interpreting material use a paid key and check the current terms.

## Personalised coach

`src/lib/coach/analyze.ts` looks across the last 25 sessions for *recurring* patterns — not one-off slips — and turns each into a targeted exercise:

- numbers lost (and whether only in longer passages) → numerical retention ladder;
- completeness falling with passage length → progressive-length memory work;
- unsupported additions, meaning distortions, proper names, domain terminology per subject, delivery fluency, simultaneous vs consecutive gap.

Each weakness has severity, trend (improving / stable / worsening), evidence and a one-click exercise. In Supabase mode the user's weaknesses are persisted to `recurring_weaknesses`.

## Database (Supabase)

Schema: `supabase/migrations/20261120000000_init.sql`.

| Table | Contents |
|---|---|
| `profiles` | Display name, default direction, speech rate, privacy settings (`store_recordings` **false** by default, `recording_retention_days` 1–30) |
| `language_pairs` | Reference data (EN→ES, ES→EN, same-language memory) |
| `exercise_configs` | Type, direction, difficulty, subject, length, content source |
| `practice_sessions` | One row per completed exercise |
| `exercise_transcripts` | Source text and rendition transcript (+ capture metadata) |
| `recordings` | Metadata for opt-in audio in the private `recordings` bucket, with mandatory `expires_at` |
| `evaluation_results` | Scores as columns + full evaluation JSON |
| `performance_history` | Denormalised per-session metrics for analytics |
| `recurring_weaknesses` | Coach output per user (`unique(user_id, weakness_key)`) |
| `custom_terms` | Personal glossary |

**Row Level Security** is enabled on every user table with owner-only select/insert/update/delete policies; storage objects are restricted to `<user_id>/…` folders. Sessions are written atomically by the `save_practice_session(payload)` function, which runs as the caller (`security invoker`) so RLS still applies.

**Privacy defaults:** audio is never uploaded unless the user opts in; stored recordings always carry an expiry and are removed by `/api/cron/purge-recordings` (scheduled hourly in `vercel.json`; needs `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`). Users can delete all recordings, delete their full history, or export their data from Settings. Server STT/TTS routes process audio in memory and never persist it.

### Setting up Supabase

1. Create a project and run the migration (`supabase db push` or paste it into the SQL editor).
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In Authentication → URL configuration, add `<your-site>/auth/callback` as a redirect URL (email links and confirmations).

When Supabase is configured, `src/proxy.ts` refreshes the session and redirects signed-out users to `/login`.

## Architecture

```
src/
  app/
    (app)/            dashboard, practice, simulations, analytics, analytics/[id], terminology, settings
    exercise/         distraction-free exercise runner
    login/, auth/callback/
    api/              status, evaluate, transcribe, tts, passages/generate, cron/purge-recordings (guarded)
  components/
    exercise/         ExerciseRunner, EvaluationReport, waveforms, usePassagePlayer, useRecorder
    charts/ ui/ shell/ sessions/ coach/
  lib/
    exercises/        catalog, bilingual passage library, detail generator, dialogue scenarios, builder, plan, AI generation
    eval/             provider registry, Gemini provider, heuristic provider, number/text normalisation
    ai/               Gemini client + schema-validated JSON helper
    api/              request guard (auth + rate limit)
    speech/           server STT/TTS adapters (Gemini, OpenAI, Deepgram, ElevenLabs), WAV helper, browser fallbacks
    coach/ analytics/ data/ (repository interface, local + Supabase implementations, sample data) supabase/
  proxy.ts            auth session refresh / route protection
mobile/                the Expo app; imports pure logic from ../src/lib (see mobile/README.md)
supabase/migrations/  schema, RLS, storage policies
tests/                evaluator and coach tests
```

The UI depends only on the `Repository` interface (`src/lib/data/repository.ts`), so persistence can be swapped without touching pages.

## Known limitations / next steps

- Adaptive AI role-play (parties that react to the rendition in real time) is the next milestone; scripted dialogue simulations work today.
- Web: browser speech recognition quality varies and is unavailable in Firefox; typed renditions are always possible (fluency is then not scored).
- The mobile app has been type-checked, bundled for iOS (Hermes) and exercised through its web export; it has **not** been run on an iPhone or simulator. See `mobile/README.md` → Verification.
- Ear-voice span (décalage) is only measured by the web version; the mobile app does not yet report it.
- Only English and Spanish are supported; the content and evaluation layers are language-pair-generic.
