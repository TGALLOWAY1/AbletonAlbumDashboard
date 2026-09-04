import { describe, expect, it } from "vitest";
import {
  matchesTrackQuery,
  parseTrackQuery,
  searchTracks,
  serializeTrackQuery,
} from "@/lib/track-search";
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

describe("parseTrackQuery", () => {
  it("returns '' for no param", () => {
    expect(parseTrackQuery({})).toBe("");
  });

  it("trims whitespace", () => {
    expect(parseTrackQuery({ q: "  hello  " })).toBe("hello");
  });

  it("takes the first value of a repeated param", () => {
    expect(parseTrackQuery({ q: ["a", "b"] })).toBe("a");
  });
});

describe("serializeTrackQuery", () => {
  it("is empty for an empty or whitespace-only query", () => {
    expect(serializeTrackQuery("")).toBe("");
    expect(serializeTrackQuery("   ")).toBe("");
  });

  it("emits q= for a non-empty query, URL-encoded", () => {
    expect(serializeTrackQuery("lo fi")).toBe("q=lo%20fi");
  });

  it("round-trips through parseTrackQuery", () => {
    const qs = serializeTrackQuery("Dubstep Banger");
    const params = Object.fromEntries(new URLSearchParams(qs));
    expect(parseTrackQuery(params)).toBe("Dubstep Banger");
  });
});

describe("matchesTrackQuery", () => {
  const t = track({ name: "Put Me In Your Mind", tags: ["Dubstep", "Banger"] });

  it("matches an empty query against everything", () => {
    expect(matchesTrackQuery(t, "")).toBe(true);
    expect(matchesTrackQuery(t, "   ")).toBe(true);
  });

  it("matches the name case-insensitively", () => {
    expect(matchesTrackQuery(t, "your mind")).toBe(true);
    expect(matchesTrackQuery(t, "YOUR MIND")).toBe(true);
  });

  it("matches a partial name", () => {
    expect(matchesTrackQuery(t, "Put Me")).toBe(true);
  });

  it("matches a tag case-insensitively", () => {
    expect(matchesTrackQuery(t, "dubstep")).toBe(true);
    expect(matchesTrackQuery(t, "BANGER")).toBe(true);
  });

  it("trims the query before matching", () => {
    expect(matchesTrackQuery(t, "  dubstep  ")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesTrackQuery(t, "trap")).toBe(false);
  });
});

describe("searchTracks", () => {
  const tracks = [
    track({ id: "a", name: "Put Me In Your Mind", tags: ["dubstep"] }),
    track({ id: "b", name: "I Don't Need It", tags: ["organic"] }),
    track({ id: "c", name: "Loose", tags: ["trap", "dubstep"] }),
  ];

  it("returns everything for an empty query", () => {
    expect(searchTracks(tracks, "").map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by name or tag", () => {
    expect(searchTracks(tracks, "dubstep").map((t) => t.id)).toEqual(["a", "c"]);
    expect(searchTracks(tracks, "loose").map((t) => t.id)).toEqual(["c"]);
  });

  it("returns nothing when no track matches", () => {
    expect(searchTracks(tracks, "nonexistent")).toEqual([]);
  });
});
