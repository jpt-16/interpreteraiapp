# Local schema & RLS check

Runs the migration against plain Postgres with minimal stand-ins for Supabase's
`auth` / `storage` schemas, then checks owner-only access between two users.

```bash
createdb decalage_test
psql -d decalage_test -v ON_ERROR_STOP=1 -f supabase/tests/supabase_stub.sql
psql -d decalage_test -v ON_ERROR_STOP=1 -f supabase/migrations/20261120000000_init.sql
psql -d decalage_test -tA -f supabase/tests/rls_test.sql
```

Expected: user B sees none of user A's rows; B's cross-user insert and storage upload
fail with RLS errors; a recording without `expires_at` is rejected; deleting a session
cascades; `anon` cannot execute `save_practice_session`.
