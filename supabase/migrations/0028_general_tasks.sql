-- Tasks that belong to the studio rather than to a song.
--
-- WHY
-- ---
-- `actions.track_id` was NOT NULL, so every task had to hang off a track.
-- Real production work does not: "back up the project drive", "sort the
-- sample folder", "finish the Serum FM course", "email the mastering
-- engineer". Those had nowhere to live except a placeholder track or a note
-- nobody reads, so they stayed in the user's head — which is exactly what the
-- task list exists to stop.
--
-- Dropping the NOT NULL makes `track_id is null` mean "general task". Nothing
-- else changes: the same table, the same `sort_order` from 0025, the same
-- completion timestamp feeding the dashboard's tasks-done stat, and the same
-- list UI (`TrackTodoList` now takes a nullable track id).
--
-- WHY owner_id
-- ------------
-- A track-scoped task is scoped to its owner through the track — every read
-- joins `tracks!inner(owner_id)`. A general task has no track to join, so it
-- has to carry the owner itself. The column is backfilled from the track for
-- existing rows so both kinds of task answer "whose is this?" the same way.
--
-- It stays nullable rather than NOT NULL: rows written by a deploy that
-- predates this migration have a track and are still readable through it, so
-- a null owner on a track-scoped row is legal history, not corruption. The
-- check constraint below is the part that actually matters — a task with
-- neither a track nor an owner is unreachable from every read path, so it is
-- rejected at write time instead of quietly disappearing.

alter table actions alter column track_id drop not null;

alter table actions add column if not exists owner_id uuid;

update actions a
   set owner_id = t.owner_id
  from tracks t
 where t.id = a.track_id
   and a.owner_id is null;

alter table actions drop constraint if exists actions_reachable_check;
alter table actions add constraint actions_reachable_check
  check (track_id is not null or owner_id is not null);

-- The general-task read: `track_id is null` for one owner, in list order
-- (hand-set `sort_order` from 0025 with NULLs last, then `created_at`).
create index if not exists actions_general_idx
  on actions (owner_id, sort_order, created_at)
  where track_id is null;
