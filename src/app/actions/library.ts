"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { revalidateLibrarySurfaces } from "@/lib/revalidate-library";
import {
  LIBRARY_ARTWORK_BUCKET,
  LIBRARY_PREVIEW_BUCKET,
  PREVIEW_SIGNED_URL_TTL_SECONDS,
} from "@/lib/library-storage";
import { PRESET_CATEGORIES } from "@/lib/data/library";
import { reorderPositions } from "@/lib/data/library";

// Supabase PostgrestError is a plain object `{ code, message, details, hint }`
// rather than an Error instance, so `instanceof Error` is false and the real
// message would otherwise be dropped. Same helper as actions/album.ts.
function fail(err: unknown, fallback: string): never {
  if (err instanceof Error && err.message) throw err;
  const e = err as { message?: string; details?: string; hint?: string };
  throw new Error(e?.message || e?.details || e?.hint || fallback);
}

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim())
    .transform((v) => (v ? v : null))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const nameSchema = z.string().trim().min(1, "Name is required").max(200);

const loopStackSchema = z.object({
  name: nameSchema,
  previewPath: optionalText(500),
  artworkUrl: optionalText(2000),
  key: optionalText(60),
  bpm: z.number().positive().max(400).nullable().optional().default(null),
  bars: z
    .number()
    .int()
    .positive()
    .max(1024)
    .nullable()
    .optional()
    .default(null),
  sourceProject: optionalText(200),
  sourcePath: optionalText(1000),
  favorite: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().default(""),
});

const presetSchema = z.object({
  name: nameSchema,
  plugin: optionalText(120),
  category: z.enum(PRESET_CATEGORIES).optional().default("Other"),
  previewPath: optionalText(500),
  artworkUrl: optionalText(2000),
  presetPath: optionalText(1000),
  sourceProject: optionalText(200),
  favorite: z.boolean().optional().default(false),
  core: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional().default(""),
});

const collectionSchema = z.object({
  name: nameSchema,
  description: optionalText(500),
  artworkUrl: optionalText(2000),
});

export type LoopStackInput = z.input<typeof loopStackSchema>;
export type PresetInput = z.input<typeof presetSchema>;
export type CollectionInput = z.input<typeof collectionSchema>;
export type CollectionItemRefInput = {
  type: "loopStack" | "preset";
  id: string;
};

// ---------------------------------------------------------------------------
// Storage cleanup
// ---------------------------------------------------------------------------

/**
 * Remove an asset's uploaded files once its row is gone.
 *
 * Best-effort: a storage failure must not make the delete look like it failed,
 * since the row is already gone and the UI has moved on. Worst case is an
 * orphaned object, which is cheap; a thrown error here would be misleading.
 */
async function removeAssetFiles(
  previewPath: string | null,
  artworkUrl: string | null,
) {
  const supabase = getServerSupabase();
  try {
    if (previewPath) {
      await supabase.storage.from(LIBRARY_PREVIEW_BUCKET).remove([previewPath]);
    }
    const artworkKey = artworkObjectKey(artworkUrl);
    if (artworkKey) {
      await supabase.storage.from(LIBRARY_ARTWORK_BUCKET).remove([artworkKey]);
    }
  } catch (err) {
    console.error("[library] storage cleanup failed", err);
  }
}

/** Recover the object key from a public artwork URL, if it is one of ours. */
function artworkObjectKey(artworkUrl: string | null): string | null {
  if (!artworkUrl) return null;
  const marker = `/${LIBRARY_ARTWORK_BUCKET}/`;
  const index = artworkUrl.indexOf(marker);
  if (index === -1) return null;
  const key = artworkUrl.slice(index + marker.length).split("?")[0];
  return key ? decodeURIComponent(key) : null;
}

// ---------------------------------------------------------------------------
// Loop stacks
// ---------------------------------------------------------------------------

export async function createLoopStack(
  input: LoopStackInput,
): Promise<{ id: string }> {
  const parsed = loopStackSchema.parse(input);
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_loop_stacks")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      preview_path: parsed.previewPath,
      artwork_url: parsed.artworkUrl,
      music_key: parsed.key,
      bpm: parsed.bpm,
      bars: parsed.bars,
      source_project: parsed.sourceProject,
      source_path: parsed.sourcePath,
      favorite: parsed.favorite,
      notes: parsed.notes,
    })
    .select("id")
    .single();
  if (error) fail(error, "Could not save that Loop Stack.");

  revalidateLibrarySurfaces();
  return { id: data.id };
}

