-- Finish Five: the dashboard is a set of widgets the user arranges.
--
-- WHY
-- ---
-- The home page used to be one fixed stack of sections. It is now a grid of
-- widgets that can be added, moved, resized and configured, and a user can
-- keep more than one arrangement ("My Studio", "Mixing week") and switch
-- between them. That arrangement has to live somewhere that follows the user
-- across devices, so it is a row here rather than browser storage.
--
-- One row per named layout. `layout` is the whole arrangement as a versioned
-- JSON document — which widgets, where on the 12-column grid, and each one's
-- settings (see src/lib/dashboard/layout.ts). It is a document rather than a
-- row per widget on purpose:
--
--   - a layout is saved and cancelled as a unit, so it is one write, with no
--     window where half of a rearrangement is stored;
--   - widget types and their settings are owned by the code and will change;
--     a document carries its own `version` and is upgraded when it is read,
--     so adding a widget or a setting never needs a migration;
--   - nothing queries inside it. Every read is "this owner's layouts".
--
-- No check constraint on the document's contents, for the same reason 0032
-- has none on resource tags and 0036 has none on category ids: the set of
-- valid widget types is the code's, and a stale type is skipped when the
-- layout is read (readLayout) instead of failing the write that carried it.
--
-- `is_default` marks the layout a bare `/` opens on. It is not a unique
-- partial index: setting a new default is "clear the old, set the new" as two
-- statements, and a unique index would make those race (the reasoning 0027
-- gives for pin_order). The reader tolerates zero or several defaults — it
-- takes the first by sort_order — so a lost race costs nothing.
--
-- A database with no rows here is a valid state, not an empty dashboard: the
-- app shows its built-in default layout until the first save creates a row.
-- So this migration backfills nothing.
--
-- Additive only. Nothing is dropped or rewritten.

create table if not exists dashboard_layouts (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null,
  name        text        not null,
  layout      jsonb       not null,
  is_default  boolean     not null default false,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists dashboard_layouts_owner_idx
  on dashboard_layouts (owner_id, sort_order, created_at);

-- Same posture as every other table since 0016: RLS on, no policies, the
-- server's service-role client bypasses it.
alter table dashboard_layouts enable row level security;
