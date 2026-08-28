-- Widen the audio buckets' accepted content types.
--
-- The picker fix in src/lib/audio-upload.ts offers AIFF and M4A (an iPhone
-- voice memo is .m4a, and Ableton exports .aif), and normalises what iOS
-- reports so an empty File.type can no longer reach Storage as "". Storage
-- validates the declared content type against allowed_mime_types, so the
-- bucket has to accept the canonical types the app now sends:
--
--   audio/aiff  — .aif / .aiff / .aifc
--   audio/mp4   — .m4a (iOS reports audio/x-m4a; the app canonicalises it)
--
-- The legacy spellings from 0002 are kept in the list, not replaced: a build
-- deployed before this migration still uploads File.type verbatim, and those
-- uploads must keep working through the window between deploy and push.
--
-- No data loss: widening an allowlist only. Existing objects are untouched.

update storage.buckets
   set allowed_mime_types = array[
     'audio/mpeg', 'audio/mp3', 'audio/x-mp3', 'audio/mpeg3',
     'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
     'audio/aiff', 'audio/x-aiff',
     'audio/mp4', 'audio/m4a', 'audio/x-m4a',
     'audio/aac',
     'audio/flac', 'audio/x-flac',
     'audio/ogg', 'audio/opus',
     'audio/webm'
   ]
 where id in ('track-audio', 'library-previews');
