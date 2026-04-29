-- Finish Five: storage bucket for audio versions
-- Private bucket; access through signed URLs only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'track-audio',
  'track-audio',
  false,
  104857600, -- 100MB
  array['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/flac','audio/aac','audio/ogg','audio/webm']
)
on conflict (id) do nothing;
