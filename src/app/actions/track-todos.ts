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
    .update({
      completed_at: done ? new Date().toISOString() : null,
      })
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
