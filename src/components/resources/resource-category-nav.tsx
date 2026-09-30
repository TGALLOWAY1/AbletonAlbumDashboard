import type { ResourceCategoryId } from "@/lib/data/resources";
import { getOrderedResourceCategories } from "@/lib/data/resources-db";
import { ResourceCategoryTabs } from "./resource-category-tabs";

/**
 * The one category switcher, shared by /resources and every category page:
 * "All" is the landing page, each other tab is that category's own page. The
 * active tab carries the green accent and underline. Pass `null` for the
 * landing page, where "All" is the active state.
 *
 * The categories are a fixed list in code but their order is the user's —
 * read here and handed to the client tabs, which own the rearranging. Other
 * category lists (the add dialog, the move menu) keep the default order.
 */
export async function ResourceCategoryNav({
  activeCategoryId,
}: {
  activeCategoryId: ResourceCategoryId | null;
}) {
  const categories = await getOrderedResourceCategories();
  return (
    <ResourceCategoryTabs
      categories={categories.map(({ id, title }) => ({ id, title }))}
      activeCategoryId={activeCategoryId}
    />
  );
}
