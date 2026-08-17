-- Finish Five: Library redesign.
--
-- The Library stops being a generic inventory of "items" (drums / instruments /
-- FX racks in a flat `instruments` table) and becomes a sound reuse and
-- auditioning surface built on three concepts:
--
--   library_loop_stacks       a reusable musical section captured from a project
--   library_presets           a saved instrument/sound worth using again
--   library_collections       a curated group that can hold both of the above
--   library_collection_items  reference rows joining assets into collections
--
-- Collections reference assets rather than copying them, so an asset lives in
-- exactly one place and can appear in many collections. The two nullable FKs
-- (loop_stack_id / preset_id) with an XOR check are deliberate: real foreign
-- keys give us `on delete cascade`, so deleting an asset cleans up every
-- collection reference to it in the database rather than in application code
-- that can be forgotten. A polymorphic (item_type, item_id) pair could not.
--
-- LEGACY DATA: the old `instruments` table is dropped at the end of this
-- migration without a backfill (explicit product decision). For the record, it
-- held exactly one row at the time of writing:
--
--   name 'SO_FT_keys_piano', category 'instruments_presets',
--   source 'Instrument Rack', notes 'Serum 2 preset'
--
-- Re-add it by hand as a preset (plugin 'Instrument Rack', category 'Keys') if
-- it turns out to be wanted.

-- ---------------------------------------------------------------------------
-- library_loop_stacks
-- ---------------------------------------------------------------------------
create table if not exists library_loop_stacks (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null,
  name           text not null,
  -- Object key in the private `library-previews` bucket. Signed on read.
  preview_path   text,
  -- Public URL in the `library-artwork` bucket. Null renders a generated
  -- waveform placeholder instead.
  artwork_url    text,
  -- Musical key as free text ("C minor", "F# maj"). Not `key`, which reads
  -- badly next to Postgres' own key/index vocabulary.
  music_key      text,
  bpm            numeric,
  bars           integer,
  source_project text,
  source_path    text,
  favorite       boolean not null default false,
  notes          text not null default '',
  -- Reserved for deeper Ableton integration: the constituent tracks, stems,
  -- MIDI clips, devices and plugin dependencies that make up this stack. Kept
  -- inside the loop stack on purpose — this must never become a separate
  -- top-level Library category.
  components     jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists library_loop_stacks_owner_created_idx
  on library_loop_stacks (owner_id, created_at desc);

drop trigger if exists library_loop_stacks_set_updated_at on library_loop_stacks;
create trigger library_loop_stacks_set_updated_at
  before update on library_loop_stacks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- library_presets
-- ---------------------------------------------------------------------------
create table if not exists library_presets (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null,
  name           text not null,
  -- The instrument/plugin that loads it ("Serum 2", "Phase Plant", "Ableton").
  plugin         text,
  category       text not null default 'Other',
  preview_path   text,
  artwork_url    text,
  -- Path or reference to the preset file on disk.
  preset_path    text,
  source_project text,
  favorite       boolean not null default false,
  -- "Core" marks the go-to sounds reached for first.
  core           boolean not null default false,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint library_presets_category_check check (
    category in (
      'Bass', 'Chords', 'Keys', 'Lead', 'Pad',
      'Drums', 'Texture', 'FX', 'Other'
    )
  )
);

create index if not exists library_presets_owner_created_idx
  on library_presets (owner_id, created_at desc);

create index if not exists library_presets_owner_category_idx
  on library_presets (owner_id, category);

drop trigger if exists library_presets_set_updated_at on library_presets;
create trigger library_presets_set_updated_at
  before update on library_presets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- library_collections
-- ---------------------------------------------------------------------------
create table if not exists library_collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  name        text not null,
  description text,
  artwork_url text,
  -- Manual ordering of the collections shelf itself.
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists library_collections_owner_position_idx
  on library_collections (owner_id, position, created_at desc);

drop trigger if exists library_collections_set_updated_at on library_collections;
create trigger library_collections_set_updated_at
  before update on library_collections
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- library_collection_items
--
-- Exactly one of loop_stack_id / preset_id is set. Both cascade, so deleting
-- an asset removes its references here and no collection is ever left holding
-- a dangling pointer.
-- ---------------------------------------------------------------------------
create table if not exists library_collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null
                references library_collections(id) on delete cascade,
  loop_stack_id uuid references library_loop_stacks(id) on delete cascade,
  preset_id     uuid references library_presets(id)     on delete cascade,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint library_collection_items_one_asset check (
    (loop_stack_id is not null and preset_id is null)
    or
    (loop_stack_id is null and preset_id is not null)
  )
);

create index if not exists library_collection_items_collection_position_idx
  on library_collection_items (collection_id, position);

-- An asset can only appear once per collection.
create unique index if not exists library_collection_items_stack_uniq
  on library_collection_items (collection_id, loop_stack_id)
  where loop_stack_id is not null;

create unique index if not exists library_collection_items_preset_uniq
  on library_collection_items (collection_id, preset_id)
  where preset_id is not null;

-- ---------------------------------------------------------------------------
-- RLS: enabled with no policies, matching 0016_enable_rls.sql. The anon and
-- authenticated roles are denied outright; the server client uses the
-- service_role key and bypasses RLS.
-- ---------------------------------------------------------------------------
alter table library_loop_stacks       enable row level security;
alter table library_presets           enable row level security;
alter table library_collections       enable row level security;
alter table library_collection_items  enable row level security;

-- ---------------------------------------------------------------------------
-- Storage: previews and artwork get their own buckets rather than sharing
-- track-audio / track-images, whose object keys are namespaced by track id.
--
-- Previews are short audition clips, not full bounces, hence the smaller size
-- limit than track-audio's 500MB.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library-previews',
  'library-previews',
  false,
  52428800, -- 50MB
  array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/flac','audio/aac','audio/ogg','audio/webm']
)
on conflict (id) do nothing;

drop policy if exists "anon read library-previews" on storage.objects;
create policy "anon read library-previews"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'library-previews');

drop policy if exists "anon insert library-previews" on storage.objects;
create policy "anon insert library-previews"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'library-previews');

drop policy if exists "anon update library-previews" on storage.objects;
create policy "anon update library-previews"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'library-previews')
  with check (bucket_id = 'library-previews');

drop policy if exists "anon delete library-previews" on storage.objects;
create policy "anon delete library-previews"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'library-previews');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library-artwork',
  'library-artwork',
  true,
  10485760, -- 10MB
  array['image/png','image/jpeg','image/webp','image/gif','image/avif']
)
on conflict (id) do nothing;

drop policy if exists "anon read library-artwork" on storage.objects;
create policy "anon read library-artwork"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'library-artwork');

drop policy if exists "anon insert library-artwork" on storage.objects;
create policy "anon insert library-artwork"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'library-artwork');

drop policy if exists "anon update library-artwork" on storage.objects;
create policy "anon update library-artwork"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'library-artwork')
  with check (bucket_id = 'library-artwork');

drop policy if exists "anon delete library-artwork" on storage.objects;
create policy "anon delete library-artwork"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'library-artwork');

-- ---------------------------------------------------------------------------
-- Drop the old Library table. See the LEGACY DATA note at the top of this file
-- for the single row this discards.
-- ---------------------------------------------------------------------------
drop table if exists instruments;
