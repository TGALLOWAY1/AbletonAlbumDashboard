import { getServerSupabase } from "@/lib/supabase/server";
import type { VersionRow } from "@/lib/types";

export async function getVersionsForTrack(
  trackId: string,
): Promise<VersionRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("track_versions")
    .select("*")
    .eq("track_id", trackId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
