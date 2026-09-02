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
  isMissingColumn,
  MIGRATION_0026_MISSING_MESSAGE,
  MIGRATION_0032_MISSING_MESSAGE,
  RESOURCES_CATEGORY_CONSTRAINT,
} from "@/lib/migration-errors";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { planResourceCategoryMove } from "@/lib/resource-category-move";
import { MAX_TAG_LENGTH, normalizeTags } from "@/lib/resource-tags";
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
  // Free-form instrument/role words. No enum: the point of 0032 is that adding
  // a word never needs a migration. The shape is bounded, the vocabulary is
  // not; `normalizeTags` then puts them in storage form.
  tags: z
    .array(z.string().max(MAX_TAG_LENGTH * 2))
    .max(50)
    .optional()
    .default([]),
});

/** Repeated `tags` fields on the form, in the order the user picked them. */
function readTagsField(formData: FormData): string[] {
  return formData
    .getAll("tags")
    .filter((value): value is string => typeof value === "string");
}

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
    tags: readTagsField(formData),
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

  const tags = normalizeTags(parsed.tags);
  const supabase = getServerSupabase();
  const row = {
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
  };
  let { error } = await supabase.from("resources").insert({ ...row, tags });
  if (error && isMissingColumn(error)) {
    // A build can reach a database that has not had 0032 applied yet. Adding a
    // resource is not a tagging feature, so an untagged add still goes through
    // without the column; only an add that would *lose* the user's tags is
    // refused, with the file to run.
    if (tags.length > 0) return { error: MIGRATION_0032_MISSING_MESSAGE };
    ({ error } = await supabase.from("resources").insert(row));
  }
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

// Everything about a resource that can change after it is saved. The category
// is not here — it is part of the resource's URL, so moving one is its own
// action (`updateResourceCategory`) that has to tell the caller where to go.
// Nor is `source_kind`: a markdown note and an uploaded PDF are different
// objects, and re-pointing one at the other would strand a stored file.
const updateSchema = baseSchema
  .omit({ category_id: true, source_kind: true, storage_path: true })
  .extend({ featured: z.coerce.boolean().optional() });

/**
 * Edit a saved resource in place: its title, description, type, read time,
 * thumbnail, tags, and whichever body field matches the row's own
 * `source_kind` — the link for a url, the markdown for a note. A PDF's storage
 * path is deliberately not editable; replacing the file is an upload, not a
 * text edit.
 */
export async function updateResource(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  if (id.startsWith("seed-")) {
    return {
      error: "Sample resources can't be edited. Add your own to change it.",
    };
  }

  const supabase = getServerSupabase();
  const { data: existing, error: readError } = await supabase
    .from("resources")
    .select("category_id, source_kind")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    logSupabaseError("updateResource.read", readError);
    return { error: "Could not save your changes. Try again." };
  }
  if (!existing) return { error: "Resource not found." };

  const result = updateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    read_minutes: formData.get("read_minutes") ?? 5,
    content: formData.get("content") || null,
    url: formData.get("url") || null,
    thumbnail_url: formData.get("thumbnail_url") || null,
    tags: readTagsField(formData),
  });
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "That resource isn't valid.",
    };
  }
  const parsed = result.data;
  const sourceKind = existing.source_kind;

  if (sourceKind === "url" && !parsed.url) {
    return { error: "URL is required." };
  }
  if (sourceKind === "markdown" && !parsed.content) {
    return { error: "Markdown content is required." };
  }

  // Same rule as creating one: a YouTube link carries its own thumbnail unless
  // the user has set another.
  let thumbnailUrl = parsed.thumbnail_url ?? null;
  if (!thumbnailUrl && sourceKind === "url" && parsed.url) {
    const videoId = getYouTubeVideoId(parsed.url);
    if (videoId) thumbnailUrl = getYouTubeThumbnailUrl(videoId);
  }

  const tags = normalizeTags(parsed.tags);
  const patch = {
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    read_minutes: parsed.read_minutes,
    thumbnail_url: thumbnailUrl,
    // Only the field this row's kind actually uses; the others stay as they
    // are rather than being nulled out by an edit that never showed them.
    ...(sourceKind === "url" ? { url: parsed.url } : {}),
    ...(sourceKind === "markdown" ? { content: parsed.content } : {}),
  };

  let { error } = await supabase
    .from("resources")
    .update({ ...patch, tags })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error && isMissingColumn(error)) {
    // 0032 not applied yet: save the rest of the edit rather than losing it,
    // unless the edit was about tags — then say which file to run.
    if (tags.length > 0) return { error: MIGRATION_0032_MISSING_MESSAGE };
    ({ error } = await supabase
      .from("resources")
      .update(patch)
      .eq("owner_id", OWNER_ID)
      .eq("id", id));
  }
  if (error) {
    logSupabaseError("updateResource", error);
    return { error: "Could not save your changes. Try again." };
  }

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(existing.category_id)],
    resourceId: id,
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
