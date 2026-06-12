"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";

const setSchema = z.object({
  trackId: z.string().uuid(),
  description: z.string().min(1).max(300),
  category: z.string().max(60).optional().or(z.literal("")),
  estimatedMinutes: z
    .union([z.number().int().positive(), z.literal(""), z.null()])
    .optional(),
});

export async function setPrimaryAction(input: {
  trackId: string;
  description: string;
  category?: string;
  estimatedMinutes?: number | "" | null;
}) {
  const parsed = setSchema.parse(input);
  const supabase = getServerSupabase();

  // Demote any existing open primary action.
  await supabase
    .from("actions")
    .update({ is_primary: false })
    .eq("track_id", parsed.trackId)
    .eq("is_primary", true)
    .is("completed_at", null);

  const { error } = await supabase.from("actions").insert({
    track_id: parsed.trackId,
    description: parsed.description,
    category: parsed.category || null,
    estimated_minutes:
      typeof parsed.estimatedMinutes === "number"
        ? parsed.estimatedMinutes
        : null,
    is_primary: true,
  });
  if (error) throw error;

  revalidateTrackSurfaces(parsed.trackId);
}

export async function completeAction(actionId: string, trackId: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("actions")
    .update({ completed_at: new Date().toISOString(), is_primary: false })
    .eq("id", actionId);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}
