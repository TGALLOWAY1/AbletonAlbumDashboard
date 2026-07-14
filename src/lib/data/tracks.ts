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
  const albumIds = [
    ...new Set(
      tracks
        .map((t) => t.album_id)
        .filter((id): id is string => id != null),
    ),
  ];

  const [
    stagesRes,
    bottleneckRes,
    actionRes,
    openActionsRes,
    completedActionsRes,
    albumsRes,
  ] =
    await Promise.all([
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
      supabase
        .from("actions")
        .select("track_id, estimated_minutes")
        .in("track_id", ids)
        .is("completed_at", null),
      supabase
        .from("actions")
        .select("track_id")
        .in("track_id", ids)
        .not("completed_at", "is", null),
      supabase.from("albums").select("id, title").in("id", albumIds),
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
  const openCountByTrack = new Map<string, number>();
  const estMinutesByTrack = new Map<string, number>();
  (openActionsRes.data ?? []).forEach((a) => {
    openCountByTrack.set(a.track_id, (openCountByTrack.get(a.track_id) ?? 0) + 1);
    if (a.estimated_minutes != null) {
      estMinutesByTrack.set(
        a.track_id,
        (estMinutesByTrack.get(a.track_id) ?? 0) + a.estimated_minutes,
      );
    }
  });
  const completedCountByTrack = new Map<string, number>();
  (completedActionsRes.data ?? []).forEach((a) => {
    completedCountByTrack.set(
      a.track_id,
      (completedCountByTrack.get(a.track_id) ?? 0) + 1,
    );
  });
  const albumById = new Map<string, { id: string; title: string | null }>();
  (albumsRes.data ?? []).forEach((a) => albumById.set(a.id, a));

  return tracks.map((t) => ({
    ...t,
    stages: stagesByTrack.get(t.id) ?? [],
    bottleneck: bottleneckByTrack.get(t.id) ?? null,
    primaryAction: actionByTrack.get(t.id) ?? null,
    openTaskCount: openCountByTrack.get(t.id) ?? 0,
    completedTaskCount: completedCountByTrack.get(t.id) ?? 0,
    estMinutesRemaining: estMinutesByTrack.get(t.id) ?? 0,
    album: (t.album_id && albumById.get(t.album_id)) || null,
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

export async function getTracksByAlbum(
  albumId: string,
): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("album_id", albumId)
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export async function getTracksWithoutAlbum(): Promise<TrackWithDetails[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .is("album_id", null)
    .order("last_worked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachDetails(data ?? []);
}

export type AssignableTrack = {
  id: string;
  name: string;
  albumId: string | null;
  albumTitle: string | null;
};

/** All non-archived owner tracks that are NOT in the given album — lean rows
 * for the assign-tracks dialog (unassigned tracks + tracks in other albums). */
export async function getAssignableTracks(
  albumId: string,
): Promise<AssignableTrack[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("tracks")
    .select("id, name, album_id")
    .eq("owner_id", OWNER_ID)
    .neq("status", "archived")
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []).filter((t) => t.album_id !== albumId);
  const albumIds = [
    ...new Set(
      rows.map((t) => t.album_id).filter((id): id is string => id != null),
    ),
  ];
  const titleByAlbumId = new Map<string, string | null>();
  if (albumIds.length > 0) {
    const { data: albums, error: albumsError } = await supabase
      .from("albums")
      .select("id, title")
      .in("id", albumIds);
    if (albumsError) throw albumsError;
    (albums ?? []).forEach((a) => titleByAlbumId.set(a.id, a.title));
  }

  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    albumId: t.album_id,
    albumTitle: t.album_id ? (titleByAlbumId.get(t.album_id) ?? null) : null,
  }));
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

export async function getCompletedActionsForTrack(
  trackId: string,
): Promise<ActionRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("track_id", trackId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });
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
