"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";

const addSchema = z.object({
  trackId: z.string().uuid(),
  description: z.string().min(1).max(300),
});

export async function addTrackTodo(input: {
  trackId: string;
  description: string;
}) {
  const parsed = addSchema.parse(input);
  const supabase = getServerSupabase();
  const { error } = await supabase.from("actions").insert({
    track_id: parsed.trackId,
    description: parsed.description,
  });
  if (error) throw error;
  revalidateTrackSurfaces(parsed.trackId);
}

export async function toggleTrackTodo(
  id: string,
  done: boolean,
  trackId: string,
) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("actions")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300),
  trackId: z.string().uuid(),
});

export async function updateTrackTodo(
  id: string,
  description: string,
  trackId: string,
) {
  const parsed = updateSchema.parse({ id, description, trackId });
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("actions")
    .update({ description: parsed.description })
    .eq("id", parsed.id);
  if (error) throw error;
  revalidateTrackSurfaces(parsed.trackId);
}

export async function deleteTrackTodo(id: string, trackId: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("actions").delete().eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}

const reorderSchema = z.object({
  trackId: z.string().uuid(),
  // The full displayed order, top first. Capped well above any realistic task
  // list so a malformed payload can't fan out into thousands of writes.
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * Persist a hand-set order for a track's tasks.
 *
 * Writes an explicit 0..n-1 across every id passed, which is what turns a
 * track from "creation order" (all `sort_order` NULL, see migration 0025)
 * into an ordered one. The top of the resulting list is the track's next
 * action, so this is the only way to choose what that is.
 *
 * Every update is scoped to `track_id` as well as `id`, so an id belonging to
 * another track cannot be renumbered through this action.
 */
export async function reorderTrackTodos(input: {
  trackId: string;
  orderedIds: string[];
}) {
  const parsed = reorderSchema.parse(input);
  const supabase = getServerSupabase();

  const results = await Promise.all(
    parsed.orderedIds.map((id, index) =>
      supabase
        .from("actions")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("track_id", parsed.trackId),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  revalidateTrackSurfaces(parsed.trackId);
}
