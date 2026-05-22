import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  isResourceCategoryId,
  isResourceSourceKind,
  isResourceType,
  RESOURCE_CATEGORIES,
  SEED_FEATURED_RESOURCES,
  SEED_RECENT_RESOURCES,
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

function rowToItem(row: ResourceRow): ResourceItem | null {
  if (
    !isResourceType(row.type) ||
    !isResourceCategoryId(row.category_id) ||
    !isResourceSourceKind(row.source_kind)
  ) {
    return null;
  }
  let url: string | null = row.url;
  if (row.source_kind === "pdf" && row.storage_path) {
    const supabase = getServerSupabase();
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
    // the page — fall back to seed content via getResourcesPageData's empty path.
    console.error("[resources] fetch failed", error);
    return [];
  }
  return (data ?? [])
    .map((row) => rowToItem(row as ResourceRow))
    .filter((item): item is ResourceItem => item !== null);
}

export async function getResourcesPageData(): Promise<{
  categories: ResourceCategory[];
  featured: ResourceItem[];
  recent: ResourceItem[];
}> {
  const items = await fetchAllResources();

  const counts = new Map<ResourceCategoryId, number>();
  for (const item of items) {
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
  }
  const categories: ResourceCategory[] = RESOURCE_CATEGORIES.map((c) => ({
    ...c,
    articleCount: counts.get(c.id) ?? 0,
  }));

  // If the user hasn't uploaded anything yet, show seed entries so the page
  // looks like the mockup. As soon as they add their own, only their items
  // appear.
  if (items.length === 0) {
    return {
      categories,
      featured: SEED_FEATURED_RESOURCES,
      recent: SEED_RECENT_RESOURCES,
    };
  }

  const featured = items.filter((i) => i.featured);
  return {
    categories,
    featured: featured.length > 0 ? featured : items.slice(0, 4),
    recent: items,
  };
}
