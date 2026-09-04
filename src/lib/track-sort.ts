import { progressFromStages, type TrackWithDetails } from "@/lib/types";

/**
 * Sort control for the /tracks library. Grouping by album
 * (`src/lib/track-grouping.ts`) is unaffected — sorting happens *within* each
 * album group, deciding the order tracks appear in once the shelf has already
 * split them up.
 */
export const TRACK_SORT_KEYS = [
  "last_worked",
  "progress",
  "name",
  "bpm",
  "created",
] as const;
export type TrackSortKey = (typeof TRACK_SORT_KEYS)[number];

/** Same order the control lists them in. */
export const TRACK_SORT_OPTIONS: Array<{ value: TrackSortKey; label: string }> = [
  { value: "last_worked", label: "Last worked" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name" },
  { value: "bpm", label: "BPM" },
  { value: "created", label: "Date added" },
];

export const DEFAULT_TRACK_SORT: TrackSortKey = "last_worked";

export type TrackSortSearchParams = {
  sort?: string | string[];
};

/**
 * Takes the raw searchParams value directly (rather than the whole params
 * object, as `parseTrackFilters`/`parseViewPreference` do) since there's only
 * the one field to read.
 */
export function parseTrackSort(value: string | string[] | undefined): TrackSortKey {
  const v = (Array.isArray(value) ? value[0] : value)?.trim();
  return TRACK_SORT_KEYS.includes(v as TrackSortKey)
    ? (v as TrackSortKey)
    : DEFAULT_TRACK_SORT;
}

/** "" when `key` is the default, so the plain `/tracks` URL stays bare. */
export function serializeTrackSort(key: TrackSortKey): string {
  return key === DEFAULT_TRACK_SORT ? "" : `sort=${key}`;
}

type Comparable = number | string | null;

/**
 * Comparable value for each key, `null` standing for "put this last"
 * regardless of sort direction — no BPM, a track never worked, no timestamp.
 */
function sortValue(track: TrackWithDetails, key: TrackSortKey): Comparable {
  switch (key) {
    case "last_worked":
      return track.last_worked_at ? Date.parse(track.last_worked_at) : null;
    case "progress":
      return progressFromStages(track.stages);
    case "name":
      return track.name.trim().toLowerCase();
    case "bpm":
      return track.bpm ?? null;
    case "created":
      return track.created_at ? Date.parse(track.created_at) : null;
  }
}

/** Ascending name; every other key descending (most-recent/highest first). */
function ascending(key: TrackSortKey): boolean {
  return key === "name";
}

/**
 * Stable sort by `key`, nulls always last. Ties fall back to the array's
 * existing order (already `last_worked desc, created_at desc` off
 * `getAllTracks`), which is also why this never needs a secondary key of its
 * own — `Array.prototype.sort` is guaranteed stable.
 */
export function sortTracks(
  tracks: TrackWithDetails[],
  key: TrackSortKey = DEFAULT_TRACK_SORT,
): TrackWithDetails[] {
  const dir = ascending(key) ? 1 : -1;
  return [...tracks].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av === bv) return 0;
    return av < bv ? -dir : dir;
  });
}
