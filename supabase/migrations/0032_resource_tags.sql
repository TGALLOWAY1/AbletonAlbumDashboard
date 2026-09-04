-- resources.tags: free-form instrument/role words on a resource, so Sound
-- Design (and every other category) can be grouped by what the material is
-- actually about — bass, drums, pads, FX — without inventing a category per
-- instrument. Categories stay the seven-item constrained list; tags are the
-- cross-cutting axis.
--
-- Deliberately NO check constraint on the values. The whole point is that
-- adding a word is a thing the user does in the Add/Edit dialog, not a thing
-- that needs a migration. src/lib/resource-tags.ts normalises what is written
-- (trimmed, lowercased, deduped, length-capped) and offers a suggested
-- vocabulary; anything outside it is still a valid tag.
--
-- `not null default '{}'` so every existing row reads as untagged with no
-- backfill, and reads never have to cope with a null array.
--
-- The GIN index is what makes a future server-side `tags @> array[...]` filter
-- cheap. Today's filtering is done in the client after the owner's rows are
-- fetched (the library is small), so the index is ahead of its use on purpose:
-- adding it later would mean another migration for a one-line change.

alter table resources
  add column if not exists tags text[] not null default '{}';

create index if not exists resources_tags_idx
  on resources using gin (tags);
