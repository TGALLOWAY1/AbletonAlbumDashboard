-- Finish Five: bump the per-file size limit on the track-audio bucket so
-- uncompressed wav bounces of typical track lengths (>100MB) can be uploaded.

update storage.buckets
set file_size_limit = 524288000  -- 500MB
where id = 'track-audio';
