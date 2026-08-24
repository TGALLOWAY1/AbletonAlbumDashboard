-- Pin up to five tracks as the current shortlist, in priority order.
--
-- WHY
-- ---
-- What the dashboard showed used to be answered by three collaborating
-- concepts: album membership (`tracks.album_id` + the one album flagged
-- `is_active`), track status (`status = 'active'`) and a hard cap of five
-- enforced in the server action. Changing "what am I working on right now"
-- therefore meant editing album membership or archiving a song — a commitment
-- to five specific tracks rather than a note about which five are on top.
--
-- Pinning replaces all of that with one reversible gesture. A pin says
-- "this is on my shortlist"; it has an order (the priority); and there is
-- room for five. Status goes back to meaning what it says — where a track is
-- in its life — and the album is back to being the record it belongs to.
--
-- WHY NOT A CONSTRAINT FOR THE CAP
-- --------------------------------
-- "At most five rows per owner" is not expressible as a unique index, and a
-- statement trigger for it would fire on the backfill below and on every
-- future bulk update. The cap lives in `setTrackPinned` (see
-- src/app/actions/tracks.ts), which is the only writer, and returns a message
-- the user can act on ("unpin one, or finish it"). `pin_order` is likewise
-- not unique: a reorder rewrites the whole list 0..n-1 in parallel, and a
-- unique index would make that race with itself.
--
-- REPLACES is_focus
-- -----------------
-- Migration 0012 added `tracks.is_focus` — pin exactly one track — with a
-- partial unique index enforcing one per owner. Nothing ever called it: the
-- dashboard never grew the control, and `toggleTrackFocus` had no caller.
-- This is the same idea with a working cap, so the old column goes.

alter table tracks add column if not exists pinned_at  timestamptz;
alter table tracks add column if not exists pin_order  integer;

-- The shortlist read: pinned rows for one owner, in priority order. Partial,
-- because unpinned tracks are the overwhelming majority and never queried
-- through it.
create index if not exists tracks_pinned_idx
  on tracks (owner_id, pin_order, pinned_at)
  where pinned_at is not null;

-- ---------------------------------------------------------------------------
-- Backfill: keep today's dashboard
-- ---------------------------------------------------------------------------
-- Pin exactly what the old dashboard showed, so the page looks the same the
-- moment this lands. That set was NOT simply "every active track": when the
-- owner had an album flagged `is_active`, the dashboard scoped to that album's
-- active tracks and fell back to all active tracks only when no active album
-- existed (see the pre-0028 src/app/page.tsx). Ranking every active track
-- across the library would quietly pin songs that were active but filed under
-- a different record — tracks the user had never seen on this page.
--
-- `albums (owner_id) where is_active` is a partial unique index (0010), so
-- "the active album" is at most one row per owner and the EXISTS/IN pair below
-- cannot fan out. A track with `album_id is null` yields NULL from the IN and
-- is therefore excluded while an active album exists — correct, since the old
-- dashboard listed those separately rather than as cards.
--
-- `pin_order` is written explicitly so the list is fully ordered from the
-- start rather than falling back to `pinned_at`.
with shortlist as (
  select t.id,
         row_number() over (
           partition by t.owner_id
           order by t.last_worked_at desc nulls last, t.created_at desc
         ) - 1 as rank
    from tracks t
   where t.status = 'active'
     and (
       not exists (
         select 1
           from albums a
          where a.owner_id = t.owner_id
            and a.is_active
       )
       or t.album_id in (
         select a.id
           from albums a
          where a.owner_id = t.owner_id
            and a.is_active
       )
     )
)
update tracks t
   set pinned_at = now(),
       pin_order = s.rank
  from shortlist s
 where s.id = t.id
   and s.rank < 5
   and t.pinned_at is null;

-- ---------------------------------------------------------------------------
-- tracks.is_focus (migration 0012)
-- ---------------------------------------------------------------------------
-- The index is defined over the column, so it goes first.
drop index if exists tracks_one_focus_per_owner;
alter table tracks drop column if exists is_focus;
