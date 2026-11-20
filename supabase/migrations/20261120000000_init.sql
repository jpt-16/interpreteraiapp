-- Interpreter performance training platform — initial schema.
-- Every user-owned table has Row Level Security enabled; users can only
-- read and write their own rows. Recordings are opt-in and expire.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table public.language_pairs (
  id smallint generated always as identity primary key,
  source_lang text not null check (source_lang in ('en', 'es')),
  target_lang text not null check (target_lang in ('en', 'es')),
  label text not null,
  is_active boolean not null default true,
  unique (source_lang, target_lang)
);

insert into public.language_pairs (source_lang, target_lang, label) values
  ('en', 'es', 'English → Spanish'),
  ('es', 'en', 'Spanish → English'),
  ('en', 'en', 'English (memory)'),
  ('es', 'es', 'Spanish (memory)');

alter table public.language_pairs enable row level security;
create policy "language pairs readable by signed-in users"
  on public.language_pairs for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles (privacy-conscious defaults: recordings are NOT stored)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Interpreter',
  default_source_lang text not null default 'en' check (default_source_lang in ('en', 'es')),
  default_target_lang text not null default 'es' check (default_target_lang in ('en', 'es')),
  speech_rate_multiplier numeric(3, 2) not null default 1.00 check (speech_rate_multiplier between 0.7 and 1.4),
  store_recordings boolean not null default false,
  recording_retention_days integer not null default 7 check (recording_retention_days between 1 and 30),
  show_sample_data boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "own profile: select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Interpreter'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Exercise configurations
-- ---------------------------------------------------------------------------
create table public.exercise_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_type text not null check (exercise_type in ('memory', 'consecutive', 'simultaneous', 'info-retention', 'dialogue')),
  language_pair_id smallint references public.language_pairs (id),
  source_lang text not null,
  target_lang text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  subject text not null,
  audio_length text not null check (audio_length in ('short', 'medium', 'long')),
  content_source text not null default 'library',
  scenario_id text,
  created_at timestamptz not null default now()
);
create index exercise_configs_user_idx on public.exercise_configs (user_id);

-- ---------------------------------------------------------------------------
-- Practice sessions
-- ---------------------------------------------------------------------------
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  config_id uuid not null references public.exercise_configs (id) on delete cascade,
  exercise_title text not null,
  exercise_type text not null,
  subject text not null,
  difficulty smallint not null,
  word_count integer not null,
  unit_count integer not null,
  duration_sec numeric,
  overall_score smallint check (overall_score between 0 and 100),
  evaluation_mode text not null,
  created_at timestamptz not null default now()
);
create index practice_sessions_user_created_idx on public.practice_sessions (user_id, created_at desc);

-- Source text and the user's rendition
create table public.exercise_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('source', 'rendition')),
  language text not null,
  content text not null,
  transcription_source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index exercise_transcripts_session_idx on public.exercise_transcripts (session_id);

-- Recording metadata only; audio lives in the private "recordings" bucket
-- and is only uploaded when the user opts in.
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  duration_sec numeric,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index recordings_expires_idx on public.recordings (expires_at);

create table public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.practice_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null,
  model text,
  mode text not null check (mode in ('ai', 'heuristic-demo')),
  overall_score smallint not null,
  semantic_accuracy smallint,
  information_retention smallint,
  completeness smallint,
  fidelity smallint,
  numbers_dates smallint,
  terminology smallint,
  fluency smallint,
  details jsonb not null,
  created_at timestamptz not null default now()
);

-- Denormalised per-session metrics for fast analytics
create table public.performance_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null unique references public.practice_sessions (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  exercise_type text not null,
  subject text not null,
  difficulty smallint not null,
  source_lang text not null,
  target_lang text not null,
  word_count integer not null,
  overall_score smallint not null,
  semantic_accuracy smallint,
  information_retention smallint,
  completeness smallint,
  fidelity smallint,
  numbers_dates smallint,
  terminology smallint,
  fluency smallint
);
create index performance_history_user_time_idx on public.performance_history (user_id, recorded_at);

create table public.recurring_weaknesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weakness_key text not null,
  label text not null,
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  occurrences integer not null default 1,
  trend text not null default 'stable',
  evidence text,
  recommendation jsonb,
  status text not null default 'active' check (status in ('active', 'resolved')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weakness_key)
);

