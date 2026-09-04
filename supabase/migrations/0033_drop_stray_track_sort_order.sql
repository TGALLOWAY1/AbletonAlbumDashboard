-- Finish Five: drop a column that production had and the repo never did.
--
-- On 2026-08-25 a migration named "track_sort_order" was applied straight to
-- the production project (not through this directory). It added
-- `tracks.sort_order integer not null default 0`, backfilled it with a
-- row_number() per (owner_id, status) by created_at desc, and created
-- `tracks_owner_status_sort_idx`. It was groundwork for a hand-set priority
-- order on the Tracks page that never shipped from this repo; the ordering
-- the app actually keeps is the pinned shortlist (`pin_order`, 0027) and the
-- album shelf, and nothing in `src/` reads or writes `tracks.sort_order`.
--
-- DATA LOSS: `tracks.sort_order` is dropped. What is lost is the backfilled
-- row-number ordering above — a computed value, not anything a user set — and
-- nothing reads it. The index goes with it.
--
-- Every statement is `if exists`, so this is a no-op on a database provisioned
-- from the repo (preview branches) and only does work on production.

drop index if exists tracks_owner_status_sort_idx;

alter table tracks drop column if exists sort_order;
