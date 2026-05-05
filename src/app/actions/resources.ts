"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_SOURCE_KINDS,
  RESOURCE_TYPES,
} from "@/lib/data/resources";
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
} from "@/lib/youtube";

const RESOURCE_FILES_BUCKET = "resource-files";

const CATEGORY_IDS = RESOURCE_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];

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

export async function createResource(formData: FormData) {
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
  const parsed = baseSchema.parse(raw);

  // Enforce that the field for the chosen kind is present.
  if (parsed.source_kind === "pdf" && !parsed.storage_path) {
    throw new Error("Upload a PDF before saving.");
  }
  if (parsed.source_kind === "markdown" && !parsed.content) {
    throw new Error("Markdown content is required.");
  }
  if (parsed.source_kind === "url" && !parsed.url) {
    throw new Error("URL is required.");
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
  if (error) throw error;

  revalidatePath("/resources");
}

export async function toggleResourceBookmark(id: string) {
  const supabase = getServerSupabase();
  const { data: existing, error: readError } = await supabase
    .from("resources")
    .select("bookmarked")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error("Resource not found.");

  const { error } = await supabase
    .from("resources")
    .update({ bookmarked: !existing.bookmarked })
    .eq("owner_id", OWNER_ID)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/resources");
}

export async function deleteResource(id: string) {
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("resources")
    .select("storage_path")
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
  if (error) throw error;
  revalidatePath("/resources");
}
