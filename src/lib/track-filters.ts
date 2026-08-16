import {
  TRACK_STATUSES,
  type TrackStatus,
  type TrackWithDetails,
} from "@/lib/types";

// Sentinel album value for "tracks that aren't on an album yet". Album ids are
// uuids, so this can never collide with a real one.
export const NO_ALBUM = "none";

export const STATUS_LABELS: Record<TrackStatus, string> = {
  active: "Active",
  backlog: "Backlog",
  completed: "Completed",
  archived: "Archived",
};

/**
 * Filter state for the /tracks library view. Single-select for the structural
 * facets (status / album / key), multi-select for tags — tags are the only
 * facet where "show me anything matching one of these" is useful.
 *
 * Matching semantics: AND across facets, OR within `tags`.
 */
export type TrackFilters = {
  status: TrackStatus | null;
  album: string | null;
  key: string | null;
  tags: string[];
};

export const EMPTY_TRACK_FILTERS: TrackFilters = {
  status: null,
  album: null,
  key: null,
  tags: [],
};

export type TrackFilterSearchParams = {
  status?: string | string[];
  album?: string | string[];
  key?: string | string[];
  tag?: string | string[];
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseTrackFilters(
  params: TrackFilterSearchParams,
): TrackFilters {
  const status = first(params.status);
  const album = first(params.album);
  const key = first(params.key);
  const tags = Array.from(
    new Set(
      (Array.isArray(params.tag) ? params.tag : [params.tag ?? ""])
        .flatMap((v) => v.split(","))
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return {
    status: TRACK_STATUSES.includes(status as TrackStatus)
      ? (status as TrackStatus)
      : null,
    album: album || null,
    key: key || null,
    tags,
  };
}

/** Query string for the current filter state ("" when nothing is selected). */
export function serializeTrackFilters(filters: TrackFilters): string {
  const usp = new URLSearchParams();
  if (filters.status) usp.set("status", filters.status);
  if (filters.album) usp.set("album", filters.album);
  if (filters.key) usp.set("key", filters.key);
  if (filters.tags.length > 0) usp.set("tag", filters.tags.join(","));
  return usp.toString();
}

export function activeFilterCount(filters: TrackFilters): number {
  return (
    (filters.status ? 1 : 0) +
    (filters.album ? 1 : 0) +
    (filters.key ? 1 : 0) +
    filters.tags.length
  );
}

export function trackMatchesFilters(
  track: TrackWithDetails,
  filters: TrackFilters,
): boolean {
  if (filters.status && track.status !== filters.status) return false;

  if (filters.album) {
    const albumId = track.album?.id ?? NO_ALBUM;
    if (albumId !== filters.album) return false;
  }

  if (filters.key && (track.song_key ?? "") !== filters.key) return false;

  if (filters.tags.length > 0) {
    const trackTags = track.tags.map((t) => t.toLowerCase());
    if (!filters.tags.some((t) => trackTags.includes(t))) return false;
  }

  return true;
}

export function filterTracks(
  tracks: TrackWithDetails[],
  filters: TrackFilters,
): TrackWithDetails[] {
  return tracks.filter((t) => trackMatchesFilters(t, filters));
}

export type FilterOption = { value: string; label: string; count: number };

export type TrackFilterOptions = {
  statuses: FilterOption[];
  albums: FilterOption[];
  keys: FilterOption[];
  tags: FilterOption[];
};

/**
 * Facet options derived from the tracks themselves, so the sheet never offers a
 * filter that would return nothing. Counts are over the whole library rather
 * than the current result set — they answer "how much is behind this option",
 * which stays stable while you build up a selection.
 */
export function collectFilterOptions(
  tracks: TrackWithDetails[],
): TrackFilterOptions {
  const statusCounts = new Map<string, number>();
  const albumCounts = new Map<string, number>();
  const albumTitles = new Map<string, string>();
  const keyCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const track of tracks) {
    statusCounts.set(track.status, (statusCounts.get(track.status) ?? 0) + 1);

    const albumId = track.album?.id ?? NO_ALBUM;
    albumCounts.set(albumId, (albumCounts.get(albumId) ?? 0) + 1);
    if (track.album) {
      albumTitles.set(track.album.id, track.album.title ?? "Untitled album");
    }

    if (track.song_key) {
      keyCounts.set(track.song_key, (keyCounts.get(track.song_key) ?? 0) + 1);
    }

    for (const tag of new Set(track.tags.map((t) => t.toLowerCase()))) {
      if (!tag) continue;
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const statuses = TRACK_STATUSES.filter((s) => statusCounts.has(s)).map(
    (s) => ({ value: s, label: STATUS_LABELS[s], count: statusCounts.get(s)! }),
  );

  const albums = Array.from(albumCounts.entries())
    .map(([value, count]) => ({
      value,
      label: value === NO_ALBUM ? "No album" : (albumTitles.get(value) ?? value),
      count,
    }))
    // Real albums alphabetically, "No album" pinned last.
    .sort((a, b) => {
      if (a.value === NO_ALBUM) return 1;
      if (b.value === NO_ALBUM) return -1;
      return a.label.localeCompare(b.label);
    });

  const keys = Array.from(keyCounts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const tags = Array.from(tagCounts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { statuses, albums, keys, tags };
}

/** Human-readable chips for the filters currently applied. */
export function describeFilters(
  filters: TrackFilters,
  options: TrackFilterOptions,
): Array<{ facet: keyof TrackFilters; value: string; label: string }> {
  const chips: Array<{
    facet: keyof TrackFilters;
    value: string;
    label: string;
  }> = [];

  if (filters.status) {
    chips.push({
      facet: "status",
      value: filters.status,
      label: STATUS_LABELS[filters.status],
    });
  }
  if (filters.album) {
    const match = options.albums.find((a) => a.value === filters.album);
    chips.push({
      facet: "album",
      value: filters.album,
      label: match?.label ?? "Album",
    });
  }
  if (filters.key) {
    chips.push({ facet: "key", value: filters.key, label: filters.key });
  }
  for (const tag of filters.tags) {
    chips.push({ facet: "tags", value: tag, label: `#${tag}` });
  }

  return chips;
}

/** Remove one chip's value from the filter state. */
export function removeFilterValue(
  filters: TrackFilters,
  facet: keyof TrackFilters,
  value: string,
): TrackFilters {
  if (facet === "tags") {
    return { ...filters, tags: filters.tags.filter((t) => t !== value) };
  }
  return { ...filters, [facet]: null };
}
