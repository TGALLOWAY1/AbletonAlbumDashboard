import type { TrackWithDetails } from "@/lib/types";

/**
 * Free-text search for the /tracks library. Separate from `track-filters.ts`
 * on purpose: filters are facets picked from a fixed set of options, `q` is
 * open text matched against the track itself, and the two combine (AND) at
 * the call site rather than sharing a shape.
 */

export type TrackSearchParams = {
  q?: string | string[];
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseTrackQuery(params: TrackSearchParams): string {
  return first(params.q);
}

/** "" when there's nothing to search for, so the plain `/tracks` URL stays bare. */
export function serializeTrackQuery(q: string): string {
  const trimmed = q.trim();
  return trimmed ? `q=${encodeURIComponent(trimmed)}` : "";
}

/**
 * Name and tags, case-insensitively, trimmed. An empty (or whitespace-only)
 * query matches everything — the search box being untouched should never
 * hide the library.
 */
export function matchesTrackQuery(track: TrackWithDetails, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  if (track.name.toLowerCase().includes(needle)) return true;
  return track.tags.some((tag) => tag.toLowerCase().includes(needle));
}

export function searchTracks(
  tracks: TrackWithDetails[],
  q: string,
): TrackWithDetails[] {
  return tracks.filter((t) => matchesTrackQuery(t, q));
}
