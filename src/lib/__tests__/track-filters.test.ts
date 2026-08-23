import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  collectFilterOptions,
  describeFilters,
  EMPTY_TRACK_FILTERS,
  filterTracks,
  NO_ALBUM,
  parseTrackFilters,
  removeFilterValue,
  serializeTrackFilters,
} from "@/lib/track-filters";
import type { TrackWithDetails } from "@/lib/types";

function track(overrides: Partial<TrackWithDetails>): TrackWithDetails {
  return {
    id: "t1",
    album_id: null,
    als_file_path: null,
    bpm: null,
    cover_image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    is_focus: false,
    last_worked_at: null,
    name: "Track",
    notes: "",
    owner_id: "owner",
    song_key: null,
    status: "active",
    suno_status: "todo",
    tags: [],
    updated_at: "2026-01-01T00:00:00Z",
    stages: [],
    nextTask: null,
    openTaskCount: 0,
    completedTaskCount: 0,
    estMinutesRemaining: 0,
    album: null,
    sunoExperiment: null,
    ...overrides,
  } as TrackWithDetails;
}

const forestation = { id: "alb-1", title: "Forestation", genre: "Dubstep" };
const nocturne = { id: "alb-2", title: "Nocturne", genre: null };

const tracks: TrackWithDetails[] = [
  track({
    id: "a",
    name: "Put Me In Your Mind",
    status: "active",
    album: forestation,
    song_key: "F# min",
    tags: ["Dubstep", "banger"],
  }),
  track({
    id: "b",
    name: "I Don't Need It",
    status: "active",
    album: forestation,
    song_key: "A min",
    tags: ["organic", "dubstep"],
  }),
  track({
    id: "c",
    name: "Backlogged",
    status: "backlog",
    album: nocturne,
    song_key: "F# min",
    tags: ["trap"],
  }),
  track({ id: "d", name: "Loose", status: "completed" }),
];

describe("parseTrackFilters", () => {
  it("returns empty filters for no params", () => {
    expect(parseTrackFilters({})).toEqual(EMPTY_TRACK_FILTERS);
  });

  it("ignores an unknown status", () => {
    expect(parseTrackFilters({ status: "bogus" }).status).toBeNull();
  });

  it("keeps a known status, album and key", () => {
    expect(
      parseTrackFilters({ status: "backlog", album: "alb-2", key: "F# min" }),
    ).toEqual({
      status: "backlog",
      album: "alb-2",
      key: "F# min",
      tags: [],
    });
  });

  it("parses comma-separated, repeated and mixed-case tags", () => {
    expect(parseTrackFilters({ tag: "Dubstep,organic" }).tags).toEqual([
      "dubstep",
      "organic",
    ]);
    expect(parseTrackFilters({ tag: ["trap", "TRAP", "chill"] }).tags).toEqual([
      "trap",
      "chill",
    ]);
  });

  it("round-trips through serializeTrackFilters", () => {
    const filters = parseTrackFilters({
      status: "active",
      album: "alb-1",
      key: "A min",
      tag: "dubstep,organic",
    });
    const qs = serializeTrackFilters(filters);
    expect(parseTrackFilters(Object.fromEntries(new URLSearchParams(qs)))).toEqual(
      filters,
    );
  });

  it("serializes empty filters to an empty query string", () => {
    expect(serializeTrackFilters(EMPTY_TRACK_FILTERS)).toBe("");
  });
});

describe("filterTracks", () => {
  it("returns everything when nothing is selected", () => {
    expect(filterTracks(tracks, EMPTY_TRACK_FILTERS)).toHaveLength(4);
  });

  it("filters by status", () => {
    expect(
      filterTracks(tracks, { ...EMPTY_TRACK_FILTERS, status: "active" }).map(
        (t) => t.id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("filters by album, including the no-album bucket", () => {
    expect(
      filterTracks(tracks, { ...EMPTY_TRACK_FILTERS, album: "alb-1" }).map(
        (t) => t.id,
      ),
    ).toEqual(["a", "b"]);
    expect(
      filterTracks(tracks, { ...EMPTY_TRACK_FILTERS, album: NO_ALBUM }).map(
        (t) => t.id,
      ),
    ).toEqual(["d"]);
  });

  it("filters by key", () => {
    expect(
      filterTracks(tracks, { ...EMPTY_TRACK_FILTERS, key: "F# min" }).map(
        (t) => t.id,
      ),
    ).toEqual(["a", "c"]);
  });

  it("matches any selected tag, case-insensitively", () => {
    expect(
      filterTracks(tracks, {
        ...EMPTY_TRACK_FILTERS,
        tags: ["dubstep", "trap"],
      }).map((t) => t.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("ANDs across facets", () => {
    expect(
      filterTracks(tracks, {
        ...EMPTY_TRACK_FILTERS,
        status: "active",
        key: "F# min",
        tags: ["dubstep"],
      }).map((t) => t.id),
    ).toEqual(["a"]);
  });

  it("returns nothing for a filter no track satisfies", () => {
    expect(
      filterTracks(tracks, { ...EMPTY_TRACK_FILTERS, key: "C maj" }),
    ).toEqual([]);
  });
});

describe("collectFilterOptions", () => {
  const options = collectFilterOptions(tracks);

  it("only offers statuses that exist, in workflow order", () => {
    expect(options.statuses).toEqual([
      { value: "active", label: "Active", count: 2 },
      { value: "backlog", label: "Backlog", count: 1 },
      { value: "completed", label: "Completed", count: 1 },
    ]);
  });

  it("lists albums alphabetically with 'No album' last", () => {
    expect(options.albums.map((a) => a.label)).toEqual([
      "Forestation",
      "Nocturne",
      "No album",
    ]);
    expect(options.albums.map((a) => a.count)).toEqual([2, 1, 1]);
  });

  it("lists keys that are set", () => {
    expect(options.keys).toEqual([
      { value: "A min", label: "A min", count: 1 },
      { value: "F# min", label: "F# min", count: 2 },
    ]);
  });

  it("lowercases and de-duplicates tags", () => {
    expect(options.tags).toEqual([
      { value: "banger", label: "banger", count: 1 },
      { value: "dubstep", label: "dubstep", count: 2 },
      { value: "organic", label: "organic", count: 1 },
      { value: "trap", label: "trap", count: 1 },
    ]);
  });

  it("handles an empty library", () => {
    expect(collectFilterOptions([])).toEqual({
      statuses: [],
      albums: [],
      keys: [],
      tags: [],
    });
  });
});

describe("active filter chips", () => {
  const options = collectFilterOptions(tracks);
  const filters = {
    status: "active" as const,
    album: "alb-1",
    key: "A min",
    tags: ["dubstep", "organic"],
  };

  it("counts every selected value", () => {
    expect(activeFilterCount(filters)).toBe(5);
    expect(activeFilterCount(EMPTY_TRACK_FILTERS)).toBe(0);
  });

  it("labels each chip", () => {
    expect(describeFilters(filters, options).map((c) => c.label)).toEqual([
      "Active",
      "Forestation",
      "A min",
      "#dubstep",
      "#organic",
    ]);
  });

  it("removes a single tag without clearing the rest", () => {
    expect(removeFilterValue(filters, "tags", "dubstep")).toMatchObject({
      album: "alb-1",
      tags: ["organic"],
    });
  });

  it("clears a single-select facet", () => {
    expect(removeFilterValue(filters, "album", "alb-1").album).toBeNull();
  });
});
