-- albums.create was failing with 42501 ("new row violates row-level security
-- policy") because the table came up with RLS enabled (Supabase project
-- default) and migration 0010 didn't add any policies. The rest of V1
-- uses the anon key server-side with RLS off on user tables — see the
-- comment in src/lib/supabase/server.ts. Match that pattern here; the
-- proper RLS policies land alongside multi-user auth later.

alter table albums disable row level security;
