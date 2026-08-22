/**
 * Deploys land before migrations in this repo (Vercel deploys on merge; SQL is
 * applied by hand), so a shipped feature can meet a database that does not have
 * its column yet. Reads must degrade — see `fetchTrackAlbums` in
 * src/lib/data/tracks.ts, where a missing `genre` must not cost a track its
 * album. Writes can't, but they can at least say what to do about it instead of
 * surfacing a raw PostgREST error.
 */

/** PostgREST reports an unknown column as 42703; PGRST204 on some write paths. */
export function isMissingColumn(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42703" || code === "PGRST204";
}

export const MIGRATION_0021_MISSING_MESSAGE =
  "This needs supabase/migrations/0021_album_genre_track_suno.sql applied to " +
  "your Supabase project. Run it, then try again.";
