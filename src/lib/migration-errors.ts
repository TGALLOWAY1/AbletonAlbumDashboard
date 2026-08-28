/**
 * Deploys land before migrations in this repo, so a shipped build can meet a
 * database that does not have its column yet.
 *
 * Vercel deploys on merge; migrations are applied separately with the Supabase
 * CLI (`supabase db push`) — not pasted into the dashboard by hand, which is
 * how this project ran until the history drifted out of step with the repo.
 * See the Database section of README.md. Automating the push on merge is the
 * goal and would shrink this window, but it cannot close it: the deploy and
 * the migration are still two steps.
 *
 * So reads must degrade — see `fetchTrackAlbums` in src/lib/data/tracks.ts,
 * where a missing `genre` must not cost a track its album, or
 * `fetchTaskCompletions` in src/lib/data/analytics.ts, where a missing
 * `owner_id` must not turn a real history of completed tasks into a confident
 * zero. Writes can't degrade, but they can at least say what to run instead of
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

/** PostgREST reports an unknown *table* as 42P01; PGRST205 from its schema cache. */
export function isMissingTable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "PGRST205";
}

export const MIGRATION_0023_MISSING_MESSAGE =
  "This needs supabase/migrations/0023_track_finishing_steps.sql applied to " +
  "your Supabase project — the finishing checklist has nowhere to save yet. " +
  "Run it, then try again.";

/**
 * 0011 created the resources category check inline, so Postgres auto-named it
 * `resources_category_id_check`; 0026 re-adds it under the same name. Either
 * way this is the constraint a too-narrow category list violates.
 */
export const RESOURCES_CATEGORY_CONSTRAINT = "resources_category_id_check";

export const MIGRATION_0026_MISSING_MESSAGE =
  "This needs supabase/migrations/0026_resources_live_performance.sql applied " +
  "to your Supabase project — the database still only accepts the original " +
  "six resource categories. Run it, then try again.";

export const MIGRATION_0027_MISSING_MESSAGE =
  "This needs supabase/migrations/0027_track_pins.sql applied to your " +
  "Supabase project — tracks have nowhere to record a pin yet. Run it, then " +
  "try again.";

export const MIGRATION_0028_MISSING_MESSAGE =
  "This needs supabase/migrations/0028_general_tasks.sql applied to your " +
  "Supabase project — every task still has to belong to a track. Run it, " +
  "then try again.";

export const MIGRATION_0029_MISSING_MESSAGE =
  "This needs supabase/migrations/0029_audio_upload_mime_types.sql applied to " +
  "your Supabase project — the storage bucket still rejects this audio " +
  "format. Run it, then try again.";

/**
 * Storage rejections, which are HTTP errors from the Storage API rather than
 * PostgREST rows: no `code`, a `statusCode` string, and a message written for
 * an API client. A disallowed content type is what a bucket whose
 * `allowed_mime_types` predates 0029 returns for an AIFF or an M4A.
 */
function storageErrorText(error: unknown): string {
  const e = error as { message?: string; error?: string } | null;
  return `${e?.error ?? ""} ${e?.message ?? ""}`.toLowerCase();
}

export function isStorageMimeRejection(error: unknown): boolean {
  const text = storageErrorText(error);
  return text.includes("mime type") || text.includes("invalid_mime_type");
}

export function isStorageSizeRejection(error: unknown): boolean {
  const text = storageErrorText(error);
  return (
    text.includes("exceeded the maximum allowed size") ||
    text.includes("payload too large") ||
    text.includes("entity_too_large")
  );
}