export async function updateLoopStack(id: string, input: LoopStackInput) {
  const parsed = loopStackSchema.parse(input);
  const supabase = getServerSupabase();
  const { error, count } = await supabase
    .from("library_loop_stacks")
    .update(
      {
        name: parsed.name,
        preview_path: parsed.previewPath,
        artwork_url: parsed.artworkUrl,
        music_key: parsed.key,
        bpm: parsed.bpm,
        bars: parsed.bars,
        source_project: parsed.sourceProject,
        source_path: parsed.sourcePath,
        favorite: parsed.favorite,
        notes: parsed.notes,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not save that Loop Stack.");
  if (!count) throw new Error("Loop Stack not found.");

  revalidateLibrarySurfaces();
}

export async function deleteLoopStack(id: string) {
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("library_loop_stacks")
    .select("preview_path, artwork_url")
    .eq("id", id)
    .eq("owner_id", OWNER_ID)
    .maybeSingle();

  // Collection membership rows go with it via `on delete cascade`, so no
  // dangling reference can survive this.
  const { error, count } = await supabase
    .from("library_loop_stacks")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not delete that Loop Stack.");
  if (!count) throw new Error("Loop Stack not found.");

  await removeAssetFiles(
    existing?.preview_path ?? null,
    existing?.artwork_url ?? null,
  );
  revalidateLibrarySurfaces();
}

export async function setLoopStackFavorite(id: string, favorite: boolean) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("library_loop_stacks")
    .update({ favorite })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not update that Loop Stack.");
  revalidateLibrarySurfaces();
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export async function createPreset(
  input: PresetInput,
): Promise<{ id: string }> {
  const parsed = presetSchema.parse(input);
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_presets")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      plugin: parsed.plugin,
      category: parsed.category,
      preview_path: parsed.previewPath,
      artwork_url: parsed.artworkUrl,
      preset_path: parsed.presetPath,
      source_project: parsed.sourceProject,
      favorite: parsed.favorite,
      core: parsed.core,
      notes: parsed.notes,
    })
    .select("id")
    .single();
  if (error) fail(error, "Could not save that preset.");

  revalidateLibrarySurfaces();
  return { id: data.id };
}

