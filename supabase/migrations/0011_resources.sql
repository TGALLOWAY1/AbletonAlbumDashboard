-- Finish Five: resources library.
-- Stores user-curated learning materials: PDFs, markdown notes, and external
-- URLs (YouTube, articles, etc.). PDFs land in a public bucket so the embedded
-- viewer can stream them without signing.

-- ---------------------------------------------------------------------------
-- resources table
-- ---------------------------------------------------------------------------
create table resources (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null,
  title         text not null,
  description   text not null default '',
  -- visual badge category shown next to the title
  type          text not null check (type in ('guide','tutorial','article','video','mindset')),
  -- which of the built-in category tiles this belongs to
  category_id   text not null check (category_id in (
    'production-guides',
    'sound-design',
    'mixing-mastering',
    'workflow-mindset',
    'tools-plugins',
    'file-organization'
  )),
  -- how the content is stored: pdf upload, inline markdown, or external link
  source_kind   text not null check (source_kind in ('pdf','markdown','url')),
  -- pdf source: object key in the resource-files bucket
  storage_path  text,
  -- markdown source: raw markdown body
  content       text,
  -- url source: external link
  url           text,
  -- thumbnail to show in cards (auto-derived for YouTube; user-set otherwise)
  thumbnail_url text,
  read_minutes  integer not null default 5 check (read_minutes >= 0),
  bookmarked    boolean not null default false,
  featured      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- enforce that the source field for the chosen kind is populated
  check (
    (source_kind = 'pdf'      and storage_path is not null) or
    (source_kind = 'markdown' and content      is not null) or
    (source_kind = 'url'      and url          is not null)
  )
);

create index resources_owner_created_idx
  on resources (owner_id, created_at desc);
create index resources_owner_featured_idx
  on resources (owner_id, featured) where featured;
create index resources_owner_category_idx
  on resources (owner_id, category_id);

create trigger resources_set_updated_at
  before update on resources
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- resource-files: public bucket for uploaded PDFs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resource-files',
  'resource-files',
  true,
  52428800, -- 50MB
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "anon read resource-files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'resource-files');

create policy "anon insert resource-files"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'resource-files');

create policy "anon update resource-files"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'resource-files')
  with check (bucket_id = 'resource-files');

create policy "anon delete resource-files"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'resource-files');
