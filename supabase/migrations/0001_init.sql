-- Finish Five: initial schema
-- Single-user V1: owner_id is hardcoded at the app boundary.
-- Tables carry owner_id so RLS can be added later without a migration.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- tracks
-- ---------------------------------------------------------------------------
create table tracks (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
  name            text not null,
  cover_image_url text,
  tags            text[] not null default '{}',
  status          text not null check (status in ('active','backlog','completed','archived')),
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_worked_at  timestamptz
);

create index tracks_status_lastworked_idx
  on tracks (status, last_worked_at desc nulls last);
create index tracks_owner_idx on tracks (owner_id);

-- bump updated_at on row mutation
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tracks_set_updated_at
  before update on tracks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- track_stages: 5 rows seeded per track via trigger
-- ---------------------------------------------------------------------------
create table track_stages (
  track_id   uuid not null references tracks(id) on delete cascade,
  stage_key  text not null check (stage_key in ('idea','sound_design','arrangement','mixing','mastering')),
  complete   boolean not null default false,
  percent    integer check (percent between 0 and 100),
  primary key (track_id, stage_key)
);

create or replace function seed_track_stages()
returns trigger language plpgsql as $$
begin
  insert into track_stages (track_id, stage_key) values
    (new.id, 'idea'),
    (new.id, 'sound_design'),
    (new.id, 'arrangement'),
    (new.id, 'mixing'),
    (new.id, 'mastering');
  return new;
end;
$$;

create trigger tracks_seed_stages
  after insert on tracks
  for each row execute function seed_track_stages();

-- ---------------------------------------------------------------------------
-- bottlenecks: at most one active per track
-- ---------------------------------------------------------------------------
create table bottlenecks (
  id          uuid primary key default gen_random_uuid(),
  track_id    uuid not null references tracks(id) on delete cascade,
  description text not null,
  category    text not null check (category in ('arrangement','mix','sound_design','composition')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index bottlenecks_one_active_per_track
  on bottlenecks (track_id) where is_active;

-- ---------------------------------------------------------------------------
-- actions: at most one primary per track
-- ---------------------------------------------------------------------------
create table actions (
  id                uuid primary key default gen_random_uuid(),
  track_id          uuid not null references tracks(id) on delete cascade,
  description       text not null,
  category          text,
  estimated_minutes integer,
  is_primary        boolean not null default false,
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create unique index actions_one_primary_per_track
  on actions (track_id) where is_primary and completed_at is null;
create index actions_track_idx on actions (track_id, created_at desc);

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table sessions (
  id               uuid primary key default gen_random_uuid(),
  track_id         uuid not null references tracks(id) on delete cascade,
  action_id        uuid references actions(id) on delete set null,
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  duration_seconds integer generated always as
    (greatest(0, extract(epoch from (ended_at - started_at))::integer)) stored,
  improved         text,
  still_broken     text,
  new_bottleneck   text,
  created_at       timestamptz not null default now(),
  check (ended_at >= started_at)
);

create index sessions_track_started_idx on sessions (track_id, started_at desc);
create index sessions_started_idx on sessions (started_at desc);

-- bump tracks.last_worked_at on session insert
create or replace function bump_track_last_worked()
returns trigger language plpgsql as $$
begin
  update tracks
     set last_worked_at = greatest(coalesce(last_worked_at, new.ended_at), new.ended_at)
   where id = new.track_id;
  return new;
end;
$$;

create trigger sessions_bump_last_worked
  after insert on sessions
  for each row execute function bump_track_last_worked();

-- ---------------------------------------------------------------------------
-- track_versions (audio previews)
-- ---------------------------------------------------------------------------
create table track_versions (
  id               uuid primary key default gen_random_uuid(),
  track_id         uuid not null references tracks(id) on delete cascade,
  label            text not null,
  storage_path     text not null,
  duration_seconds numeric,
  created_at       timestamptz not null default now()
);

create index track_versions_track_idx
  on track_versions (track_id, created_at desc);
