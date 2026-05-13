"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { MAX_ACTIVE_TRACKS, TRACK_STATUSES } from "@/lib/types";

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

  revalidatePath("/");
  revalidatePath("/tracks");
  revalidatePath("/albums");
  if (album_id) revalidatePath(`/albums/${album_id}`);
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
  revalidatePath(`/tracks/${parsed.id}`);
  revalidatePath("/");
  revalidatePath("/albums");
  if (parsed.album_id) revalidatePath(`/albums/${parsed.album_id}`);
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
  revalidatePath("/");
  revalidatePath("/tracks");
  revalidatePath(`/tracks/${id}`);
}

export async function deleteTrack(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/tracks");
}

export async function updateNotes(id: string, notes: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("tracks")
    .update({ notes })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath(`/tracks/${id}`);
  revalidatePath(`/m/${id}`);
}
