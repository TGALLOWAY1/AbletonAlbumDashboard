/**
 * Storage buckets and object-key helpers for Library previews and artwork.
 *
 * Both are created by `supabase/migrations/0020_library_redesign.sql`, and
 * `library-migration-sync.test.ts` asserts these constants match the SQL.
 *
 * Previews live in a private bucket and are reached through signed URLs;
 * artwork lives in a public bucket so `getPublicUrl` can be embedded directly
 * with no round trip. Same split as `track-audio` / `track-images`.
 */

export const LIBRARY_PREVIEW_BUCKET = "library-previews";
export const LIBRARY_ARTWORK_BUCKET = "library-artwork";

/** How long a preview URL is signed for. The player re-signs on failure. */
export const PREVIEW_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const PREVIEW_ACCEPT = "audio/*";
export const ARTWORK_ACCEPT = "image/*";

/**
 * Object key for a newly uploaded file: `{folder}/{timestamp}-{uuid}.{ext}`,
 * matching the layout `audio-version-list.tsx` uses for track audio. The
 * random suffix means re-uploading the same filename never collides.
 */
export function libraryObjectKey(folder: string, fileName: string): string {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  const base = `${folder}/${Date.now()}-${crypto.randomUUID()}`;
  return ext ? `${base}.${ext}` : base;
}
