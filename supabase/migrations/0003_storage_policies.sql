-- Finish Five V1: permissive storage policies for the single-user app.
-- The bucket itself is private (no public list), but the anon role can
-- read/write via the API. When real auth is added, replace these with
-- (auth.uid() = owner_id) policies.

drop policy if exists "anon read track-audio" on storage.objects;
create policy "anon read track-audio"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'track-audio');

drop policy if exists "anon insert track-audio" on storage.objects;
create policy "anon insert track-audio"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'track-audio');

drop policy if exists "anon update track-audio" on storage.objects;
create policy "anon update track-audio"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'track-audio')
  with check (bucket_id = 'track-audio');

drop policy if exists "anon delete track-audio" on storage.objects;
create policy "anon delete track-audio"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'track-audio');
