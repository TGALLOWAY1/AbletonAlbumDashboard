-- Finish Five: the user can rearrange the resource categories.
--
-- WHY
-- ---
-- The category tabs on /resources are a fixed list in code
-- (RESOURCE_CATEGORIES in src/lib/data/resources.ts) — there is no categories
-- table to put a position on, and there should not be one: the list is pinned
-- to the `resources_category_check` constraint from 0026, and a test holds the
-- two in step. So the *order* is the only thing that varies per user, and it is
-- stored on its own.
--
-- One row per (owner, category) that has been placed. A category with no row —
-- every category today, and any added to the code later — falls in after the
-- placed ones in its default position (see orderCategories in
-- src/lib/resource-category-order.ts), so nothing needs a backfill and a new
-- category never disappears.
--
-- Not unique on (owner_id, sort_order): a reorder rewrites the whole list
-- 0..n-1 in parallel, and a unique index would make those writes race with
-- each other (same reasoning as tracks.pin_order in 0027).
--
-- No check on category_id: the set of categories is owned by the code, and a
-- stale id is ignored when the order is applied.

create table if not exists resource_category_order (
  owner_id    uuid    not null,
  category_id text    not null,
  sort_order  integer not null,
  primary key (owner_id, category_id)
);

-- Same posture as every other table since 0016: RLS on, no policies, the
-- server's service-role client bypasses it.
alter table resource_category_order enable row level security;
