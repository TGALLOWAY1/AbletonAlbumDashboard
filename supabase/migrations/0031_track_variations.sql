-- track_variations: named variations of a song, each carrying its own run of
-- the finishing checklist. A track being finished through Suno often has
-- several variations in flight at once — each needs the same round-trip
-- workflow (0030) walked separately, so one set of ticks per track is not
-- enough.
--
-- The track's own checklist stays in track_finishing_steps untouched: a track
-- with no variations behaves exactly as before, and adding a variation adds a
-- section, it does not move anything. Deliberately its own pair of tables
-- rather than a nullable variation column on track_finishing_steps — that
-- would force rebuilding its primary key and breaking the upsert arbiter for
-- the null case (Postgres cannot infer a partial unique index from a plain
-- ON CONFLICT column list).
--
-- Step keys are the same universal FINISHING_STEP_KEYS list from
-- src/lib/types.ts; keep this check in sync with 0030's (the sync test in
-- track-variations.test.ts asserts it). Like 0023, step rows are written on
-- first tick — an absent row means "not done" — so a fresh variation needs no
-- seeding.

create table if not exists track_variations (
  id         uuid primary key default gen_random_uuid(),
  track_id   uuid not null references tracks(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists track_variations_track_idx
  on track_variations (track_id, created_at);

create table if not exists track_variation_steps (
  variation_id uuid not null references track_variations(id) on delete cascade,
  step_key     text not null check (step_key in (
    'suno_variations',
    'arrangement_favorites',
    'sound_palette',
    'core_elements',
    'mixing_tips',
    'stems_midi',
    'ableton_cleanup'
  )),
  completed_at timestamptz,
  primary key (variation_id, step_key)
);

-- Same posture as every other table since 0016: RLS on, no policies, the
-- server's service-role client bypasses it.
alter table track_variations enable row level security;
alter table track_variation_steps enable row level security;
