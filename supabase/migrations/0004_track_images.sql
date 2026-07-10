-- Finish Five: cover image storage + album metadata.
-- Public bucket so cover URLs can be embedded directly without signing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'track-images',
  'track-images',
  true,
  10485760, -- 10MB
  array['image/png','image/jpeg','image/webp','image/gif','image/avif']
)
on conflict (id) do nothing;

drop policy if exists "anon read track-images" on storage.objects;
create policy "anon read track-images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'track-images');

drop policy if exists "anon insert track-images" on storage.objects;
create policy "anon insert track-images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'track-images');

drop policy if exists "anon update track-images" on storage.objects;
create policy "anon update track-images"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'track-images')
  with check (bucket_id = 'track-images');

drop policy if exists "anon delete track-images" on storage.objects;
create policy "anon delete track-images"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'track-images');

-- ---------------------------------------------------------------------------
-- album_settings: one row per owner. Holds the album-level cover image
-- (and optional title) shown on the dashboard.
-- ---------------------------------------------------------------------------
create table if not exists album_settings (
  owner_id        uuid primary key,
  title           text,
  cover_image_url text,
  updated_at      timestamptz not null default now()
);

drop trigger if exists album_settings_set_updated_at on album_settings;
create trigger album_settings_set_updated_at
  before update on album_settings
  for each row execute function set_updated_at();
