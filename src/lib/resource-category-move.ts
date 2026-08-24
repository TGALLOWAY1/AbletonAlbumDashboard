import {
  isResourceCategoryId,
  type ResourceCategoryId,
} from "@/lib/data/resources";

/**
 * Re-categorising a resource is the one resource mutation that moves the row's
 * own URL: `/resources/[categoryId]/[resourceId]` carries the category, so the
 * page the user is standing on 404s the moment the write lands. It also touches
 * two galleries — the one the topic left and the one it joined — and both of
 * their numbering runs.
 *
 * Both rules live here so the server action (which revalidates) and the client
 * (which redirects) read them from the same place and cannot drift.
 */
export type ResourceCategoryMovePlan =
  | { ok: false; error: string }
  | {
      ok: true;
      /** The requested category is the one the resource already has. */
      unchanged: boolean;
      to: ResourceCategoryId;
      /** Every category surface the move invalidates — old first, then new. */
      categoryIds: ResourceCategoryId[];
      /** Where the resource lives once the move lands. */
      destination: string;
    };

export function planResourceCategoryMove({
  resourceId,
  from,
  to,
}: {
  resourceId: string;
  /** The row's current category. Rows come back as plain strings, and a value
   * outside the known set just means there is no old surface to revalidate. */
  from: string | null | undefined;
  to: string;
}): ResourceCategoryMovePlan {
  if (!isResourceCategoryId(to)) {
    return { ok: false, error: "That category doesn't exist." };
  }
  const current =
    typeof from === "string" && isResourceCategoryId(from) ? from : null;
  const unchanged = current === to;

  return {
    ok: true,
    unchanged,
    to,
    categoryIds: current && !unchanged ? [current, to] : [to],
    destination: `/resources/${to}/${resourceId}`,
  };
}
