"use server";

import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  isResourceCategoryId,
  RESOURCE_CATEGORIES,
  RESOURCE_SOURCE_KINDS,
  RESOURCE_TYPES,
  type ResourceCategoryId,
} from "@/lib/data/resources";
import {
  isCheckViolation,
  MIGRATION_0026_MISSING_MESSAGE,
  RESOURCES_CATEGORY_CONSTRAINT,
} from "@/lib/migration-errors";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { planResourceCategoryMove } from "@/lib/resource-category-move";
import { revalidateResourceSurfaces } from "@/lib/revalidate-resources";
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
} from "@/lib/youtube";

const RESOURCE_FILES_BUCKET = "resource-files";

const CATEGORY_IDS = RESOURCE_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];

// Rows come back from PostgREST typed as plain strings; narrow before using one
// to build a revalidation path.
function asCategoryId(value: unknown): ResourceCategoryId | null {
  return typeof value === "string" && isResourceCategoryId(value)
    ? value
    : null;
}

const baseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional().default(""),
  type: z.enum(RESOURCE_TYPES as [string, ...string[]]),
  category_id: z.enum(CATEGORY_IDS),
  source_kind: z.enum(RESOURCE_SOURCE_KINDS as [string, ...string[]]),
  read_minutes: z.coerce.number().int().min(0).max(600).default(5),
  featured: z.coerce.boolean().optional().default(false),
  // pdf
  storage_path: z.string().max(400).optional().nullable(),
  // markdown
  content: z.string().max(50_000).optional().nullable(),
  // url
  url: z.string().url("Must be a valid URL").optional().nullable(),
  // optional override; auto-derived for YouTube urls
  thumbnail_url: z.string().url().optional().nullable(),
});

// Errors are *returned*, not thrown: a production build replaces the message of
// anything a server action throws with a generic string, which would strand the
// user on the "apply migration 0026" case with nothing to act on.
export async function createResource(
  formData: FormData,
): Promise<{ error?: string }> {
  const raw = {
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    category_id: formData.get("category_id"),
    source_kind: formData.get("source_kind"),
    read_minutes: formData.get("read_minutes") ?? 5,
    featured: formData.get("featured") === "on" ||
      formData.get("featured") === "true",
    storage_path: formData.get("storage_path") || null,
    content: formData.get("content") || null,
    url: formData.get("url") || null,
    thumbnail_url: formData.get("thumbnail_url") || null,
  };
  const result = baseSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "That resource isn't valid." };
  }
  const parsed = result.data;

  // Enforce that the field for the chosen kind is present.
  if (parsed.source_kind === "pdf" && !parsed.storage_path) {
    return { error: "Upload a PDF before saving." };
  }
  if (parsed.source_kind === "markdown" && !parsed.content) {
    return { error: "Markdown content is required." };
  }
  if (parsed.source_kind === "url" && !parsed.url) {
    return { error: "URL is required." };
  }

  // Auto-derive a YouTube thumbnail when none was provided.
  let thumbnailUrl = parsed.thumbnail_url ?? null;
  if (!thumbnailUrl && parsed.source_kind === "url" && parsed.url) {
    const videoId = getYouTubeVideoId(parsed.url);
    if (videoId) {
      thumbnailUrl = getYouTubeThumbnailUrl(videoId);
    }
  }

  const supabase = getServerSupabase();
  const { error } = await supabase.from("resources").insert({
    owner_id: OWNER_ID,
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    category_id: parsed.category_id,
    source_kind: parsed.source_kind,
    storage_path:
      parsed.source_kind === "pdf" ? parsed.storage_path ?? null : null,
    content:
      parsed.source_kind === "markdown" ? parsed.content ?? null : null,
    url: parsed.source_kind === "url" ? parsed.url ?? null : null,
    thumbnail_url: thumbnailUrl,
    read_minutes: parsed.read_minutes,
    featured: parsed.featured,
  });
  if (error) {
    // The database still only accepts the original six categories.
    if (isCheckViolation(error, RESOURCES_CATEGORY_CONSTRAINT)) {
      return { error: MIGRATION_0026_MISSING_MESSAGE };
    }
    logSupabaseError("createResource", error);
    return { error: "Could not save that resource. Try again." };
  }

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(parsed.category_id)],
  });
  return {};
}

/**
 * Move a resource to another category after the fact. Returns where the
 * resource now lives: the category is part of its URL, so the caller's current
 * page is stale the moment this succeeds.
 */
export async function updateResourceCategory(
  id: string,
  categoryId: string,
): Promise<{ error?: string; destination?: string }> {
  if (id.startsWith("seed-")) {
    // Seed entries are placeholder content with no row behind them.
    return {
      error: "Sample resources can't be moved. Add your own to organize it.",
    };
  }

  const supabase = getServerSupabase();
  const { data: existing, error: readError } = await supabase
    .from("resources")
    .select("category_id")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    logSupabaseError("updateResourceCategory.read", readError);
    return { error: "Could not move that resource. Try again." };
  }
  if (!existing) return { error: "Resource not found." };

  const plan = planResourceCategoryMove({
    resourceId: id,
    from: existing.category_id,
    to: categoryId,
  });
  if (!plan.ok) return { error: plan.error };
  // Already there — nothing to write, but still answer with the destination so
  // the caller has one code path.
  if (plan.unchanged) return { destination: plan.destination };

  const { error } = await supabase
    .from("resources")
    .update({ category_id: plan.to })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) {
    // The database still only accepts the original six categories.
    if (isCheckViolation(error, RESOURCES_CATEGORY_CONSTRAINT)) {
      return { error: MIGRATION_0026_MISSING_MESSAGE };
    }
    logSupabaseError("updateResourceCategory", error);
    return { error: "Could not move that resource. Try again." };
  }

  revalidateResourceSurfaces({
    categoryIds: plan.categoryIds,
    resourceId: id,
  });
  return { destination: plan.destination };
}

export async function toggleResourceBookmark(
  id: string,
): Promise<{ error?: string }> {
  const supabase = getServerSupabase();
  const { data: existing, error: readError } = await supabase
    .from("resources")
    .select("bookmarked, category_id")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    logSupabaseError("toggleResourceBookmark.read", readError);
    return { error: "Could not update bookmark. Try again." };
  }
  if (!existing) return { error: "Resource not found." };

  const { error } = await supabase
    .from("resources")
    .update({ bookmarked: !existing.bookmarked })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) {
    logSupabaseError("toggleResourceBookmark", error);
    return { error: "Could not update bookmark. Try again." };
  }

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(existing.category_id)],
    resourceId: id,
  });
  return {};
}

export async function deleteResource(id: string): Promise<{ error?: string }> {
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("resources")
    .select("storage_path, category_id")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();

  if (existing?.storage_path) {
    await supabase.storage
      .from(RESOURCE_FILES_BUCKET)
      .remove([existing.storage_path]);
  }

  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) {
    logSupabaseError("deleteResource", error);
    return { error: "Could not delete that resource. Try again." };
  }

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(existing?.category_id)],
    resourceId: id,
  });
  return {};
}
