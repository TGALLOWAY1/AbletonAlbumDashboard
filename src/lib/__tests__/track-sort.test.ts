import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRACK_SORT,
  parseTrackSort,
  serializeTrackSort,
  sortTracks,
  TRACK_SORT_KEYS,
  TRACK_SORT_OPTIONS,
} from "@/lib/track-sort";
import type { TrackWithDetails } from "@/lib/types";

function track(overrides: Partial<TrackWithDetails>): TrackWithDetails {
  return {
    id: "t1",
    album_id: null,
    als_file_path: null,
    bpm: null,
    cover_image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    pin_order: null,
    pinned_at: null,
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

describe("parseTrackSort", () => {
  it("defaults to last_worked for no value", () => {
    expect(parseTrackSort(undefined)).toBe("last_worked");
    expect(parseTrackSort(DEFAULT_TRACK_SORT)).toBe("last_worked");
  });

  it("falls back to the default for an unknown value", () => {
    expect(parseTrackSort("bogus")).toBe(DEFAULT_TRACK_SORT);
  });

  it("accepts every declared key", () => {
    for (const key of TRACK_SORT_KEYS) {
      expect(parseTrackSort(key)).toBe(key);
    }
  });

  it("takes the first value of a repeated param and trims it", () => {
    expect(parseTrackSort([" name ", "bpm"])).toBe("name");
    expect(parseTrackSort(["bpm", "name"])).toBe("bpm");
  });
});

describe("serializeTrackSort", () => {
  it("is empty for the default key", () => {
    expect(serializeTrackSort(DEFAULT_TRACK_SORT)).toBe("");
  });

  it("emits sort= for a non-default key", () => {
    expect(serializeTrackSort("name")).toBe("sort=name");
  });
});

describe("TRACK_SORT_OPTIONS", () => {
  it("has a label for every key, in TRACK_SORT_KEYS order", () => {
    expect(TRACK_SORT_OPTIONS.map((o) => o.value)).toEqual([...TRACK_SORT_KEYS]);
    for (const option of TRACK_SORT_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe("sortTracks", () => {
  it("sorts by last_worked_at descending, nulls (never worked) last", () => {
    const tracks = [
      track({ id: "a", last_worked_at: "2026-01-05T00:00:00Z" }),
      track({ id: "b", last_worked_at: null }),
      track({ id: "c", last_worked_at: "2026-01-10T00:00:00Z" }),
    ];
    expect(sortTracks(tracks, "last_worked").map((t) => t.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("defaults to last_worked when no key is given", () => {
    const tracks = [
      track({ id: "a", last_worked_at: "2026-01-05T00:00:00Z" }),
      track({ id: "b", last_worked_at: "2026-01-10T00:00:00Z" }),
    ];
    expect(sortTracks(tracks).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("sorts by progress descending", () => {
    const tracks = [
      track({ id: "a", stages: [{ percent: 20 } as never] }),
      track({ id: "b", stages: [{ percent: 90 } as never] }),
    ];
    const sorted = sortTracks(tracks, "progress");
    expect(sorted[0].id).toBe("b");
  });

  it("sorts by name case-insensitively, ascending", () => {
    const tracks = [
      track({ id: "a", name: "zebra" }),
      track({ id: "b", name: "Apple" }),
      track({ id: "c", name: "banana" }),
    ];
    expect(sortTracks(tracks, "name").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts by bpm descending, nulls (no BPM) last", () => {
    const tracks = [
      track({ id: "a", bpm: 120 }),
      track({ id: "b", bpm: null }),
      track({ id: "c", bpm: 140 }),
    ];
    expect(sortTracks(tracks, "bpm").map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by created_at descending", () => {
    const tracks = [
      track({ id: "a", created_at: "2026-01-01T00:00:00Z" }),
      track({ id: "b", created_at: "2026-01-15T00:00:00Z" }),
    ];
    expect(sortTracks(tracks, "created").map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("is stable — ties keep their original relative order", () => {
    const tracks = [
      track({ id: "a", bpm: 120 }),
      track({ id: "b", bpm: 120 }),
      track({ id: "c", bpm: 120 }),
    ];
    expect(sortTracks(tracks, "bpm").map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const tracks = [
      track({ id: "a", name: "zebra" }),
      track({ id: "b", name: "apple" }),
    ];
    const original = tracks.map((t) => t.id);
    sortTracks(tracks, "name");
    expect(tracks.map((t) => t.id)).toEqual(original);
  });
});
