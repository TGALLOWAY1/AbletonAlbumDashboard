"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";

export async function completeAction(actionId: string, trackId: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("actions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", actionId);
  if (error) throw error;
  revalidateTrackSurfaces(trackId);
}
