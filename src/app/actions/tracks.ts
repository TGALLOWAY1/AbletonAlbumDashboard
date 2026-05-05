"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { MAX_ACTIVE_TRACKS, TRACK_STATUSES } from "@/lib/types";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  tags: z.string().optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "backlog"]).default("active"),
});

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createTrack(formData: FormData) {
  const parsed = createSchema.parse({
    name: formData.get("name"),
    tags: formData.get("tags") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    status: formData.get("status") ?? "active",
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

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      tags: parseTags(parsed.tags),
      cover_image_url: parsed.cover_image_url || null,
      status: parsed.status,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/tracks");
  redirect(`/tracks/${data.id}`);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  tags: z.string().optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  als_file_path: z.string().max(1000).optional().default(""),
});

export async function updateTrack(formData: FormData) {
  const parsed = updateSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    tags: formData.get("tags") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    als_file_path: formData.get("als_file_path") ?? "",
  });
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("tracks")
    .update({
      name: parsed.name,
      tags: parseTags(parsed.tags),
      cover_image_url: parsed.cover_image_url || null,
      als_file_path: parsed.als_file_path.trim() || null,
    })
    .eq("owner_id", OWNER_ID)
    .eq("id", parsed.id);
  if (error) throw error;
  revalidatePath(`/tracks/${parsed.id}`);
  revalidatePath("/");
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
  revalidatePath(`/tracks/${id}`);
}
