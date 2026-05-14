import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { AlbumRow, AlbumWithTrackCount } from "@/lib/types";

// PostgREST returns PGRST205 when a referenced table is not in its schema
// cache — almost always because migration 0010 (which creates `albums` and
// `tracks.album_id`) has not been applied yet. Treat that as "no albums" so
// the dashboard keeps rendering instead of throwing a Server Components
// error; the user will see album features come online once they apply the
// migration.
export function isMissingRelation(
  error: { code?: string | null } | null,
): boolean {
  return error?.code === "PGRST205";
}

export const ALBUMS_MIGRATION_MISSING_MESSAGE =
  "The albums feature is not available yet. Apply supabase/migrations/0010_albums.sql " +
  "to your Supabase project, then try again.";

let warnedAboutMissingAlbums = false;
export function warnMissingAlbumsOnce() {
  if (warnedAboutMissingAlbums) return;
  warnedAboutMissingAlbums = true;
  console.warn(
    "[albums] `albums` table is missing from PostgREST schema cache. " +
      "Apply supabase/migrations/0010_albums.sql to enable album features.",
  );
}

export async function isAlbumsTableMissing(): Promise<boolean> {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("albums")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  if (error && isMissingRelation(error)) {
    warnMissingAlbumsOnce();
    return true;
  }
  return false;
}

export async function getActiveAlbum(): Promise<AlbumRow | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    if (isMissingRelation(error)) {
      warnMissingAlbumsOnce();
      return null;
    }
    throw error;
  }
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
  if (error) {
    if (isMissingRelation(error)) {
      warnMissingAlbumsOnce();
      return null;
    }
    throw error;
  }
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
  if (error) {
    if (isMissingRelation(error)) {
      warnMissingAlbumsOnce();
      return albums.map((a) => ({ ...a, trackCount: 0 }));
    }
    throw error;
  }
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
  if (error) {
    if (isMissingRelation(error)) {
      warnMissingAlbumsOnce();
      return [];
    }
    throw error;
  }
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
  if (error) {
    if (isMissingRelation(error)) {
      warnMissingAlbumsOnce();
      return [];
    }
    throw error;
  }
  return attachTrackCounts(data ?? []);
}
