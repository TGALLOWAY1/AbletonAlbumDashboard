"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import {
  isMissingTable,
  MIGRATION_0034_MISSING_MESSAGE,
} from "@/lib/migration-errors";
import { logSupabaseError } from "@/lib/supabase/log-error";
import {
  addStepNoteSchema,
  STEP_NOTE_IMAGE_BUCKET,
  stepNotesHref,
  updateStepNoteSchema,
  type AddStepNoteInput,
  type UpdateStepNoteInput,
} from "@/lib/step-notes";
import type { FinishingStepKey } from "@/lib/types";

/**
 * Notes on a finishing step (migration 0034). Same contract as the checklist
 * actions beside these: failures are *returned*, never thrown, because a
 * production build replaces a thrown message with the generic render error
 * and the "apply 0034" hint would never reach the person who can act on it.
 *
 * Every write refreshes the track surfaces (the checklist rows print a note
 * count) and the notes page itself, which `revalidateTrackSurfaces` does not
 * know about.
 */
function revalidateStepNotes(trackId: string, stepKey: FinishingStepKey) {
  revalidateTrackSurfaces(trackId);
  revalidatePath(stepNotesHref(trackId, stepKey));
}

export async function addStepNote(
  input: AddStepNoteInput,
): Promise<{ error?: string }> {
  const parsed = addStepNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That note isn't valid." };
  }
  const note = parsed.data;
  const supabase = getServerSupabase();

  // A note on a variation's checklist has to be on one of *this* track's
  // variations; the id comes from the URL, so check rather than trust it.
  if (note.variationId) {
    const { data: variation, error } = await supabase
      .from("track_variations")
      .select("id")
      .eq("id", note.variationId)
      .eq("track_id", note.trackId)
      .maybeSingle();
    if (error) {
      logSupabaseError("addStepNote.variation", error);
      return { error: "Could not save that note. Try again." };
    }
    if (!variation) return { error: "That variation no longer exists." };
  }

  const { error } = await supabase.from("track_step_notes").insert({
    track_id: note.trackId,
    variation_id: note.variationId,
    step_key: note.stepKey,
    kind: note.kind,
    title: note.title,
    content: note.kind === "markdown" ? note.content : null,
    image_path: note.kind === "image" ? note.imagePath : null,
    image_width: note.kind === "image" ? note.imageWidth : null,
    image_height: note.kind === "image" ? note.imageHeight : null,
  });
  if (error) {
    if (isMissingTable(error)) return { error: MIGRATION_0034_MISSING_MESSAGE };
    logSupabaseError("addStepNote", error);
    return { error: "Could not save that note. Try again." };
  }

  revalidateStepNotes(note.trackId, note.stepKey);
  return {};
}

/**
 * Edit a note's title and, on a markdown note, its body. An image note's body
 * is its file: replacing it is an upload, not a text edit, so it is deleted
 * and added again rather than patched.
 */
export async function updateStepNote(
  input: UpdateStepNoteInput,
): Promise<{ error?: string }> {
  const parsed = updateStepNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That note isn't valid." };
  }
  const { noteId, trackId, title, content } = parsed.data;
  const supabase = getServerSupabase();

  const { data: existing, error: readError } = await supabase
    .from("track_step_notes")
    .select("kind, step_key")
    .eq("id", noteId)
    .eq("track_id", trackId)
    .maybeSingle();
  if (readError) {
    if (isMissingTable(readError)) return { error: MIGRATION_0034_MISSING_MESSAGE };
    logSupabaseError("updateStepNote.read", readError);
    return { error: "Could not save that note. Try again." };
  }
  if (!existing) return { error: "Note not found." };

  const patch: { title: string; content?: string } = { title };
  if (existing.kind === "markdown") {
    if (!content) return { error: "Write something before saving." };
    patch.content = content;
  }

  const { error } = await supabase
    .from("track_step_notes")
    .update(patch)
    .eq("id", noteId)
    .eq("track_id", trackId);
  if (error) {
    logSupabaseError("updateStepNote", error);
    return { error: "Could not save that note. Try again." };
  }

  revalidateStepNotes(trackId, existing.step_key as FinishingStepKey);
  return {};
}

/**
 * Delete a note and, for an image note, the file behind it. The caller
 * confirms with the user first.
 */
export async function deleteStepNote(
  noteId: string,
  trackId: string,
): Promise<{ error?: string }> {
  const supabase = getServerSupabase();
  const { data: existing, error: readError } = await supabase
    .from("track_step_notes")
    .select("image_path, step_key")
    .eq("id", noteId)
    .eq("track_id", trackId)
    .maybeSingle();
  if (readError) {
    if (isMissingTable(readError)) return { error: MIGRATION_0034_MISSING_MESSAGE };
    logSupabaseError("deleteStepNote.read", readError);
    return { error: "Could not delete that note. Try again." };
  }
  if (!existing) return { error: "Note not found." };

  const { error } = await supabase
    .from("track_step_notes")
    .delete()
    .eq("id", noteId)
    .eq("track_id", trackId);
  if (error) {
    logSupabaseError("deleteStepNote", error);
    return { error: "Could not delete that note. Try again." };
  }

  // The row is gone either way; a file that fails to delete is an orphan in
  // a public bucket, not a note the user can still see.
  if (existing.image_path) {
    const { error: removeError } = await supabase.storage
      .from(STEP_NOTE_IMAGE_BUCKET)
      .remove([existing.image_path]);
    if (removeError) logSupabaseError("deleteStepNote.storage", removeError);
  }

  revalidateStepNotes(trackId, existing.step_key as FinishingStepKey);
  return {};
}
