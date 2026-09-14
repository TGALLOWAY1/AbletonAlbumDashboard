import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  isResourceCategoryId,
  isResourceSourceKind,
  isResourceType,
  RESOURCE_CATEGORIES,
  SEED_RESOURCES,
  type ResourceCategory,
  type ResourceCategoryId,
  type ResourceItem,
} from "@/lib/data/resources";
import { normalizeTags } from "@/lib/resource-tags";
import {
  activeResources,
  learnedResources,
  pinnedResources,
  readRating,
} from "@/lib/resource-shelf";

const RESOURCE_FILES_BUCKET = "resource-files";

type ResourceRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  category_id: string;
  source_kind: string;
  storage_path: string | null;
  content: string | null;
  url: string | null;
  thumbnail_url: string | null;
  read_minutes: number;
  bookmarked: boolean;
  featured: boolean;
  created_at: string;
  /** Absent, not null, on a database without migration 0032. */
  tags?: string[] | null;
  /** The three from migration 0035; likewise absent, not null, without it. */
  rating?: number | null;
  archived_at?: string | null;
  pinned_at?: string | null;
};

type ServerSupabase = ReturnType<typeof getServerSupabase>;

/**
 * Reads degrade: every resource query is `select("*")`, so a database without
 * migration 0032 simply returns rows with no `tags` key rather than failing —
 * there is nothing to retry without. The row then reads as untagged, the
 * galleries render, the tag chip row is empty, and this says once which file
 * to run. It must never become a thrown error: the whole Resources section
 * would go down over a filter.
 */
let warnedMissingTags = false;
function readTags(row: ResourceRow): string[] {
  if (!("tags" in row)) {
    if (!warnedMissingTags) {
      warnedMissingTags = true;
      console.warn(
        "[resources] resources.tags is missing — every resource reads as " +
          "untagged. Apply supabase/migrations/0032_resource_tags.sql to " +
          "enable tags, the tag filter and grouping.",
      );
    }
    return [];
  }
  return Array.isArray(row.tags) ? normalizeTags(row.tags) : [];
}

/**
 * The same degrade for migration 0035's three columns, for the same reason: a
 * build can reach a database that has not had it applied. Without them every
 * resource reads as unrated, un-archived and unpinned — the state the whole
 * library was in before 0035 — so the galleries render exactly as they did,
 * the activity map is empty, and this says once which file to run.
 */
let warnedMissingLearning = false;
function readLearningFields(row: ResourceRow): {
  rating: number | null;
  archivedAt: string | null;
  pinnedAt: string | null;
} {
  if (!("archived_at" in row)) {
    if (!warnedMissingLearning) {
      warnedMissingLearning = true;
      console.warn(
        "[resources] resources.archived_at is missing — every resource reads " +
          "as unrated, un-archived and unpinned. Apply " +
          "supabase/migrations/0035_resource_learning.sql to enable stars, " +
          "the learning log and the poster shelf.",
      );
    }
    return { rating: null, archivedAt: null, pinnedAt: null };
  }
  return {
    rating: readRating(row.rating),
    archivedAt: row.archived_at ?? null,
    pinnedAt: row.pinned_at ?? null,
  };
}

function rowToItem(supabase: ServerSupabase, row: ResourceRow): ResourceItem | null {
  if (
    !isResourceType(row.type) ||
    !isResourceCategoryId(row.category_id) ||
    !isResourceSourceKind(row.source_kind)
  ) {
    return null;
  }
  let url: string | null = row.url;
  if (row.source_kind === "pdf" && row.storage_path) {
    const { data } = supabase.storage
      .from(RESOURCE_FILES_BUCKET)
      .getPublicUrl(row.storage_path);
    url = data.publicUrl;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    categoryId: row.category_id,
    sourceKind: row.source_kind,
    url,
    storagePath: row.storage_path,
    content: row.content,
    thumbnailUrl: row.thumbnail_url,
    readMinutes: row.read_minutes,
    tags: readTags(row),
    bookmarked: row.bookmarked,
    featured: row.featured,
    addedAt: row.created_at,
    ...readLearningFields(row),
  };
}

async function fetchAllResources(): Promise<ResourceItem[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .order("created_at", { ascending: false });
  if (error) {
    // The resources table may not exist yet (migration not applied). Don't crash
    // the page — fall back to seed content via the empty path below.
    console.error("[resources] fetch failed", error);
    return [];
  }
  const items: ResourceItem[] = [];
  for (const row of data ?? []) {
    // A single corrupt row must not kill the page — skip it and move on.
    try {
      const item = rowToItem(supabase, row as ResourceRow);
      if (item) items.push(item);
    } catch (e) {
      console.error("[resources] skipping bad row", (row as ResourceRow).id, e);
    }
  }
  return items;
}

// Until the user has added anything, every resources surface shows the seed
// entries so none of them is ever empty on first load.
function seedResources(): ResourceItem[] {
  return SEED_RESOURCES;
}

// "Recommended order": first-added comes first, so a gallery reads as a curated
// sequence (topic 1, topic 2, ...) rather than a reverse-chron feed. Both the
// landing gallery and the category galleries number topics off this order.
function byRecommendedOrder(items: ResourceItem[]): ResourceItem[] {
  return [...items].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

/**
 * Everything /resources renders.
 *
 * Split here rather than in the page because the split is the same one every
 * resources surface makes — archived material leaves the gallery and comes
 * back as a shelf — and the rules for it live in one place
 * (src/lib/resource-shelf.ts).
 *
 * `learned` is the *whole* archive, not a windowed slice: the activity map
 * picks its own range on the client, the same way the Progress panel does, so
 * the server sends the series and the range control never costs a round trip.
 */
export async function getResourcesLandingData(): Promise<{
  topics: ResourceItem[];
  pinned: ResourceItem[];
  learned: ResourceItem[];
}> {
  const items = await fetchAllResources();
  const source = items.length === 0 ? seedResources() : items;
  return {
    topics: byRecommendedOrder(activeResources(source)),
    pinned: pinnedResources(source),
    learned: learnedResources(source),
  };
}

export async function getResourceCategoryPageData(
  categoryId: ResourceCategoryId,
): Promise<{
  category: ResourceCategory;
  topics: ResourceItem[];
  learned: ResourceItem[];
}> {
  const items = await fetchAllResources();
  const source = items.length === 0 ? seedResources() : items;
  const inCategory = source.filter((item) => item.categoryId === categoryId);
  // Archived material is out of the gallery but not out of the category: it
  // returns below it as the Learned shelf, so a category still accounts for
  // everything filed under it.
  const topics = byRecommendedOrder(activeResources(inCategory));
  const base = RESOURCE_CATEGORIES.find((c) => c.id === categoryId)!;
  return {
    category: { ...base, articleCount: topics.length },
    topics,
    learned: learnedResources(inCategory),
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getResourceById(
  id: string,
): Promise<ResourceItem | null> {
  if (id.startsWith("seed-")) {
    return seedResources().find((item) => item.id === id) ?? null;
  }
  // A malformed id can't match a row and Postgres would reject the query, so
  // it's a plain not-found — but any other failure (outage, permissions,
  // schema) must propagate to the route's error boundary, not become a 404.
  if (!UUID_RE.test(id)) return null;
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  try {
    return rowToItem(supabase, data as ResourceRow);
  } catch (e) {
    console.error("[resources] bad row", id, e);
    return null;
  }
}
