import {
  RESOURCE_CATEGORIES,
  type ResourceCategoryId,
} from "@/lib/data/resources";

/**
 * The category tabs are a fixed list in code; what the user controls is only
 * their order. `saved` is that order as stored (see migration 0036) — ids
 * first, in the order the user set.
 *
 * Applying it is forgiving in both directions, so the tab row can never lose
 * or duplicate a category:
 *  - an id in `saved` that is not a category any more is dropped,
 *  - a category `saved` does not mention (never reordered, or added to the
 *    code after the order was saved) follows the placed ones in its default
 *    position.
 */
export function orderCategories<T extends { id: string }>(
  categories: T[],
  saved: readonly string[],
): T[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const placed: T[] = [];
  const seen = new Set<string>();
  for (const id of saved) {
    const category = byId.get(id);
    if (!category || seen.has(id)) continue;
    seen.add(id);
    placed.push(category);
  }
  return [...placed, ...categories.filter((c) => !seen.has(c.id))];
}

/** The default order, for when nothing has been saved (or it cannot be read). */
export const DEFAULT_CATEGORY_ORDER: ResourceCategoryId[] =
  RESOURCE_CATEGORIES.map((c) => c.id);
