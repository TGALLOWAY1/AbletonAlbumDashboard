-- Expand the finishing checklist's Suno hand-off from one tick into the full
-- round-trip workflow: after generating Suno variations you save the
-- arrangement favorites, build a sound palette with ChatGPT, recreate the core
-- elements from bounces of what exists, and get ChatGPT mixing tips for tonal
-- balance — then stems/MIDI and Ableton cleanup close the track out as before.
--
-- The list stays universal on purpose: FINISHING_STEP_KEYS in src/lib/types.ts
-- is the single source of the steps and their order, every track shows the
-- same checklist, and because rows are only written on first tick (see 0023)
-- the new steps appear as outstanding on every existing track with no
-- backfill.
--
-- 0023 created the step_key check inline on the column, so Postgres auto-named
-- it track_finishing_steps_step_key_check; this re-adds it under the same name
-- with the four new keys. Purely widening — no existing row can violate the
-- new list, so no data loss.

alter table track_finishing_steps
  drop constraint if exists track_finishing_steps_step_key_check;

alter table track_finishing_steps
  add constraint track_finishing_steps_step_key_check
  check (step_key in (
    'suno_variations',
    'arrangement_favorites',
    'sound_palette',
    'core_elements',
    'mixing_tips',
    'stems_midi',
    'ableton_cleanup'
  ));
