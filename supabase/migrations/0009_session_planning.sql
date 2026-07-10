-- Session planning: turn the calendar into an interactive weekly planner.
-- Sessions move through a planned -> in_progress -> completed lifecycle.
-- Adds user-editable session types, structured todos with carry-over,
-- templates, recurring blocks, and weekly intention/reflection.

-- ---------------------------------------------------------------------------
-- session_types: user-editable categories (Sound Design, Arrangement, etc.)
-- ---------------------------------------------------------------------------
create table if not exists session_types (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
  name            text not null,
  color           text not null,
  icon            text,
  requires_track  boolean not null default false,
  is_archived     boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create unique index if not exists session_types_owner_name_idx
  on session_types (owner_id, name) where not is_archived;
create index if not exists session_types_owner_sort_idx
  on session_types (owner_id, sort_order) where not is_archived;

-- ---------------------------------------------------------------------------
-- session_templates: reusable session shapes (default duration + todos)
-- ---------------------------------------------------------------------------
create table if not exists session_templates (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null,
  name                     text not null,
  session_type_id          uuid references session_types(id) on delete set null,
  default_duration_minutes integer not null default 60 check (default_duration_minutes > 0),
  default_notes_md         text,
  created_at               timestamptz not null default now()
);
create index if not exists session_templates_owner_idx on session_templates (owner_id, created_at desc);

create table if not exists session_template_todos (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references session_templates(id) on delete cascade,
  description text not null,
  sort_order  integer not null default 0
);
create index if not exists session_template_todos_template_idx
  on session_template_todos (template_id, sort_order);

-- ---------------------------------------------------------------------------
-- session_recurrences: weekday + time-of-day blocks that materialize into
-- planned sessions on calendar load.
-- ---------------------------------------------------------------------------
create table if not exists session_recurrences (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null,
  template_id      uuid references session_templates(id) on delete set null,
  session_type_id  uuid references session_types(id) on delete set null,
  weekday          smallint not null check (weekday between 0 and 6),
  start_time       time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  track_id         uuid references tracks(id) on delete set null,
  active_from      date not null default current_date,
  active_until     date,
  created_at       timestamptz not null default now()
);
create index if not exists session_recurrences_owner_idx on session_recurrences (owner_id, weekday);

-- ---------------------------------------------------------------------------
-- Extend sessions: add lifecycle, planning fields, ratings, notes.
-- ---------------------------------------------------------------------------
alter table sessions
  alter column started_at drop not null,
  alter column ended_at drop not null,
  alter column track_id drop not null;

-- Drop the original CHECK (ended_at >= started_at) which was created without
-- a name. Postgres auto-named it sessions_check.
alter table sessions drop constraint if exists sessions_check;

alter table sessions
  add column if not exists status text not null default 'completed',
  add column if not exists session_type_id   uuid references session_types(id) on delete set null,
  add column if not exists planned_start     timestamptz,
  add column if not exists planned_end       timestamptz,
  add column if not exists notes_md          text,
  add column if not exists energy_rating     smallint,
  add column if not exists enjoyment_rating  smallint,
  add column if not exists template_id       uuid references session_templates(id) on delete set null,
  add column if not exists recurrence_id     uuid references session_recurrences(id) on delete set null;

alter table sessions drop constraint if exists sessions_status_check;
alter table sessions add constraint sessions_status_check
  check (status in ('planned','in_progress','completed','skipped'));

alter table sessions drop constraint if exists sessions_energy_rating_check;
alter table sessions add constraint sessions_energy_rating_check
  check (energy_rating between 1 and 5);

alter table sessions drop constraint if exists sessions_enjoyment_rating_check;
alter table sessions add constraint sessions_enjoyment_rating_check
  check (enjoyment_rating between 1 and 5);

alter table sessions drop constraint if exists sessions_actual_time_order;
alter table sessions add constraint sessions_actual_time_order check (
  started_at is null or ended_at is null or ended_at >= started_at
);

alter table sessions drop constraint if exists sessions_planned_time_order;
alter table sessions add constraint sessions_planned_time_order check (
  planned_start is null or planned_end is null or planned_end >= planned_start
);

alter table sessions drop constraint if exists sessions_planned_has_times;
alter table sessions add constraint sessions_planned_has_times check (
  status <> 'planned' or (planned_start is not null and planned_end is not null)
);

alter table sessions drop constraint if exists sessions_completed_has_actuals;
alter table sessions add constraint sessions_completed_has_actuals check (
  status not in ('completed','in_progress')
  or (started_at is not null and ended_at is not null)
);

create index if not exists sessions_status_planned_idx on sessions (status, planned_start);
create index if not exists sessions_session_type_idx on sessions (session_type_id, planned_start);
create index if not exists sessions_recurrence_idx on sessions (recurrence_id, planned_start);

-- Prevent duplicate recurrence materialization for the same start time.
create unique index if not exists sessions_recurrence_unique
  on sessions (recurrence_id, planned_start) where recurrence_id is not null;

-- ---------------------------------------------------------------------------
-- session_todos: structured checklist per session, with carry-over chain.
-- ---------------------------------------------------------------------------
create table if not exists session_todos (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  description   text not null,
  done          boolean not null default false,
  done_at       timestamptz,
  sort_order    integer not null default 0,
  carried_from  uuid references session_todos(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists session_todos_session_idx on session_todos (session_id, sort_order);

-- ---------------------------------------------------------------------------
-- weekly_reviews: one row per week (Monday-anchored) for intention + reflection.
-- ---------------------------------------------------------------------------
create table if not exists weekly_reviews (
  owner_id    uuid not null,
  week_start  date not null,
  intention   text not null default '',
  reflection  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (owner_id, week_start)
);

drop trigger if exists weekly_reviews_set_updated_at on weekly_reviews;
create trigger weekly_reviews_set_updated_at
  before update on weekly_reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed default session types for the single-user owner.
-- ---------------------------------------------------------------------------
insert into session_types (owner_id, name, color, icon, requires_track, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Sound Design',       '#7C5CFF', 'Sparkles',     true,  0),
  ('00000000-0000-0000-0000-000000000001', 'Arrangement',        '#4CAF50', 'Layers',       true,  1),
  ('00000000-0000-0000-0000-000000000001', 'Drum & Bass Design', '#E91E63', 'Drum',         true,  2),
  ('00000000-0000-0000-0000-000000000001', 'Mixing',             '#03A9F4', 'SlidersVertical', true, 3),
  ('00000000-0000-0000-0000-000000000001', 'Mastering',          '#00BCD4', 'Wand2',        true,  4),
  ('00000000-0000-0000-0000-000000000001', 'Performance',        '#FF9800', 'Mic2',         false, 5),
  ('00000000-0000-0000-0000-000000000001', 'Organization',       '#9E9E9E', 'FolderOpen',   false, 6),
  ('00000000-0000-0000-0000-000000000001', 'Other',              '#607D8B', 'CircleDashed', false, 7)
on conflict (owner_id, name) where not is_archived do nothing;
