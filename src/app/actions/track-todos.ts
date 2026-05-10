"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const revalidateAll = (trackId: string) => {
  revalidatePath(`/m/${trackId}`);
  revalidatePath(`/tracks/${trackId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/sessions");
};

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
    is_primary: false,
  });
  if (error) throw error;
  revalidateAll(parsed.trackId);
}

export async function toggleTrackTodo(
  id: string,
  done: boolean,
  trackId: string,
) {
  const supabase = getServerSupabase();
  // Force is_primary=false on every toggle so the partial unique index
  // (is_primary AND completed_at IS NULL) can never be violated.
  const { error } = await supabase
    .from("actions")
    .update({
      completed_at: done ? new Date().toISOString() : null,
      is_primary: false,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateAll(trackId);
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
  revalidateAll(parsed.trackId);
}

export async function deleteTrackTodo(id: string, trackId: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("actions").delete().eq("id", id);
  if (error) throw error;
  revalidateAll(trackId);
}
