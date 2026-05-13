import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { AlbumRow, AlbumWithTrackCount } from "@/lib/types";

export async function getActiveAlbum(): Promise<AlbumRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAlbum(id: string): Promise<AlbumRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function attachTrackCounts(
  albums: AlbumRow[],
): Promise<AlbumWithTrackCount[]> {
  if (albums.length === 0) return [];
  const supabase = getServerSupabase();
  const ids = albums.map((a) => a.id);
  const { data, error } = await supabase
    .from("tracks")
    .select("album_id")
    .eq("owner_id", OWNER_ID)
    .in("album_id", ids)
    .neq("status", "archived");
  if (error) throw error;
  const counts = new Map<string, number>();
  (data ?? []).forEach((row) => {
    if (!row.album_id) return;
    counts.set(row.album_id, (counts.get(row.album_id) ?? 0) + 1);
  });
  return albums.map((a) => ({ ...a, trackCount: counts.get(a.id) ?? 0 }));
}

export async function listAlbums(): Promise<AlbumWithTrackCount[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return attachTrackCounts(data ?? []);
}

export async function listUpcomingAlbums(
  limit = 4,
): Promise<AlbumWithTrackCount[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("is_active", false)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return attachTrackCounts(data ?? []);
}
