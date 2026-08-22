-- Genre moves up to the album, and tracks gain a standalone Suno status.
--
-- 1. albums.genre — a record has one genre; the per-track "genre" was only
--    ever `tags[1]` rendered as a badge, which made every card in an album
--    repeat (or contradict) the same word. Tags stay on tracks as free-form
--    descriptors; they just stop standing in for the genre.
-- 2. tracks.suno_status — a plain todo/done marker for "have I taken this
--    track through Suno yet?", independent of the suno_experiments round-trip
--    (0019), which models one bounded experiment rather than the standing
--    question. Toggled straight from a track card.

-- ---------------------------------------------------------------------------
-- albums.genre
-- ---------------------------------------------------------------------------
alter table albums add column if not exists genre text;

-- Backfill: adopt the most common first tag across the album's tracks, so the
-- genre badges the user already sees survive the move. Ties break
-- alphabetically to keep the migration deterministic.
with ranked as (
  select distinct on (t.album_id)
         t.album_id,
         btrim(t.tags[1]) as genre
    from tracks t
   where t.album_id is not null
     and coalesce(btrim(t.tags[1]), '') <> ''
   group by t.album_id, btrim(t.tags[1])
   order by t.album_id, count(*) desc, btrim(t.tags[1])
)
update albums a
   set genre = ranked.genre
  from ranked
 where a.id = ranked.album_id
   and a.genre is null;

-- ---------------------------------------------------------------------------
-- tracks.suno_status
-- ---------------------------------------------------------------------------
alter table tracks
  add column if not exists suno_status text not null default 'todo';

alter table tracks drop constraint if exists tracks_suno_status_check;
alter table tracks add constraint tracks_suno_status_check
  check (suno_status in ('todo', 'done'));

-- A track whose Suno round-trip already landed is done by definition. Guarded
-- because 0019 is applied by hand and may not have run on every project yet.
do $$
begin
  if exists (
    select from pg_tables
     where schemaname = 'public'
       and tablename  = 'suno_experiments'
  ) then
    execute $sql$
      update tracks t
         set suno_status = 'done'
       where t.suno_status = 'todo'
         and exists (
           select 1
             from suno_experiments e
            where e.track_id = t.id
              and e.status = 'integrated'
         )
    $sql$;
  end if;
end $$;
