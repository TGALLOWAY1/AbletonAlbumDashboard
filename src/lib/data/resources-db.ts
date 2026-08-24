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
};

type ServerSupabase = ReturnType<typeof getServerSupabase>;

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
    bookmarked: row.bookmarked,
    featured: row.featured,
    addedAt: row.created_at,
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

/** Every resource, in recommended order — the "All" gallery on /resources. */
export async function getResourcesGalleryData(): Promise<{
  topics: ResourceItem[];
}> {
  const items = await fetchAllResources();
  const source = items.length === 0 ? seedResources() : items;
  return { topics: byRecommendedOrder(source) };
}

export async function getResourceCategoryPageData(
  categoryId: ResourceCategoryId,
): Promise<{ category: ResourceCategory; topics: ResourceItem[] }> {
  const items = await fetchAllResources();
  const source = items.length === 0 ? seedResources() : items;
  const topics = byRecommendedOrder(
    source.filter((item) => item.categoryId === categoryId),
  );
  const base = RESOURCE_CATEGORIES.find((c) => c.id === categoryId)!;
  return {
    category: { ...base, articleCount: topics.length },
    topics,
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
