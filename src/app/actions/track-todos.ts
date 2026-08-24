"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { isMissingColumn, MIGRATION_0028_MISSING_MESSAGE } from "@/lib/migration-errors";
import {
  revalidateGeneralTasks,
  revalidateTrackSurfaces,
} from "@/lib/revalidate-track";

/**
 * Task-list writes for both kinds of list.
 *
 * `trackId` is nullable: a string is a task on that song, `null` is a studio
 * task that belongs to no track (migration 0028). Everything else — the
 * table, the completion timestamp, the hand-set `sort_order` from 0025, the
 * list component — is shared, because the two lists differ only in what they
 * are about. Keeping one set of actions is what stops the studio list from
 * quietly growing different ordering or completion semantics.
 *
 * Two things do differ, and both are handled by `scopeToList` /
 * `revalidateList` below: a track task is scoped and revalidated through its
 * track, a studio task through `owner_id` and the dashboard.
 */

const trackIdSchema = z.string().uuid().nullable();

/**
 * Narrow a query to exactly one list. Never `.eq("track_id", null)` — PostgREST
 * renders that as `track_id=eq.null`, which matches nothing, so a studio task
 * would silently fail to update instead of erroring.
 */
function scopeToList<T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(
  query: T,
  trackId: string | null,
): T {
  return trackId
    ? query.eq("track_id", trackId)
    : query.is("track_id", null).eq("owner_id", OWNER_ID);
}

function revalidateList(trackId: string | null) {
  if (trackId) revalidateTrackSurfaces(trackId);
  else revalidateGeneralTasks();
}

const addSchema = z.object({
  trackId: trackIdSchema,
  description: z.string().min(1).max(300),
});

export async function addTrackTodo(input: {
  trackId: string | null;
  description: string;
}) {
  const parsed = addSchema.parse(input);
  const supabase = getServerSupabase();
  const { error } = await supabase.from("actions").insert({
    track_id: parsed.trackId,
    // Track tasks reach their owner through the track. Studio tasks have no
    // track to join, so they carry it (migration 0028); writing it on both
    // keeps one row shape.
    owner_id: OWNER_ID,
    description: parsed.description,
  });
  if (error) {
    if (isMissingColumn(error)) throw new Error(MIGRATION_0028_MISSING_MESSAGE);
    throw error;
  }
  revalidateList(parsed.trackId);
}

export async function toggleTrackTodo(
  id: string,
  done: boolean,
  trackId: string | null,
) {
  const parsedTrackId = trackIdSchema.parse(trackId);
  const supabase = getServerSupabase();
  const { error } = await scopeToList(
    supabase
      .from("actions")
      .update({ completed_at: done ? new Date().toISOString() : null }),
    parsedTrackId,
  ).eq("id", id);
  if (error) throw error;
  revalidateList(parsedTrackId);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300),
  trackId: trackIdSchema,
});

export async function updateTrackTodo(
  id: string,
  description: string,
  trackId: string | null,
) {
  const parsed = updateSchema.parse({ id, description, trackId });
  const supabase = getServerSupabase();
  const { error } = await scopeToList(
    supabase.from("actions").update({ description: parsed.description }),
    parsed.trackId,
  ).eq("id", parsed.id);
  if (error) throw error;
  revalidateList(parsed.trackId);
}

export async function deleteTrackTodo(id: string, trackId: string | null) {
  const parsedTrackId = trackIdSchema.parse(trackId);
  const supabase = getServerSupabase();
  const { error } = await scopeToList(
    supabase.from("actions").delete(),
    parsedTrackId,
  ).eq("id", id);
  if (error) throw error;
  revalidateList(parsedTrackId);
}

const reorderSchema = z.object({
  trackId: trackIdSchema,
  // The full displayed order, top first. Capped well above any realistic task
  // list so a malformed payload can't fan out into thousands of writes.
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * Persist a hand-set order for a task list.
 *
 * Writes an explicit 0..n-1 across every id passed, which is what turns a list
 * from "creation order" (all `sort_order` NULL, see migration 0025) into an
 * ordered one. For a track, the top of the resulting list is its next action,
 * so this is the only way to choose what that is.
 *
 * Every update is scoped to the list as well as the id, so a task belonging to
 * another track — or to the studio list — cannot be renumbered through this
 * action.
 */
export async function reorderTrackTodos(input: {
  trackId: string | null;
  orderedIds: string[];
}) {
  const parsed = reorderSchema.parse(input);
  const supabase = getServerSupabase();

  const results = await Promise.all(
    parsed.orderedIds.map((id, index) =>
      scopeToList(
        supabase.from("actions").update({ sort_order: index }),
        parsed.trackId,
      ).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  revalidateList(parsed.trackId);
}
