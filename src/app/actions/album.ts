"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { OWNER_ID } from "@/lib/owner";
import { revalidateAlbumSurfaces } from "@/lib/revalidate-track";
import { albumPatchSchema, type AlbumPatchInput } from "@/lib/types";
import {
  isMissingColumn,
  MIGRATION_0021_MISSING_MESSAGE,
} from "@/lib/migration-errors";
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

export type CreateAlbumState = { error: string | null };

// Supabase PostgrestError is a plain object `{ code, message, details, hint }`,
// not an `Error` instance — so `err instanceof Error` is false and we'd
// otherwise drop the real message on the floor and show a generic fallback.
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    if (e.message) {
      const parts = [e.message];
      if (e.code) parts.push(`(${e.code})`);
      if (e.hint) parts.push(`— ${e.hint}`);
      return parts.join(" ");
    }
  }
  return fallback;
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(120).optional().default(""),
  genre: z.string().max(60).optional().default(""),
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

export async function createAlbum(
  _prev: CreateAlbumState,
  formData: FormData,
): Promise<CreateAlbumState> {
  let newId: string;
  try {
    const parsed = upsertSchema.parse({
      title: formData.get("title") ?? "",
      genre: formData.get("genre") ?? "",
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
        genre: parsed.genre.trim() || null,
        cover_image_url: parsed.cover_image_url || null,
        start_date: parsed.start_date || null,
        sort_order: count ?? 0,
        is_active: !hasAny,
      })
      .select("id")
      .single();
    throwIfMissingAlbums(error);
    if (error) throw error;

    newId = data.id;
    revalidateAlbumSurfaces(newId);
  } catch (err) {
    logSupabaseError("[createAlbum] failed", err);
    if (isMissingRelation(err as { code?: string | null })) {
      return { error: ALBUMS_MIGRATION_MISSING_MESSAGE };
    }
    return {
      error: extractErrorMessage(
        err,
        "Could not create album. Please try again.",
      ),
    };
  }
  // redirect() throws NEXT_REDIRECT internally — keep it outside the try/catch
  // so we don't swallow it as a generic error.
  redirect(`/albums/${newId}`);
}

export async function updateAlbum(input: AlbumPatchInput) {
  // safeParse rather than parse: a raw ZodError stringifies to a JSON blob,
  // and the caller toasts `error.message` straight to the user.
  const result = albumPatchSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? "Could not save that album change.",
    );
  }
  const parsed = result.data;

  // Only the keys the caller sent get written — the album header saves one
  // field at a time, and a missing key must not blank the other columns.
  const patch: {
    title?: string | null;
    genre?: string | null;
    cover_image_url?: string | null;
    start_date?: string | null;
  } = {};
  if (parsed.title !== undefined) patch.title = parsed.title.trim() || null;
  if (parsed.genre !== undefined) patch.genre = parsed.genre.trim() || null;
  if (parsed.cover_image_url !== undefined) {
    patch.cover_image_url = parsed.cover_image_url || null;
  }
  if (parsed.start_date !== undefined) {
    patch.start_date = parsed.start_date || null;
  }

  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("albums")
    .update(patch)
    .eq("owner_id", OWNER_ID)
    .eq("id", parsed.id);
  throwIfMissingAlbums(error);
  if (error) {
    if (isMissingColumn(error)) throw new Error(MIGRATION_0021_MISSING_MESSAGE);
    throw error;
  }

  revalidateAlbumSurfaces(parsed.id);
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

  revalidateAlbumSurfaces(id);
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

  // Member tracks just lost their album, so the track listing (which shows
  // membership) needs a refresh alongside the album surfaces.
  revalidateAlbumSurfaces();
  revalidatePath("/tracks");
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

  revalidateAlbumSurfaces();
}
