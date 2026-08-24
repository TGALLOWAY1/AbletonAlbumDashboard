import { revalidatePath } from "next/cache";
import type { ResourceCategoryId } from "@/lib/data/resources";

/**
 * Resource mutations must refresh every surface that renders the row: the "All"
 * gallery on /resources, the category gallery it belongs to, and its own topic
 * page. Adding a resource also changes the *other* galleries' numbering, so the
 * landing page is always revalidated, not just the category. Mirrors
 * revalidateTrackSurfaces — don't hand-roll revalidatePath lists at call sites.
 */
export function revalidateResourceSurfaces(opts?: {
  categoryIds?: (ResourceCategoryId | null | undefined)[];
  resourceId?: string;
}) {
  revalidatePath("/resources");
  for (const categoryId of new Set(opts?.categoryIds ?? [])) {
    if (!categoryId) continue;
    revalidatePath(`/resources/${categoryId}`);
    if (opts?.resourceId) {
      revalidatePath(`/resources/${categoryId}/${opts.resourceId}`);
    }
  }
}
