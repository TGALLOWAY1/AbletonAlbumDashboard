"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  ALBUMS_MIGRATION_MISSING_MESSAGE,
  isMissingRelation,
  warnMissingAlbumsOnce,
} from "@/lib/data/album";

function throwIfMissingAlbums(
  error: { code?: string | null } | null,
): asserts error is null {
  if (error && isMissingRelation(error)) {
    warnMissingAlbumsOnce();
    throw new Error(ALBUMS_MIGRATION_MISSING_MESSAGE);
  }
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(120).optional().default(""),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  start_date: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Date must be YYYY-MM-DD",
    ),
});

function revalidateAlbumViews(id?: string) {
  revalidatePath("/");
  revalidatePath("/albums");
  if (id) revalidatePath(`/albums/${id}`);
}

export async function createAlbum(formData: FormData) {
  const parsed = upsertSchema.parse({
    title: formData.get("title") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    start_date: formData.get("start_date") ?? "",
  });

  const supabase = getServerSupabase();

  const { count, error: countErr } = await supabase
    .from("albums")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", OWNER_ID);
  throwIfMissingAlbums(countErr);
  if (countErr) throw countErr;
  const hasAny = (count ?? 0) > 0;

  const { data, error } = await supabase
    .from("albums")
    .insert({
      owner_id: OWNER_ID,
      title: parsed.title || null,
      cover_image_url: parsed.cover_image_url || null,
      start_date: parsed.start_date || null,
      sort_order: count ?? 0,
      is_active: !hasAny,
    })
    .select("id")
    .single();
  throwIfMissingAlbums(error);
  if (error) throw error;

  revalidateAlbumViews(data.id);
  redirect(`/albums/${data.id}`);
}

export async function updateAlbum(formData: FormData) {
  const parsed = upsertSchema.parse({
    id: formData.get("id"),
    title: formData.get("title") ?? "",
    cover_image_url: formData.get("cover_image_url") ?? "",
    start_date: formData.get("start_date") ?? "",
  });
  if (!parsed.id) throw new Error("Missing album id");

  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("albums")
    .update({
      title: parsed.title || null,
      cover_image_url: parsed.cover_image_url || null,
      start_date: parsed.start_date || null,
    })
    .eq("owner_id", OWNER_ID)
    .eq("id", parsed.id);
  throwIfMissingAlbums(error);
  if (error) throw error;

  revalidateAlbumViews(parsed.id);
}

export async function setActiveAlbum(id: string) {
  z.string().uuid().parse(id);
  const supabase = getServerSupabase();

  // Only one row can be is_active=true at a time (partial unique index).
  // Clear the current active album first, then promote the new one.
  const { error: clearErr } = await supabase
    .from("albums")
    .update({ is_active: false })
    .eq("owner_id", OWNER_ID)
    .eq("is_active", true);
  throwIfMissingAlbums(clearErr);
  if (clearErr) throw clearErr;

  const { error: setErr } = await supabase
    .from("albums")
    .update({ is_active: true })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  throwIfMissingAlbums(setErr);
  if (setErr) throw setErr;

  revalidateAlbumViews(id);
}

export async function deleteAlbum(id: string) {
  z.string().uuid().parse(id);
  const supabase = getServerSupabase();

  const { data: album, error: fetchErr } = await supabase
    .from("albums")
    .select("is_active")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  throwIfMissingAlbums(fetchErr);
  if (fetchErr) throw fetchErr;
  if (!album) return;

  const { error } = await supabase
    .from("albums")
    .delete()
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  throwIfMissingAlbums(error);
  if (error) throw error;

  // If we just removed the active album, promote the next one so the
  // dashboard always has a focus album to show.
  if (album.is_active) {
    const { data: next } = await supabase
      .from("albums")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase
        .from("albums")
        .update({ is_active: true })
        .eq("owner_id", OWNER_ID)
        .eq("id", next.id);
    }
  }

  revalidateAlbumViews();
}

const reorderSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export async function reorderAlbums(ids: string[]) {
  const parsed = reorderSchema.parse({ ids });
  const supabase = getServerSupabase();

  await Promise.all(
    parsed.ids.map((id, index) =>
      supabase
        .from("albums")
        .update({ sort_order: index })
        .eq("owner_id", OWNER_ID)
        .eq("id", id),
    ),
  );

  revalidateAlbumViews();
}
