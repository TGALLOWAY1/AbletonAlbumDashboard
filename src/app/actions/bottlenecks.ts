"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import { BOTTLENECK_CATEGORIES } from "@/lib/types";

const schema = z.object({
  trackId: z.string().uuid(),
  description: z.string().min(1).max(500),
  category: z.enum(BOTTLENECK_CATEGORIES as unknown as [string, ...string[]]),
});

export async function setActiveBottleneck(input: {
  trackId: string;
  description: string;
  category: string;
}) {
  const parsed = schema.parse(input);
  const supabase = getServerSupabase();

  // Resolve any existing active bottleneck (only one active per track via unique idx)
  await supabase
    .from("bottlenecks")
    .update({ is_active: false, resolved_at: new Date().toISOString() })
    .eq("track_id", parsed.trackId)
    .eq("is_active", true);

  const { error } = await supabase.from("bottlenecks").insert({
    track_id: parsed.trackId,
    description: parsed.description,
    category: parsed.category,
    is_active: true,
  });
  if (error) throw error;

  revalidateTrackSurfaces(parsed.trackId);
}

export async function resolveActiveBottleneck(trackId: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("bottlenecks")
    .update({ is_active: false, resolved_at: new Date().toISOString() })
    .eq("track_id", trackId)
    .eq("is_active", true);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}
