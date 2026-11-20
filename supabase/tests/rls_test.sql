\set ON_ERROR_STOP on
-- Two users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');
select 'profiles created by trigger: ' || count(*) from public.profiles;
select 'privacy default store_recordings=' || store_recordings || ' retention=' || recording_retention_days from public.profiles limit 1;

-- User A saves a session through the RPC
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.save_practice_session('{
  "id": "aaaaaaaa-0000-0000-0000-000000000001",
  "createdAt": "2026-11-20T10:00:00Z",
  "config": {"type":"consecutive","sourceLang":"en","targetLang":"es","difficulty":2,"subject":"medical","length":"short","contentSource":"library"},
  "exerciseTitle": "Discharge instructions",
  "sourceText": "Source text",
  "wordCount": 70, "unitCount": 12, "durationSec": 95,
  "response": {"transcript": "Rendition", "durationSec": 40, "transcriptionSource": "browser"},
  "evaluation": {"mode":"heuristic-demo","provider":"demo-heuristic","overallScore":70,
    "scores":{"semanticAccuracy":80,"informationRetention":55,"completeness":82,"fidelity":100,"numbersDates":41,"terminology":60,"fluency":null}}
}'::jsonb) as saved_id;
insert into public.custom_terms (source_lang, source_term, target_term) values ('en', 'ejection fraction', 'fracción de eyección');
insert into public.recurring_weaknesses (weakness_key, label, description, severity) values ('numbers-retention', 'Numbers', 'desc', 'high');
select 'A sees sessions=' || (select count(*) from public.practice_sessions)
  || ' transcripts=' || (select count(*) from public.exercise_transcripts)
  || ' evals=' || (select count(*) from public.evaluation_results)
  || ' history=' || (select count(*) from public.performance_history)
  || ' terms=' || (select count(*) from public.custom_terms);

-- Embedded read like the client does
select s.exercise_title, c.exercise_type, e.overall_score, t.transcription_source
from public.practice_sessions s
join public.exercise_configs c on c.id = s.config_id
join public.evaluation_results e on e.session_id = s.id
join public.exercise_transcripts t on t.session_id = s.id and t.kind = 'rendition';

-- User B must see nothing of A's and cannot write as A
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'B sees sessions=' || (select count(*) from public.practice_sessions)
  || ' terms=' || (select count(*) from public.custom_terms)
  || ' weaknesses=' || (select count(*) from public.recurring_weaknesses)
  || ' profiles=' || (select count(*) from public.profiles);
update public.custom_terms set target_term = 'hacked';
delete from public.practice_sessions;
\set ON_ERROR_STOP off
insert into public.custom_terms (user_id, source_lang, source_term, target_term)
  values ('11111111-1111-1111-1111-111111111111', 'en', 'x', 'y');
-- Storage: B cannot upload into A's folder, but can into its own
insert into storage.objects (bucket_id, name) values ('recordings', '11111111-1111-1111-1111-111111111111/x.webm');
insert into storage.objects (bucket_id, name) values ('recordings', '22222222-2222-2222-2222-222222222222/x.webm');
\set ON_ERROR_STOP on

-- Back to A: data intact after B's attempts
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'A after B attempts: sessions=' || (select count(*) from public.practice_sessions)
  || ' term=' || (select target_term from public.custom_terms limit 1);
-- Recording metadata requires an expiry
\set ON_ERROR_STOP off
insert into public.recordings (session_id, storage_path, mime_type) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a/b.webm', 'audio/webm');
\set ON_ERROR_STOP on
-- Cascade delete removes all child rows
delete from public.practice_sessions;
select 'after delete: transcripts=' || (select count(*) from public.exercise_transcripts)
  || ' evals=' || (select count(*) from public.evaluation_results)
  || ' history=' || (select count(*) from public.performance_history);

-- Anonymous callers cannot use the RPC
reset role;
set role anon;
\set ON_ERROR_STOP off
select public.save_practice_session('{}'::jsonb);
