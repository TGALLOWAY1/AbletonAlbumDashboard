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
  MIGRATION_0035_MISSING_MESSAGE,
  RESOURCES_CATEGORY_CONSTRAINT,
  RESOURCES_RATING_CONSTRAINT,
} from "@/lib/migration-errors";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { planResourceCategoryMove } from "@/lib/resource-category-move";
import { MAX_TAG_LENGTH, normalizeTags } from "@/lib/resource-tags";
import {
  isResourceRating,
  MAX_PINNED_RESOURCES,
} from "@/lib/resource-shelf";
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

// ---------------------------------------------------------------------------
// Rating, learning and pinning (migration 0035)
// ---------------------------------------------------------------------------
//
// Three small writers rather than one "update the row" action, because they
// are three different gestures with three different failure modes — and
// because each has to be callable from a card, where there is no form.
//
// All three refuse seed ids for the reason `updateResource` does: the seed
// entries are placeholder content with no row behind them, so a write would
// report success and change nothing.

/** Shared guard: seed entries, and a well-formed row id. */
function parseResourceId(id: string): { id?: string; error?: string } {
  if (id.startsWith("seed-")) {
    return {
      error: "Sample resources can't be changed. Add your own to get started.",
    };
  }
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "Resource not found." };
  return { id: parsed.data };
}

/** One of the five stars, or null for unrated. `isResourceRating` is the
 *  single definition of that set, shared with every read. */
const ratingSchema = z.number().refine(isResourceRating).nullable();

/**
 * Set or clear a resource's 1-5 stars.
 *
 * `null` is a first-class value, not an absence: clearing a rating says "I
 * haven't judged this", which is different from one star. The picker sends it
 * when the user taps the star they already chose.
 */
export async function setResourceRating(
  id: string,
  rating: number | null,
): Promise<{ error?: string }> {
  const key = parseResourceId(id);
  if (!key.id) return { error: key.error };

  const parsed = ratingSchema.safeParse(rating);
  if (!parsed.success) return { error: "That rating isn't valid." };

  const supabase = getServerSupabase();
  const { data: updated, error } = await supabase
    .from("resources")
    .update({ rating: parsed.data })
    .eq("owner_id", OWNER_ID)
    .eq("id", key.id)
    .select("category_id")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) return { error: MIGRATION_0035_MISSING_MESSAGE };
    // The column exists but predates 0035's check — a rating outside 1-5 was
    // possible then, so the constraint is the only thing that would bounce.
    if (isCheckViolation(error, RESOURCES_RATING_CONSTRAINT)) {
      return { error: MIGRATION_0035_MISSING_MESSAGE };
    }
    logSupabaseError("setResourceRating", error);
    return { error: "Could not save that rating. Try again." };
  }
  if (!updated) return { error: "Resource not found." };

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(updated.category_id)],
    resourceId: key.id,
  });
  return {};
}

/**
 * Mark a resource learned, or put it back in the library.
 *
 * Archiving stamps `archived_at`, and that stamp is the learning: the counter
 * and the activity map on /resources are both derived from it (see
 * src/lib/resource-shelf.ts), so there is no tally to increment here and
 * un-archiving takes the learning back rather than leaving one behind.
 *
 * It also clears the pin. A pin is "I want this in front of me"; archiving is
 * "I'm done with it" — leaving a learned resource on the poster shelf would
 * make the two shelves contradict each other. Un-archiving does not restore
 * it: re-pinning is one tap, and silently taking a slot back from a shelf
 * that may now be full is worse than asking for that tap.
 */
export async function setResourceArchived(
  id: string,
  archived: boolean,
): Promise<{ error?: string }> {
  const key = parseResourceId(id);
  if (!key.id) return { error: key.error };

  const supabase = getServerSupabase();
  const { data: updated, error } = await supabase
    .from("resources")
    .update(
      archived
        ? { archived_at: new Date().toISOString(), pinned_at: null }
        : { archived_at: null },
    )
    .eq("owner_id", OWNER_ID)
    .eq("id", key.id)
    .select("category_id")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) return { error: MIGRATION_0035_MISSING_MESSAGE };
    logSupabaseError("setResourceArchived", error);
    return {
      error: archived
        ? "Could not archive that resource. Try again."
        : "Could not restore that resource. Try again.",
    };
  }
  if (!updated) return { error: "Resource not found." };

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(updated.category_id)],
    resourceId: key.id,
  });
  return {};
}

/**
 * Put a resource on the poster shelf, or take it off.
 *
 * The cap is checked here because this is the only writer — the same trade
 * `setTrackPinned` makes, and for the same reason migration 0035 has no
 * constraint for it. An archived resource cannot be pinned: it has already
 * left the library, and letting it hold a slot would undo the clearing
 * `setResourceArchived` just did.
 */
export async function setResourcePinned(
  id: string,
  pinned: boolean,
): Promise<{ error?: string }> {
  const key = parseResourceId(id);
  if (!key.id) return { error: key.error };

  const supabase = getServerSupabase();

  if (pinned) {
    const { data: existing, error: readError } = await supabase
      .from("resources")
      .select("archived_at")
      .eq("owner_id", OWNER_ID)
      .eq("id", key.id)
      .maybeSingle();
    if (readError) {
      if (isMissingColumn(readError)) {
        return { error: MIGRATION_0035_MISSING_MESSAGE };
      }
      logSupabaseError("setResourcePinned.read", readError);
      return { error: "Could not read that resource. Try again." };
    }
    if (!existing) return { error: "Resource not found." };
    if (existing.archived_at) {
      return {
        error: "That resource is archived. Restore it first, then pin it.",
      };
    }

    const { count, error: countError } = await supabase
      .from("resources")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", OWNER_ID)
      .not("pinned_at", "is", null);
    if (countError) {
      if (isMissingColumn(countError)) {
        return { error: MIGRATION_0035_MISSING_MESSAGE };
      }
      logSupabaseError("setResourcePinned.count", countError);
      return { error: "Could not read your pinned resources. Try again." };
    }
    if ((count ?? 0) >= MAX_PINNED_RESOURCES) {
      return {
        error:
          `You already have ${MAX_PINNED_RESOURCES} resources pinned. Unpin ` +
          `one, or archive it once you've learned from it, to make room.`,
      };
    }
  }

  const { data: updated, error } = await supabase
    .from("resources")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("owner_id", OWNER_ID)
    .eq("id", key.id)
    .select("category_id")
    .maybeSingle();
  if (error) {
    if (isMissingColumn(error)) return { error: MIGRATION_0035_MISSING_MESSAGE };
    logSupabaseError("setResourcePinned", error);
    return { error: "Could not save the pin. Try again." };
  }
  if (!updated) return { error: "Resource not found." };

  revalidateResourceSurfaces({
    categoryIds: [asCategoryId(updated.category_id)],
    resourceId: key.id,
  });
  return {};
}
