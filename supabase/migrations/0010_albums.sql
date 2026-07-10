-- Finish Five: group tracks into albums.
-- One album is "active" (the current focus) and shown at the top of the
-- dashboard with its tracks. The remaining albums show as an upcoming gallery.
--
-- album_settings (single-row per owner) is replaced by albums (many per owner).
-- Existing album_settings data is migrated into a single is_active album
-- before the legacy table is dropped.

create table if not exists albums (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
  title           text,
  cover_image_url text,
  start_date      date,
  sort_order      integer not null default 0,
  is_active       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists albums_owner_sort_idx on albums (owner_id, sort_order);
create unique index if not exists albums_one_active_per_owner
  on albums (owner_id) where is_active;

drop trigger if exists albums_set_updated_at on albums;
create trigger albums_set_updated_at
  before update on albums
  for each row execute function set_updated_at();

alter table tracks
  add column if not exists album_id uuid references albums(id) on delete set null;
create index if not exists tracks_album_idx on tracks (album_id);

-- Migrate any existing album_settings row into a real album, then attach
-- every currently-active track to it so the dashboard stays populated.
do $$
declare
  legacy record;
  new_album_id uuid;
begin
  if exists (
    select from pg_tables 
    where schemaname = 'public' 
      and tablename  = 'album_settings'
  ) then
    for legacy in execute 'select * from album_settings' loop
      insert into albums (owner_id, title, cover_image_url, sort_order, is_active)
      values (legacy.owner_id, legacy.title, legacy.cover_image_url, 0, true)
      returning id into new_album_id;

      update tracks
         set album_id = new_album_id
       where owner_id = legacy.owner_id
         and album_id is null
         and status in ('active', 'backlog');
    end loop;
    
    execute 'drop table album_settings';
  end if;
end $$;
