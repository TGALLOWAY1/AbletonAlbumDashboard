-- track_step_notes: notes attached to one row of the finishing checklist.
--
-- Every finishing step is a topic with something to keep: the ChatGPT sound
-- palette, the mixing tips, a screenshot of the Suno favorites. Until now the
-- checklist could only record *that* a step was done, so all of that went to
-- the track's one free-text notes field or nowhere. This gives each step its
-- own notes page, reached from a chevron on the checklist row.
--
-- Same shape as a resource (0011): a note is one of two kinds — inline
-- markdown, or an uploaded image — and a check constraint makes sure the body
-- for the chosen kind is present. There can be any number of notes on a step,
-- so each has its own id and there is no upsert; that is also what lets
-- `variation_id` be nullable here without the ON CONFLICT problem 0031
-- describes. NULL means the track's own checklist; set, it names that
-- variation's run of it, and both cascade.
--
-- Images live in the public `track-images` bucket (0004) under
-- step-notes/<track_id>/, stored by object key so a delete can remove the
-- file; the public URL is derived at read time. Width and height are recorded
-- at upload so the page can reserve the image's box before it loads.
--
-- Step keys are the universal FINISHING_STEP_KEYS list from src/lib/types.ts;
-- keep this check in sync with 0030's and 0031's (step-notes.test.ts asserts
-- it). The constraints are named so the app can tell a too-narrow list from
-- any other failure.

create table if not exists track_step_notes (
  id           uuid primary key default gen_random_uuid(),
  track_id     uuid not null references tracks(id) on delete cascade,
  variation_id uuid references track_variations(id) on delete cascade,
  step_key     text not null,
  kind         text not null,
  title        text not null default '',
  -- markdown kind: the note body
  content      text,
  -- image kind: object key in the track-images bucket, plus its pixel size
  image_path   text,
  image_width  integer check (image_width > 0),
  image_height integer check (image_height > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint track_step_notes_step_key_check check (step_key in (
    'suno_variations',
    'arrangement_favorites',
    'sound_palette',
    'core_elements',
    'mixing_tips',
    'stems_midi',
    'ableton_cleanup'
  )),
  constraint track_step_notes_kind_check check (kind in ('markdown', 'image')),
  -- the body for the chosen kind must be there
  constraint track_step_notes_body_check check (
    (kind = 'markdown' and content is not null) or
    (kind = 'image' and image_path is not null)
  )
);

create index if not exists track_step_notes_track_step_idx
  on track_step_notes (track_id, step_key, created_at desc);

create index if not exists track_step_notes_variation_idx
  on track_step_notes (variation_id) where variation_id is not null;

drop trigger if exists track_step_notes_set_updated_at on track_step_notes;
create trigger track_step_notes_set_updated_at
  before update on track_step_notes
  for each row execute function set_updated_at();

-- Same posture as every other table since 0016: RLS on, no policies, the
-- server's service-role client bypasses it.
alter table track_step_notes enable row level security;
