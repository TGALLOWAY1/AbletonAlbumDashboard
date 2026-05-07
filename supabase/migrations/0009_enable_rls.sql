-- Enable RLS on all user tables. No policies are added: server-side access uses
-- the service_role key (which bypasses RLS); the anon key (browser) has no
-- access to these tables and never did at runtime.
alter table public.tracks            enable row level security;
alter table public.track_stages      enable row level security;
alter table public.bottlenecks       enable row level security;
alter table public.actions           enable row level security;
alter table public.sessions          enable row level security;
alter table public.track_versions    enable row level security;
alter table public.album_settings    enable row level security;
