-- Lock down all user tables: enable Row Level Security with NO policies.
--
-- With no policies, the anon and authenticated roles are denied all access. The
-- server client uses the service_role key (see src/lib/supabase/server.ts), which
-- bypasses RLS, so the app keeps full access. This closes the hole where the public
-- anon key (shipped in the browser bundle) could read/modify every row directly.
--
-- ORDER OF OPERATIONS — apply this ONLY after a deploy where
-- SUPABASE_SERVICE_ROLE_KEY is set in the server environment. If the server client
-- is still falling back to the anon key when this runs, the live app will be blocked.
--
-- Storage buckets are unaffected: browser uploads use the anon key against public
-- buckets, which are gated by their own storage.objects policies (see 0003, 0011).

alter table albums                enable row level security;
alter table tracks                enable row level security;
alter table track_stages          enable row level security;
alter table bottlenecks           enable row level security;
alter table actions               enable row level security;
alter table sessions              enable row level security;
alter table track_versions        enable row level security;
alter table session_types         enable row level security;
alter table session_templates     enable row level security;
alter table session_template_todos enable row level security;
alter table session_recurrences   enable row level security;
alter table session_todos         enable row level security;
alter table weekly_reviews        enable row level security;
alter table resources             enable row level security;
alter table instruments           enable row level security;
alter table session_activities    enable row level security;
