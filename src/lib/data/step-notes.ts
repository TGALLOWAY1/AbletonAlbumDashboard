import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/migration-errors";
import { logSupabaseError } from "@/lib/supabase/log-error";
import {
  STEP_NOTE_IMAGE_BUCKET,
  stepNoteFromRow,
  type StepNote,
  type StepNoteRow,
} from "@/lib/step-notes";
import type { FinishingStepKey } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every note on one checklist row, newest first — the page puts "Add note"
 * at the top, so the note you just wrote lands right under it.
 *
 * Reads degrade (CLAUDE.md): a database without migration 0034 has no notes
 * table, and that reads as an empty list with a warning naming the file, not
 * a dead page. A malformed variation id cannot match a row (and Postgres
 * would reject it as a uuid), so it is simply no notes.
 */
export async function getStepNotes(
  trackId: string,
  stepKey: FinishingStepKey,
  variationId: string | null,
): Promise<StepNote[]> {
  if (variationId !== null && !UUID_RE.test(variationId)) return [];

  const supabase = getServerSupabase();
  let query = supabase
    .from("track_step_notes")
    .select("*")
    .eq("track_id", trackId)
    .eq("step_key", stepKey)
    .order("created_at", { ascending: false });
  // `.is` for the null case — `.eq("variation_id", null)` renders as
  // `variation_id=eq.null` and matches nothing (see `scopeToList` in
  // src/app/actions/track-todos.ts).
  query =
    variationId === null
      ? query.is("variation_id", null)
      : query.eq("variation_id", variationId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      console.warn(
        "[step-notes] could not load notes — apply supabase/migrations/" +
          "0034_track_step_notes.sql to enable finishing-step notes: " +
          error.message,
      );
      return [];
    }
    throw error;
  }

  const notes: StepNote[] = [];
  for (const row of (data ?? []) as StepNoteRow[]) {
    const imageUrl = row.image_path
      ? supabase.storage
          .from(STEP_NOTE_IMAGE_BUCKET)
          .getPublicUrl(row.image_path).data.publicUrl
      : null;
    const note = stepNoteFromRow(row, imageUrl);
    if (note) notes.push(note);
  }
  return notes;
}

type ServerSupabase = ReturnType<typeof getServerSupabase>;

/** Which notes' images to sweep: every note on a track, or one variation's. */
export type StepNoteImageScope = { trackId: string } | { variationId: string };

/**
 * Object keys of every image note in `scope`, for the parent-deletion path.
 *
 * `deleteStepNote` removes a note's file itself, but a track or a variation
 * is deleted as a parent row and its notes go with it by cascade — the
 * database never tells storage. So the deleting action lists the keys first,
 * deletes the parent, then removes the objects (`removeStepNoteImages`), in
 * that order: a delete that fails after the sweep would leave notes pointing
 * at files that no longer exist, while a sweep that fails after the delete
 * leaves only orphans in a public bucket.
 *
 * Never throws. A database without 0034 has no notes to sweep, and any other
 * failure here must not block deleting the track — it is logged and the
 * files are left behind, which is the state every pre-0034 delete left them
 * in anyway.
 */
export async function listStepNoteImagePaths(
  supabase: ServerSupabase,
  scope: StepNoteImageScope,
): Promise<string[]> {
  const base = supabase
    .from("track_step_notes")
    .select("image_path")
    .not("image_path", "is", null);
  const { data, error } =
    "variationId" in scope
      ? await base.eq("variation_id", scope.variationId)
      : await base.eq("track_id", scope.trackId);
  if (error) {
    if (!isMissingTable(error)) {
      logSupabaseError("listStepNoteImagePaths", error);
    }
    return [];
  }
  return (data ?? [])
    .map((row) => row.image_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

/** Best-effort removal of note images by key; a failure is logged, not thrown. */
export async function removeStepNoteImages(
  supabase: ServerSupabase,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(STEP_NOTE_IMAGE_BUCKET)
    .remove(paths);
  if (error) logSupabaseError("removeStepNoteImages", error);
}
