"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  assignTracksToAlbumSchema,
  MAX_ACTIVE_TRACKS,
  TRACK_STATUSES,
} from "@/lib/types";
import {
  revalidateAlbumSurfaces,
  revalidateTrackSurfaces,
} from "@/lib/revalidate-track";

const optionalTrimmed = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.trim());

const optionalBpm = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.trim())
  .refine(
    (v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) < 1000),
    "BPM must be a positive number under 1000",
  )
  .transform((v) => (v === "" ? null : Number(v)));

const optionalUuid = z
  .string()
  .optional()
  .default("")
  .transform((v) => v.trim())
  .refine(
    (v) => v === "" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    "Invalid album id",
  )
  .transform((v) => (v === "" ? null : v));

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  tags: z.string().optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "backlog"]).default("active"),
  song_key: optionalTrimmed.pipe(z.string().max(20)),
  bpm: optionalBpm,
  album_id: optionalUuid,
});

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function resolveAlbumId(
  supabase: ReturnType<typeof getServerSupabase>,
  raw: string | null,
): Promise<string | null> {
  if (raw) return raw;
  const { data } = await supabase
    .from("albums")
    .select("id")
    .eq("owner_id", OWNER_ID)
    .eq("is_active", true)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createTrack(formData: FormData) {
  const parsed = createSchema.parse({
    name: formData.get("name"),
    tags: formData.get("tags") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    status: formData.get("status") ?? "active",
    song_key: formData.get("song_key") ?? "",
    bpm: formData.get("bpm") ?? "",
    album_id: formData.get("album_id") ?? "",
  });

  const supabase = getServerSupabase();

  if (parsed.status === "active") {
    const { count } = await supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .eq("status", "active");
    if ((count ?? 0) >= MAX_ACTIVE_TRACKS) {
      throw new Error(
        `You already have ${MAX_ACTIVE_TRACKS} active tracks. Archive one or add this to the backlog.`,
      );
    }
  }

  const album_id = await resolveAlbumId(supabase, parsed.album_id);

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      tags: parseTags(parsed.tags),
      cover_image_url: parsed.cover_image_url || null,
      status: parsed.status,
      song_key: parsed.song_key || null,
      bpm: parsed.bpm,
      album_id,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidateTrackSurfaces(data.id, { albumIds: [album_id] });
  redirect(`/tracks/${data.id}`);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  tags: z.string().optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  als_file_path: z.string().max(1000).optional().default(""),
  song_key: optionalTrimmed.pipe(z.string().max(20)),
  bpm: optionalBpm,
  album_id: optionalUuid,
});

export async function updateTrack(formData: FormData) {
  const parsed = updateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    tags: formData.get("tags") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    als_file_path: formData.get("als_file_path") ?? "",
    song_key: formData.get("song_key") ?? "",
    bpm: formData.get("bpm") ?? "",
    album_id: formData.get("album_id") ?? "",
  });
  const supabase = getServerSupabase();

  // Read the current album before updating so we can refresh the old album's
  // detail page too when the track moves between albums.
  const { data: previous, error: readError } = await supabase
    .from("tracks")
    .select("album_id")
    .eq("owner_id", OWNER_ID)
    .eq("id", parsed.id)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabase
    .from("tracks")
    .update({
      name: parsed.name,
      tags: parseTags(parsed.tags),
      cover_image_url: parsed.cover_image_url || null,
      als_file_path: parsed.als_file_path.trim() || null,
      song_key: parsed.song_key || null,
      bpm: parsed.bpm,
      album_id: parsed.album_id,
    })
    .eq("owner_id", OWNER_ID)
    .eq("id", parsed.id);
  if (error) throw error;
  revalidateTrackSurfaces(parsed.id, {
    albumIds: [previous?.album_id, parsed.album_id],
  });
}

export async function setTrackStatus(id: string, status: string) {
  const next = z
    .enum(TRACK_STATUSES as unknown as [string, ...string[]])
    .parse(status);
  const supabase = getServerSupabase();

  if (next === "active") {
    const { count } = await supabase
      .from("tracks")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .eq("status", "active");
    if ((count ?? 0) >= MAX_ACTIVE_TRACKS) {
      throw new Error(
        `Already at ${MAX_ACTIVE_TRACKS} active tracks. Archive or back-burner one first.`,
      );
    }
  }

  const { error } = await supabase
    .from("tracks")
    .update({ status: next })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(id);
}

export async function toggleTrackFocus(id: string) {
  const supabase = getServerSupabase();
  const { data: current, error: readError } = await supabase
    .from("tracks")
    .select("is_focus")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;

  const next = !current?.is_focus;

  if (next) {
    // Only one focus per owner — clear any existing pin first.
    const { error: clearError } = await supabase
      .from("tracks")
      .update({ is_focus: false })
      .eq("owner_id", OWNER_ID)
      .eq("is_focus", true);
    if (clearError) throw clearError;
  }

  const { error } = await supabase
    .from("tracks")
    .update({ is_focus: next })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;

  revalidateTrackSurfaces(id);
}

export async function deleteTrack(id: string) {
  const supabase = getServerSupabase();

  // Grab the album before the row disappears so its detail page refreshes.
  const { data: previous, error: readError } = await supabase
    .from("tracks")
    .select("album_id")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(id, { albumIds: [previous?.album_id] });
}

// Bulk-assign tracks to an album (or unassign with albumId = null). Returns
// the number of tracks actually updated so callers can toast "Added N tracks".
export async function assignTracksToAlbum(
  albumId: string | null,
  trackIds: string[],
): Promise<{ count: number }> {
  const parsed = assignTracksToAlbumSchema.parse({ albumId, trackIds });
  const supabase = getServerSupabase();

  if (parsed.albumId !== null) {
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("id", parsed.albumId)
      .maybeSingle();
    if (albumError) throw albumError;
    if (!album) {
      throw new Error("Album not found. It may have been deleted.");
    }
  }

  // Read the current albums before updating so the old album detail pages
  // refresh too when tracks move between albums.
  const { data: previous, error: readError } = await supabase
    .from("tracks")
    .select("album_id")
    .eq("owner_id", OWNER_ID)
    .in("id", parsed.trackIds);
  if (readError) throw readError;
  const previousAlbumIds = [
    ...new Set((previous ?? []).map((t) => t.album_id)),
  ];

  const { data: updated, error } = await supabase
    .from("tracks")
    .update({ album_id: parsed.albumId })
    .eq("owner_id", OWNER_ID)
    .in("id", parsed.trackIds)
    .select("id");
  if (error) throw error;

  revalidateAlbumSurfaces(parsed.albumId ?? undefined);
  for (const id of parsed.trackIds) {
    revalidateTrackSurfaces(id, {
      albumIds: [parsed.albumId, ...previousAlbumIds],
    });
  }

  return { count: updated?.length ?? 0 };
}

export async function updateNotes(id: string, notes: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("tracks")
    .update({ notes })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidateTrackSurfaces(id);
}
