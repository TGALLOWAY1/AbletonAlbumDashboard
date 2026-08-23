-- Manual ordering for a track's open tasks.
--
-- WHY
-- ---
-- Migration 0024 removed `actions.is_primary` and made the next action
-- implicit: it is the top of the open task list. That only means something if
-- the top is something you choose, so tasks need an order you can set.
--
-- NULLABLE ON PURPOSE
-- -------------------
-- The column is nullable with no backfill, and reads sort `sort_order` with
-- NULLs last, then `created_at` ascending. So:
--
--   * a track nobody has reordered keeps exactly today's order (creation
--     order) — no backfill pass, no behaviour change on deploy;
--   * a newly added task has NULL and lands at the bottom, which is where a
--     new task belongs, again without the insert needing to look up a max;
--   * the first reorder of a track writes an explicit 0..n-1 over every row
--     it displays, so that track becomes fully ordered in one go.
--
-- Mixed NULL/non-NULL within a track is therefore only a transient state
-- (reordered rows first, then anything added since, by age). That is the
-- intended reading, not a bug.

alter table actions add column if not exists sort_order integer;

-- Matches the read order in `getOpenActionsForTrack` and `attachDetails`.
create index if not exists actions_track_sort_idx
  on actions (track_id, sort_order, created_at);
