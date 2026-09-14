/**
 * What the user has *done* with a resource: rated it, learned from it, or put
 * it on the poster shelf.
 *
 * A category says what shelf a resource is on and a tag says what it is about
 * (src/lib/resource-tags.ts); this file is the third axis — the reader's own
 * relationship to the material. All three of its states live on the row
 * (migration 0035) and everything derived from them is computed here, pure and
 * free of React/Supabase, so the landing page, the category pages and the
 * detail page cannot disagree about what "learned" means.
 *
 * THE LEARNING COUNTER IS NOT A COUNTER
 * -------------------------------------
 * Archiving a resource is the learning event, and `archivedAt` is the only
 * record of it. The figure printed on /resources and the shading in the
 * activity map are both read off those timestamps rather than off a stored
 * tally, for the same reason `nextTask` is derived rather than flagged: a
 * tally cannot be un-learned. Un-archive something and the count and the map
 * both give the day back.
 */

import { toDayKey } from "@/lib/analytics";
import type { ResourceCategoryId, ResourceItem } from "@/lib/data/resources";

/** The stars a resource can carry. Unrated is `null`, never 0. */
export const RESOURCE_RATING_VALUES = [1, 2, 3, 4, 5] as const;

export type ResourceRating = (typeof RESOURCE_RATING_VALUES)[number];

export function isResourceRating(value: unknown): value is ResourceRating {
  return (
    typeof value === "number" &&
    (RESOURCE_RATING_VALUES as readonly number[]).includes(value)
  );
}

/**
 * A rating off the database, or null.
 *
 * Anything outside 1-5 reads as unrated rather than being clamped: the check
 * constraint in 0035 means it cannot happen through this app, and silently
 * turning a 9 into a 5 would invent a judgement the user never made.
 */
export function readRating(value: unknown): ResourceRating | null {
  return isResourceRating(value) ? value : null;
}

/**
 * How many resources fit on the poster shelf.
 *
 * Bigger than the five-track shortlist because these are posters on a wall,
 * not a work queue — twelve fills a six-across row twice over and still reads
 * as a selection rather than the whole library. Enforced in
 * `setResourcePinned`, the only writer; see the note in migration 0035 on why
 * it is not a database constraint.
 */
export const MAX_PINNED_RESOURCES = 12;

/** Heading used wherever archived resources are shown as a shelf. */
export const LEARNED_SHELF_LABEL = "Learned";

export function isArchived(resource: ResourceItem): boolean {
  return Boolean(resource.archivedAt);
}

export function isPinned(resource: ResourceItem): boolean {
  return Boolean(resource.pinnedAt);
}

/**
 * The browsable library: everything not archived.
 *
 * Archiving takes a resource out of the galleries — that is most of what makes
 * it worth doing — so every surface that lists resources to *read* filters
 * through this, and the archived ones come back through `learnedResources`.
 * Input order is preserved, so a caller's recommended order survives.
 */
export function activeResources(items: readonly ResourceItem[]): ResourceItem[] {
  return items.filter((item) => !isArchived(item));
}

/**
 * The learned shelf: archived resources, most recently learned first.
 *
 * Newest-first here and oldest-first on the pinned shelf on purpose. A pin is
 * a standing selection whose order the user built up; an archive is a log, and
 * the thing you just finished is the one you want to see at the front of it.
 */
export function learnedResources(
  items: readonly ResourceItem[],
): ResourceItem[] {
  return items
    .filter(isArchived)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
}

/**
 * The poster shelf: pinned resources, first pinned first.
 *
 * Ordered by the pin timestamp itself rather than by a stored `pin_order` (the
 * way `tracks` are, migration 0027). The shortlist on the dashboard is a
 * priority list the user drags; this is a wall of covers, and "the order I put
 * them up in" needs no second column to keep in step.
 *
 * Archived resources are excluded defensively as well as unpinned on archive
 * (`setResourceArchived`), so a row that somehow carries both never shows up
 * in two places at once.
 */
export function pinnedResources(
  items: readonly ResourceItem[],
): ResourceItem[] {
  return items
    .filter((item) => isPinned(item) && !isArchived(item))
    .sort((a, b) => (a.pinnedAt ?? "").localeCompare(b.pinnedAt ?? ""))
    .slice(0, MAX_PINNED_RESOURCES);
}

/**
 * Learnings per local calendar day — the map the activity heatmap shades.
 *
 * Keyed with `toDayKey` (the analytics local-date key) so a square lines up
 * with the user's own calendar day, exactly like the work heatmap's. Rows with
 * an unparseable timestamp are skipped rather than bucketed under NaN.
 */
export function learningDayMap(
  items: readonly ResourceItem[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item.archivedAt) continue;
    const date = new Date(item.archivedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = toDayKey(date);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Archived resources whose learning landed inside `[start, end]`, **compared
 * by local calendar day** rather than by instant.
 *
 * That is not a detail. A window here comes from an activity strip, whose
 * `end` is normalised to the *start* of the current day — so comparing
 * timestamps dropped everything archived since this morning's midnight, and
 * the By Category view reported fewer learnings than Overall for the whole of
 * every day. Bucketing by `toDayKey` is exactly what `learningDayMap` does, so
 * the filter and the shading now cannot disagree about which day something
 * belongs to.
 *
 * Day keys are zero-padded `YYYY-MM-DD`, so comparing them as strings is
 * comparing them as dates.
 */
export function learnedInRange(
  items: readonly ResourceItem[],
  start: Date,
  end: Date,
): ResourceItem[] {
  const from = toDayKey(start);
  const to = toDayKey(end);
  return items.filter((item) => {
    if (!item.archivedAt) return false;
    const at = new Date(item.archivedAt);
    if (Number.isNaN(at.getTime())) return false;
    const key = toDayKey(at);
    return key >= from && key <= to;
  });
}

export type CategoryLearnings = {
  categoryId: ResourceCategoryId;
  count: number;
  /** Per-day counts for this category alone — its own row in the map. */
  dailyMap: Map<string, number>;
};

/**
 * The "By Category" view: one entry per category that has any learning in the
 * list, heaviest first.
 *
 * Only categories with something in them are returned. A row of seven empty
 * strips would say nothing except that the user has seven categories, which
 * the tab row above already says.
 */
export function learningsByCategory(
  items: readonly ResourceItem[],
): CategoryLearnings[] {
  const byCategory = new Map<ResourceCategoryId, ResourceItem[]>();
  for (const item of items) {
    if (!isArchived(item)) continue;
    const bucket = byCategory.get(item.categoryId);
    if (bucket) bucket.push(item);
    else byCategory.set(item.categoryId, [item]);
  }

  return [...byCategory.entries()]
    .map(([categoryId, group]) => ({
      categoryId,
      count: group.length,
      dailyMap: learningDayMap(group),
    }))
    .sort((a, b) => b.count - a.count || a.categoryId.localeCompare(b.categoryId));
}

/** Mean of the ratings that exist, or null when nothing is rated. */
export function averageRating(items: readonly ResourceItem[]): number | null {
  const ratings = items
    .map((item) => readRating(item.rating))
    .filter((value): value is ResourceRating => value !== null);
  if (ratings.length === 0) return null;
  return ratings.reduce((acc, value) => acc + value, 0) / ratings.length;
}
