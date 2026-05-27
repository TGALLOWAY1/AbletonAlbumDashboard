-- Finish Five: samples review state.
-- The Samples page reads audio files directly from the user's filesystem via the
-- browser File System Access API. This table only persists *touched* samples
-- (reviewed or favorited) so it stays small even with 10k+ files on disk; any
-- sample not present here is implicitly "not_reviewed".
--
-- Files are never moved/renamed at the source. "added_to_favorites" means a copy
-- was written into the user's Favorites folder; original_path traces it back.

create table samples (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null,
  -- deterministic id: `${sourceRootName}:${relativePath}`
  sample_key         text not null,
  -- relative path including the source root display name (browsers don't expose
  -- absolute OS paths)
  original_path      text not null,
  original_file_name text not null,
  review_status      text not null default 'reviewed_not_added'
    check (review_status in ('not_reviewed', 'reviewed_not_added', 'added_to_favorites')),
  -- relative path within the Favorites root where the copy landed; null until favorited
  favorite_dest      text,
  favorited_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index samples_owner_key_idx on samples (owner_id, sample_key);

create trigger samples_set_updated_at
  before update on samples
  for each row execute function set_updated_at();
