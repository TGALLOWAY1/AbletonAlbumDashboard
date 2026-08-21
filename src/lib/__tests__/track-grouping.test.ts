import { describe, expect, it } from "vitest";
import { NO_ALBUM } from "@/lib/track-filters";
import {
  BACKLOG_GROUP_LABEL,
  groupTracksByAlbum,
} from "@/lib/track-grouping";
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
    tags: [],
    updated_at: "2026-01-01T00:00:00Z",
    stages: [],
    bottleneck: null,
    primaryAction: null,
    openTaskCount: 0,
    completedTaskCount: 0,
    estMinutesRemaining: 0,
    album: null,
    sunoExperiment: null,
    ...overrides,
  } as TrackWithDetails;
}

const forestation = { id: "alb-1", title: "Forestation" };
const nocturne = { id: "alb-2", title: "Nocturne" };

describe("groupTracksByAlbum", () => {
  it("groups by album and pins unassigned tracks to a backlog group last", () => {
    const groups = groupTracksByAlbum(
      [
        track({ id: "loose", album: null }),
        track({ id: "a", album: forestation }),
        track({ id: "b", album: nocturne }),
        track({ id: "c", album: forestation }),
      ],
      [forestation.id, nocturne.id],
    );

    expect(groups.map((g) => [g.id, g.label])).toEqual([
      [forestation.id, "Forestation"],
      [nocturne.id, "Nocturne"],
      [NO_ALBUM, BACKLOG_GROUP_LABEL],
    ]);
    expect(groups[0].tracks.map((t) => t.id)).toEqual(["a", "c"]);
    expect(groups[2].tracks.map((t) => t.id)).toEqual(["loose"]);
  });

  it("keeps each group in the order the tracks arrived", () => {
    const groups = groupTracksByAlbum(
      [
        track({ id: "newest", album: forestation }),
        track({ id: "older", album: forestation }),
      ],
      [forestation.id],
    );
    expect(groups[0].tracks.map((t) => t.id)).toEqual(["newest", "older"]);
  });

  it("follows the album order it is given, not the tracks' order", () => {
    const groups = groupTracksByAlbum(
      [track({ id: "a", album: forestation }), track({ id: "b", album: nocturne })],
      [nocturne.id, forestation.id],
    );
    expect(groups.map((g) => g.id)).toEqual([nocturne.id, forestation.id]);
  });

  it("sorts albums missing from the order hint alphabetically, after the known ones", () => {
    const zephyr = { id: "alb-3", title: "Zephyr" };
    const groups = groupTracksByAlbum(
      [
        track({ id: "z", album: zephyr }),
        track({ id: "n", album: nocturne }),
        track({ id: "f", album: forestation }),
      ],
      [nocturne.id],
    );
    expect(groups.map((g) => g.label)).toEqual([
      "Nocturne",
      "Forestation",
      "Zephyr",
    ]);
  });

  it("omits albums with no matching tracks", () => {
    const groups = groupTracksByAlbum(
      [track({ id: "a", album: forestation })],
      [forestation.id, nocturne.id],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe(forestation.id);
  });

  it("labels an album with no title rather than rendering a blank heading", () => {
    const groups = groupTracksByAlbum([
      track({ id: "a", album: { id: "alb-9", title: "  " } }),
    ]);
    expect(groups[0].label).toBe("Untitled album");
  });

  it("links album groups to the album page and leaves the backlog unlinked", () => {
    const groups = groupTracksByAlbum([
      track({ id: "a", album: forestation }),
      track({ id: "loose", album: null }),
    ]);
    expect(groups[0].href).toBe(`/albums/${forestation.id}`);
    expect(groups[1].href).toBeNull();
  });

  it("returns nothing for an empty library", () => {
    expect(groupTracksByAlbum([])).toEqual([]);
  });
});