export async function updatePreset(id: string, input: PresetInput) {
  const parsed = presetSchema.parse(input);
  const supabase = getServerSupabase();
  const { error, count } = await supabase
    .from("library_presets")
    .update(
      {
        name: parsed.name,
        plugin: parsed.plugin,
        category: parsed.category,
        preview_path: parsed.previewPath,
        artwork_url: parsed.artworkUrl,
        preset_path: parsed.presetPath,
        source_project: parsed.sourceProject,
        favorite: parsed.favorite,
        core: parsed.core,
        notes: parsed.notes,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not save that preset.");
  if (!count) throw new Error("Preset not found.");

  revalidateLibrarySurfaces();
}

export async function deletePreset(id: string) {
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("library_presets")
    .select("preview_path, artwork_url")
    .eq("id", id)
    .eq("owner_id", OWNER_ID)
    .maybeSingle();

  const { error, count } = await supabase
    .from("library_presets")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not delete that preset.");
  if (!count) throw new Error("Preset not found.");

  await removeAssetFiles(
    existing?.preview_path ?? null,
    existing?.artwork_url ?? null,
  );
  revalidateLibrarySurfaces();
}

export async function setPresetFavorite(id: string, favorite: boolean) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("library_presets")
    .update({ favorite })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not update that preset.");
  revalidateLibrarySurfaces();
}

export async function setPresetCore(id: string, core: boolean) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("library_presets")
    .update({ core })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not update that preset.");
  revalidateLibrarySurfaces();
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function createCollection(
  input: CollectionInput,
): Promise<{ id: string }> {
  const parsed = collectionSchema.parse(input);
  const supabase = getServerSupabase();

  const { data: last } = await supabase
    .from("library_collections")
    .select("position")
    .eq("owner_id", OWNER_ID)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("library_collections")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      description: parsed.description,
      artwork_url: parsed.artworkUrl,
      position: (last?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) fail(error, "Could not create that collection.");

  revalidateLibrarySurfaces();
  return { id: data.id };
}

export async function updateCollection(id: string, input: CollectionInput) {
  const parsed = collectionSchema.parse(input);
  const supabase = getServerSupabase();
  const { error, count } = await supabase
    .from("library_collections")
    .update(
      {
        name: parsed.name,
        description: parsed.description,
        artwork_url: parsed.artworkUrl,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not save that collection.");
  if (!count) throw new Error("Collection not found.");

  revalidateLibrarySurfaces();
}

/**
 * Delete a collection but never its assets — the cascade runs from collection
 * to membership rows only, and there is no path from a membership row back to
 * a loop stack or preset.
 */
export async function deleteCollection(id: string) {
  const supabase = getServerSupabase();
  const { error, count } = await supabase
    .from("library_collections")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) fail(error, "Could not delete that collection.");
  if (!count) throw new Error("Collection not found.");

  revalidateLibrarySurfaces();
}

async function assertOwnsCollection(collectionId: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("library_collections")
    .select("id")
    .eq("id", collectionId)
    .eq("owner_id", OWNER_ID)
    .maybeSingle();
  if (error) fail(error, "Could not load that collection.");
  if (!data) throw new Error("Collection not found.");
}

export async function addToCollection(
  collectionId: string,
  refs: CollectionItemRefInput[],
) {
  if (refs.length === 0) return;
  await assertOwnsCollection(collectionId);

  const supabase = getServerSupabase();
  const { data: existing, error: readError } = await supabase
    .from("library_collection_items")
    .select("loop_stack_id, preset_id, position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false });
  if (readError) fail(readError, "Could not load that collection.");

  const present = new Set(
    (existing ?? []).map((row) => row.loop_stack_id ?? row.preset_id),
  );
  const fresh = refs.filter((ref) => !present.has(ref.id));
  if (fresh.length === 0) return;

  let position = (existing?.[0]?.position ?? -1) + 1;
  const { error } = await supabase.from("library_collection_items").insert(
    fresh.map((ref) => ({
      collection_id: collectionId,
      loop_stack_id: ref.type === "loopStack" ? ref.id : null,
      preset_id: ref.type === "preset" ? ref.id : null,
      position: position++,
    })),
  );
  if (error) fail(error, "Could not add to that collection.");

  revalidateLibrarySurfaces();
}

/** Remove an asset from a collection. The asset itself is untouched. */
export async function removeFromCollection(itemId: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("library_collection_items")
    .delete()
    .eq("id", itemId);
  if (error) fail(error, "Could not remove that item.");
  revalidateLibrarySurfaces();
}

export async function moveCollectionItem(
  itemId: string,
  direction: "up" | "down",
) {
  const supabase = getServerSupabase();
  const { data: item, error: itemError } = await supabase
    .from("library_collection_items")
    .select("collection_id")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError) fail(itemError, "Could not reorder that item.");
  if (!item) throw new Error("Item not found.");

  await assertOwnsCollection(item.collection_id);

  const { data: siblings, error } = await supabase
    .from("library_collection_items")
    .select("id, position")
    .eq("collection_id", item.collection_id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) fail(error, "Could not reorder that item.");

  const ordered = (siblings ?? []).map((row) => ({ itemId: row.id }));
  const next = reorderPositions(ordered, itemId, direction);

  // Writing every row (rather than just the swapped pair) also normalises any
  // gaps left behind by earlier removals.
  await Promise.all(
    next.map(({ itemId: id, position }) =>
      supabase
        .from("library_collection_items")
        .update({ position })
        .eq("id", id),
    ),
  );

  revalidateLibrarySurfaces();
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

/**
 * Re-sign a preview. Called by the player when an object 404s or its URL has
 * aged past the signing TTL in a long-lived tab.
 */
export async function signLibraryPreview(previewPath: string): Promise<string> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.storage
    .from(LIBRARY_PREVIEW_BUCKET)
    .createSignedUrl(previewPath, PREVIEW_SIGNED_URL_TTL_SECONDS);
  if (error) fail(error, "Could not load that preview.");
  return data.signedUrl;
}
