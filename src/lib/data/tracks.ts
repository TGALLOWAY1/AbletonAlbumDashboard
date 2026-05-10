import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type {
  ActionRow,
  BottleneckRow,
  StageRow,
  TrackRow,
  TrackStatus,
  TrackWithDetails,
} from "@/lib/types";

async function attachDetails(tracks: TrackRow[]): Promise<TrackWithDetails[]> {
  if (tracks.length === 0) return [];
  const supabase = getServerSupabase();
  const ids = tracks.map((t) => t.id);

  const [stagesRes, bottleneckRes, actionRes] = await Promise.all([
    supabase.from("track_stages").select("*").in("track_id", ids),
    supabase
      .from("bottlenecks")
      .select("*")
      .in("track_id", ids)
      .eq("is_active", true),
    supabase
      .from("actions")
      .select("*")
      .in("track_id", ids)
      .eq("is_primary", true)
      .is("completed_at", null),
  ]);

  const stagesByTrack = new Map<string, StageRow[]>();
  (stagesRes.data ?? []).forEach((s) => {
    const list = stagesByTrack.get(s.track_id) ?? [];
    list.push(s);
    stagesByTrack.set(s.track_id, list);
  });
  const bottleneckByTrack = new Map<string, BottleneckRow>();
  (bottleneckRes.data ?? []).forEach((b) => bottleneckByTrack.set(b.track_id, b));
  const actionByTrack = new Map<string, ActionRow>();
  (actionRes.data ?? []).forEach((a) => actionByTrack.set(a.track_id, a));

  return tracks.map((t) => ({
    ...t,
    stages: stagesByTrack.get(t.id) ?? [],
    bottleneck: bottleneckByTrack.get(t.id) ?? null,
    primaryAction: actionByTrack.get(t.id) ?? null,
  }));
}

export async function getTracksByStatus(
  status: TrackStatus,
): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("status", status)
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export async function getAllTracks(): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export async function getTrack(id: string): Promise<TrackWithDetails | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withDetails] = await attachDetails([data]);
  return withDetails;
}

export async function getOpenActionsForTrack(
  trackId: string,
): Promise<ActionRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("track_id", trackId)
    .is("completed_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function countActiveTracks(): Promise<number> {
  const supabase = getServerSupabase();
  const { count, error } = await supabase
    .from("tracks")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", OWNER_ID)
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}
