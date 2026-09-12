import { getServerSupabase } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/migration-errors";
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