create table public.custom_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_lang text not null check (source_lang in ('en', 'es')),
  source_term text not null check (char_length(source_term) between 1 and 200),
  target_term text not null check (char_length(target_term) between 1 and 200),
  domain text not null default 'general',
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index custom_terms_user_idx on public.custom_terms (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only access on every user table
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'exercise_configs', 'practice_sessions', 'exercise_transcripts', 'recordings',
    'evaluation_results', 'performance_history', 'recurring_weaknesses', 'custom_terms'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Atomic save of a completed exercise (runs with the caller's privileges,
-- so RLS still applies to every insert).
-- ---------------------------------------------------------------------------
create function public.save_practice_session(payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cfg jsonb := payload -> 'config';
  ev jsonb := payload -> 'evaluation';
  sc jsonb := ev -> 'scores';
  v_config_id uuid;
  v_session_id uuid := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
  v_pair smallint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select id into v_pair from public.language_pairs
   where source_lang = cfg ->> 'sourceLang' and target_lang = cfg ->> 'targetLang';

  insert into public.exercise_configs (user_id, exercise_type, language_pair_id, source_lang, target_lang, difficulty, subject, audio_length, content_source, scenario_id)
  values (uid, cfg ->> 'type', v_pair, cfg ->> 'sourceLang', cfg ->> 'targetLang', (cfg ->> 'difficulty')::smallint,
          cfg ->> 'subject', cfg ->> 'length', coalesce(cfg ->> 'contentSource', 'library'), cfg ->> 'scenarioId')
  returning id into v_config_id;

  insert into public.practice_sessions (id, user_id, config_id, exercise_title, exercise_type, subject, difficulty, word_count, unit_count, duration_sec, overall_score, evaluation_mode, created_at)
  values (v_session_id, uid, v_config_id, payload ->> 'exerciseTitle', cfg ->> 'type', cfg ->> 'subject', (cfg ->> 'difficulty')::smallint,
          (payload ->> 'wordCount')::int, (payload ->> 'unitCount')::int, (payload ->> 'durationSec')::numeric,
          (ev ->> 'overallScore')::smallint, ev ->> 'mode', coalesce((payload ->> 'createdAt')::timestamptz, now()));

  insert into public.exercise_transcripts (session_id, user_id, kind, language, content)
  values (v_session_id, uid, 'source', cfg ->> 'sourceLang', payload ->> 'sourceText');

  insert into public.exercise_transcripts (session_id, user_id, kind, language, content, transcription_source, metadata)
  values (v_session_id, uid, 'rendition', cfg ->> 'targetLang', coalesce(payload -> 'response' ->> 'transcript', ''),
          payload -> 'response' ->> 'transcriptionSource', coalesce(payload -> 'response', '{}'::jsonb) - 'transcript');

  insert into public.evaluation_results (session_id, user_id, provider, model, mode, overall_score, semantic_accuracy, information_retention,
                                         completeness, fidelity, numbers_dates, terminology, fluency, details)
  values (v_session_id, uid, ev ->> 'provider', ev ->> 'model', ev ->> 'mode', (ev ->> 'overallScore')::smallint,
          (sc ->> 'semanticAccuracy')::smallint, (sc ->> 'informationRetention')::smallint, (sc ->> 'completeness')::smallint,
          (sc ->> 'fidelity')::smallint, (sc ->> 'numbersDates')::smallint, (sc ->> 'terminology')::smallint,
          (sc ->> 'fluency')::smallint, ev);

  insert into public.performance_history (user_id, session_id, recorded_at, exercise_type, subject, difficulty, source_lang, target_lang, word_count,
                                          overall_score, semantic_accuracy, information_retention, completeness, fidelity, numbers_dates, terminology, fluency)
  values (uid, v_session_id, coalesce((payload ->> 'createdAt')::timestamptz, now()), cfg ->> 'type', cfg ->> 'subject',
          (cfg ->> 'difficulty')::smallint, cfg ->> 'sourceLang', cfg ->> 'targetLang', (payload ->> 'wordCount')::int,
          (ev ->> 'overallScore')::smallint, (sc ->> 'semanticAccuracy')::smallint, (sc ->> 'informationRetention')::smallint,
          (sc ->> 'completeness')::smallint, (sc ->> 'fidelity')::smallint, (sc ->> 'numbersDates')::smallint,
          (sc ->> 'terminology')::smallint, (sc ->> 'fluency')::smallint);

  return v_session_id;
end;
$$;

revoke all on function public.save_practice_session(jsonb) from public, anon;
grant execute on function public.save_practice_session(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, one folder per user (<user_id>/<session_id>.webm)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 26214400, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

create policy "recordings: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "recordings: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "recordings: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Expired recordings are removed by /api/cron/purge-recordings (service role),
-- which deletes the storage object first and then the metadata row.
create view public.expired_recordings with (security_invoker = true) as
  select id, user_id, storage_path from public.recordings where expires_at <= now();
