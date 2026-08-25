-- Persist the manual priority order used on the Tracks page.
alter table tracks
  add column if not exists sort_order integer not null default 0;

-- Keep the listing deterministic for existing tracks. New tracks retain the
-- default of 0, which puts them at the top until the next manual reorder.
with ranked_tracks as (
  select
    id,
    row_number() over (
      partition by owner_id
      order by created_at desc, id
    )::integer - 1 as position
  from tracks
)
update tracks
set sort_order = ranked_tracks.position
from ranked_tracks
where tracks.id = ranked_tracks.id;

create index if not exists tracks_owner_sort_idx
  on tracks (owner_id, sort_order, created_at desc);
