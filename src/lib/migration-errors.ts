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

/**
 * A check constraint that is narrower than the shipped code — Postgres 23514.
 * Same root cause as a missing column, but a different symptom: the column
 * exists, so the write is well-formed right up until the row is validated.
 * Worth its own branch because the raw error is redacted by Next in production
 * builds, leaving the user with "An error occurred in the Server Components
 * render" and nothing to act on.
 */
export function isCheckViolation(error: unknown, constraint?: string): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code !== "23514") return false;
  return constraint ? (e.message ?? "").includes(constraint) : true;
}

export const MIGRATION_0021_MISSING_MESSAGE =
  "This needs supabase/migrations/0021_album_genre_track_suno.sql applied to " +
  "your Supabase project. Run it, then try again.";

export const MIGRATION_0022_MISSING_MESSAGE =
  "This needs supabase/migrations/0022_suno_status_error.sql applied to your " +
  "Supabase project — the database still only accepts the old two Suno " +
  "states. Run it, then try again.";
