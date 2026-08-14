-- Suno round-trip V1: manual browser workflow (no API). Adds provenance to
-- track_versions, a one-open-per-track suno_experiments table (bottleneck
-- pattern), and suno_candidates decision rows. The dashboard owns intent
-- (goal), provenance (parent version), and review (keep/mine/reject);
-- generation itself stays manual on suno.com. external_job_id is an unused
-- slot for the official Suno API later.
--
-- Ordering: suno_experiments is created first because track_versions gains an
-- experiment_id FK to it below. There is no true circularity — both
-- back-references are `on delete set null`.

-- ---------------------------------------------------------------------------
-- suno_experiments: one bounded creative question per round-trip
-- ---------------------------------------------------------------------------
create table if not exists suno_experiments (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null,
  track_id          uuid not null references tracks(id) on delete cascade,
  source_version_id uuid references track_versions(id) on delete set null,
  goal              text not null check (length(trim(goal)) > 0),
  prompt            text,
  status            text not null default 'ready_to_send'
    check (status in ('ready_to_send', 'waiting_for_results', 'reviewing',
                      'selected', 'integrated', 'discarded')),
  action_id         uuid references actions(id) on delete set null,
  external_job_id   text,
  outcome_note      text,
  created_at        timestamptz not null default now(),
  closed_at         timestamptz
);

-- Suno's failure mode is infinite optionality: at most one non-terminal
-- experiment per track (same pattern as bottlenecks_one_active_per_track).
-- Terminal states are 'integrated' and 'discarded'.
create unique index if not exists suno_experiments_one_open_per_track
  on suno_experiments (track_id)
  where status not in ('integrated', 'discarded');

create index if not exists suno_experiments_track_idx
  on suno_experiments (track_id, created_at desc);
create index if not exists suno_experiments_owner_idx
  on suno_experiments (owner_id);

-- ---------------------------------------------------------------------------
-- track_versions: provenance + review state
-- ---------------------------------------------------------------------------
alter table track_versions
  add column if not exists kind text not null default 'bounce',
  add column if not exists source text not null default 'upload',
  add column if not exists parent_version_id uuid
    references track_versions(id) on delete set null,
  add column if not exists review_status text not null default 'none',
  add column if not exists notes text,
  add column if not exists suno_url text,
  add column if not exists experiment_id uuid
    references suno_experiments(id) on delete set null;

-- Keep these value lists in sync with src/lib/suno.ts.
alter table track_versions drop constraint if exists track_versions_kind_check;
alter table track_versions add constraint track_versions_kind_check
  check (kind in ('bounce', 'suno_variation', 'reference'));

alter table track_versions drop constraint if exists track_versions_source_check;
alter table track_versions add constraint track_versions_source_check
  check (source in ('ableton', 'suno', 'upload'));

alter table track_versions drop constraint if exists track_versions_review_status_check;
alter table track_versions add constraint track_versions_review_status_check
  check (review_status in ('none', 'inbox', 'keeper', 'mined', 'rejected'));

create index if not exists track_versions_experiment_idx
  on track_versions (experiment_id);
create index if not exists track_versions_parent_idx
  on track_versions (parent_version_id);

-- ---------------------------------------------------------------------------
-- suno_candidates: one row per returned clip. version_id is set null (not
-- cascaded) when the version row is deleted at experiment close, so the
-- keep/mine/reject decision history survives the audio cleanup.
-- ---------------------------------------------------------------------------
create table if not exists suno_candidates (
  id                   uuid primary key default gen_random_uuid(),
  experiment_id        uuid not null references suno_experiments(id) on delete cascade,
  version_id           uuid references track_versions(id) on delete set null,
  decision             text not null default 'unreviewed'
    check (decision in ('unreviewed', 'keep', 'mine', 'reject')),
  decision_note        text,
  mine_timestamp_start numeric check (mine_timestamp_start >= 0),
  mine_timestamp_end   numeric check (mine_timestamp_end >= 0),
  created_at           timestamptz not null default now()
);

create index if not exists suno_candidates_experiment_idx
  on suno_candidates (experiment_id, created_at);

-- ---------------------------------------------------------------------------
-- session_activities: add suno_ideation so Suno time is logged time.
-- Keep in sync with src/lib/production-activities.ts.
-- ---------------------------------------------------------------------------
alter table session_activities
  drop constraint if exists session_activities_activity_key_check;
alter table session_activities add constraint session_activities_activity_key_check
  check (activity_key in (
    'sound_design', 'arrangement', 'mixing', 'organization', 'melody_harmony',
    'automation', 'reference_listening', 'fx_design', 'suno_ideation', 'other'
  ));

-- ---------------------------------------------------------------------------
-- RLS: no-policy lockdown, same as 0016. The server client uses the
-- service_role key; the anon key (shipped in the browser) gets nothing.
-- ---------------------------------------------------------------------------
alter table suno_experiments enable row level security;
alter table suno_candidates  enable row level security;
