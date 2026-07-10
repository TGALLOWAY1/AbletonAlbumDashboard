-- Analytics page fields: per-track genre, session category/activity, and
-- start/complete timestamps so the dashboard can attribute completions and
-- starts to a date window.

-- ---------------------------------------------------------------------------
-- tracks: genre, started_at, completed_at
-- ---------------------------------------------------------------------------
alter table tracks add column if not exists genre        text;
alter table tracks add column if not exists started_at   timestamptz;
alter table tracks add column if not exists completed_at timestamptz;

-- Backfill from existing data. started_at = first session ever logged for the
-- track. completed_at is best-effort: if the track is currently completed, use
-- updated_at as a stand-in for the completion moment.
update tracks t
   set started_at = (select min(started_at) from sessions where track_id = t.id)
 where started_at is null;

update tracks t
   set completed_at = t.updated_at
  where t.status = 'completed' and completed_at is null;

create index if not exists tracks_completed_at_idx on tracks (completed_at desc)
  where completed_at is not null;

-- started_at trigger: set on first session insert, never overwrite. Keeping it
-- one-shot lets the user edit the value freely after the fact.
create or replace function set_track_started_at()
returns trigger language plpgsql as $$
begin
  if new.track_id is not null then
    update tracks
       set started_at = new.started_at
     where id = new.track_id
       and started_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_set_started_at on sessions;
create trigger sessions_set_started_at
  after insert on sessions
  for each row execute function set_track_started_at();

-- completed_at trigger: stamp on transition into 'completed' (unless the row
-- already carries a user-provided value), clear on transition out.
create or replace function set_track_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tracks_set_completed_at on tracks;
create trigger tracks_set_completed_at
  before update on tracks
  for each row execute function set_track_completed_at();

-- ---------------------------------------------------------------------------
-- sessions: category + activity, optional track_id
-- ---------------------------------------------------------------------------
alter table sessions
  add column if not exists category text,
  add column if not exists activity text not null default 'working_on_track';

alter table sessions drop constraint if exists sessions_category_check;
alter table sessions add constraint sessions_category_check
  check (category in (
    'production-guides',
    'sound-design',
    'mixing-mastering',
    'workflow-mindset',
    'tools-plugins',
    'file-organization'
  ));

alter table sessions drop constraint if exists sessions_activity_check;
alter table sessions add constraint sessions_activity_check
  check (activity in (
    'working_on_track',
    'watching_guide',
    'reading_article',
    'using_templates',
    'other'
  ));

-- Activities other than 'working_on_track' (e.g. reading an article) aren't
-- attached to a track.
alter table sessions alter column track_id drop not null;

create index if not exists sessions_category_started_idx on sessions (category, started_at desc);
create index if not exists sessions_activity_started_idx on sessions (activity, started_at desc);

-- last_worked_at trigger now needs to no-op when track_id is null.
create or replace function bump_track_last_worked()
returns trigger language plpgsql as $$
begin
  if new.track_id is not null then
    update tracks
       set last_worked_at = greatest(coalesce(last_worked_at, new.ended_at), new.ended_at)
     where id = new.track_id;
  end if;
  return new;
end;
$$;
