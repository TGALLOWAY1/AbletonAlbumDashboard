import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

export type SessionStats = { seconds: number; count: number };

// Per-track aggregate of all-time logged session time and session count.
export async function getSessionStatsByTrack(): Promise<
  Map<string, SessionStats>
> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("sessions")
    .select("track_id, duration_seconds, tracks!inner(owner_id)")
    .eq("tracks.owner_id", OWNER_ID);

  const map = new Map<string, SessionStats>();
  (data ?? []).forEach((row) => {
    if (!row.track_id) return;
    const prev = map.get(row.track_id) ?? { seconds: 0, count: 0 };
    map.set(row.track_id, {
      seconds: prev.seconds + (row.duration_seconds ?? 0),
      count: prev.count + 1,
    });
  });
  return map;
}

// Per-track count of completed sessions started within the last `days` days.
// Feeds the momentum signal in `recommendTrack`.
export async function getSessionCountsByTrackSince(
  days: number,
): Promise<Map<string, number>> {
  const supabase = getServerSupabase();
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from("sessions")
    .select("track_id, tracks!inner(owner_id)")
    .eq("tracks.owner_id", OWNER_ID)
    .eq("status", "completed")
    .gte("started_at", sinceIso);

  const map = new Map<string, number>();
  (data ?? []).forEach((row) => {
    if (!row.track_id) return;
    map.set(row.track_id, (map.get(row.track_id) ?? 0) + 1);
  });
  return map;
}
