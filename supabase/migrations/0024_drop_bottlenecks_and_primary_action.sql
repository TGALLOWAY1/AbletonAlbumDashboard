-- Drop the bottleneck and "primary action" concepts.
--
-- WHY
-- ---
-- Both were separate answers to "what should I do on this track next", and
-- both duplicated something already on the page:
--
--   * `actions.is_primary` singled out one open task as the next action, so
--     the track page rendered that row twice — once in its own card and once
--     in the task list underneath. The next action is now implicit: it is the
--     top of the open task list, ordered by `created_at` (see
--     `attachDetails` in src/lib/data/tracks.ts and `nextTask` on
--     TrackWithDetails).
--   * `bottlenecks` recorded what was blocking a track. It was never
--     something you acted on directly — the fix always became a task — so the
--     table, its dashboard tiles, its analytics breakdown and the
--     `sessions.new_bottleneck` capture on the session log all go.
--
-- DATA LOSS
-- ---------
-- This is destructive and not reversible by rolling the migration back:
-- every bottleneck row and every `sessions.new_bottleneck` note is deleted.
-- Take a backup first if that history is worth keeping. The task list is
-- untouched: no `actions` rows are removed, only the `is_primary` flag on
-- them, so nothing anybody wrote as a task is lost.

-- ---------------------------------------------------------------------------
-- bottlenecks
-- ---------------------------------------------------------------------------
drop index if exists bottlenecks_one_active_per_track;
drop table if exists bottlenecks;

alter table sessions drop column if exists new_bottleneck;

-- ---------------------------------------------------------------------------
-- actions.is_primary
-- ---------------------------------------------------------------------------
-- The partial unique index goes first: it is defined over the column.
drop index if exists actions_one_primary_per_track;
alter table actions drop column if exists is_primary;

-- `actions_track_idx (track_id, created_at desc)` from 0001 still covers the
-- per-track task queries. The open-task read now orders ascending, which the
-- same index serves via a backward scan, so no new index is needed.
