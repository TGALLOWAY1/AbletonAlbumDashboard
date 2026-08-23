-- track_finishing_steps: the fixed hand-off checklist that turns a track that
-- sounds finished into one that is actually delivered.
--
-- Deliberately not `track_stages` rows. Stages are the creative arc and their
-- average *is* the track's progress percentage (`progressFromStages`), so
-- filing three housekeeping jobs there would quietly redefine what "62%" on a
-- card means. These are a separate, always-three checklist with its own
-- completion state, surfaced on the large track card.
--
-- Rows are written on first tick rather than seeded per track: an absent row
-- means "not done", which is also what a project that has not applied this
-- migration yet reads as (see attachDetails in src/lib/data/tracks.ts).

create table if not exists track_finishing_steps (
  track_id     uuid not null references tracks(id) on delete cascade,
  step_key     text not null check (step_key in ('suno_variations','stems_midi','ableton_cleanup')),
  completed_at timestamptz,
  primary key (track_id, step_key)
);

create index if not exists track_finishing_steps_track_idx
  on track_finishing_steps (track_id);

-- Same posture as every other table since 0016: RLS on, no policies, the
-- server's service-role client bypasses it.
alter table track_finishing_steps enable row level security;
