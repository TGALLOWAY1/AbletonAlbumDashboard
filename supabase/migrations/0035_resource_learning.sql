-- Finish Five: resources grow a rating, an archive, and a pin.
--
-- WHY
-- ---
-- The Resources section could say what a resource *is* (category, type, tags)
-- but nothing about what the user had done with it. Three columns close that:
--
--   rating       1-5 stars. How much the material was worth, in the user's
--                own judgement. Nullable: unrated is a real state, not a zero.
--   archived_at  When the user marked it learned — read, understood, applied.
--                Archiving is the only "learning" event there is, so this
--                timestamp *is* the learning log: the counter on /resources is
--                `count(archived_at is not null)` and the activity map shades
--                each day by how many landed on it. Nothing increments a
--                stored tally, because a stored tally cannot be un-learned
--                and this can (clear the column and both numbers fall).
--   pinned_at    On the poster shelf at the top of /resources. Ordered by the
--                timestamp itself — first pinned leads — so there is no
--                pin_order to keep in step, unlike tracks (0027) where the
--                shortlist is a hand-dragged priority list.
--
-- All three are nullable with no default, so every existing row reads as
-- unrated, un-archived and unpinned with no backfill.
--
-- WHY NO CONSTRAINT FOR THE PIN CAP
-- ---------------------------------
-- Same reasoning as 0027: "at most N rows per owner" is not a unique index,
-- and a statement trigger would fire on every bulk update. The cap lives in
-- `setResourcePinned` (src/app/actions/resources.ts), the only writer.
--
-- The rating check IS named explicitly (0026 learned this the hard way): an
-- auto-named constraint is indistinguishable from any other violation, so the
-- app could not tell the user which file to run.

alter table resources
  add column if not exists rating smallint;

alter table resources
  drop constraint if exists resources_rating_check;

alter table resources
  add constraint resources_rating_check
  check (rating is null or rating in (1, 2, 3, 4, 5));

alter table resources
  add column if not exists archived_at timestamptz;

alter table resources
  add column if not exists pinned_at timestamptz;

-- The learning log read: archived rows for one owner, newest first. Partial,
-- because most of the library is not archived and is never queried through it.
create index if not exists resources_owner_archived_idx
  on resources (owner_id, archived_at desc)
  where archived_at is not null;

-- The poster shelf read: pinned rows for one owner, in pin order.
create index if not exists resources_owner_pinned_idx
  on resources (owner_id, pinned_at)
  where pinned_at is not null;
