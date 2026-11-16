-- Session Starters extends the reusable templates and the existing session log.
-- This single-user deployment accesses tables only through owner-scoped server
-- actions and the service role; no anonymous storage/table policies are added.
alter table public.session_templates
  add column if not exists starter_data jsonb,
  add column if not exists starter_seed_key text,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.session_templates
  add constraint session_templates_starter_data_object
    check (starter_data is null or jsonb_typeof(starter_data) = 'object');
create unique index if not exists session_templates_starter_seed_idx
  on public.session_templates(owner_id, starter_seed_key) where starter_seed_key is not null;
drop trigger if exists session_templates_set_updated_at on public.session_templates;
create trigger session_templates_set_updated_at before update on public.session_templates
  for each row execute function public.set_updated_at();

create table if not exists public.session_starter_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  template_id uuid not null references public.session_templates(id) on delete cascade,
  storage_path text not null unique,
  name text not null,
  kind text not null check (kind in ('cover','infographic','reference')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 8388608),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);
create index if not exists session_starter_media_owner_template_idx
  on public.session_starter_media(owner_id,template_id,sort_order);
alter table public.session_starter_media enable row level security;
-- Existing templates already have RLS via migration 0016; make the assumption explicit.
alter table public.session_templates enable row level security;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('session-starter-visuals','session-starter-visuals',false,8388608,
  array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.sessions
  add column if not exists starter_snapshot jsonb,
  add column if not exists starter_run_id uuid,
  add column if not exists worked_seconds integer,
  add column if not exists starter_output jsonb;
alter table public.sessions
  add constraint sessions_worked_seconds_nonnegative check (worked_seconds is null or worked_seconds >= 0),
  add constraint sessions_starter_snapshot_object check (starter_snapshot is null or jsonb_typeof(starter_snapshot) = 'object'),
  add constraint sessions_starter_output_object check (starter_output is null or jsonb_typeof(starter_output) = 'object');
-- A retry after an interrupted save cannot create a second log for the same run.
create unique index if not exists sessions_starter_run_idx
  on public.sessions(starter_run_id);
create index if not exists sessions_template_idx on public.sessions(template_id) where template_id is not null;
