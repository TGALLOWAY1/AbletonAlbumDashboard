import { describe, expect, it } from "vitest";
import {
  canSelectSessionType,
  resolveTrackSelection,
  shouldReseedGoal,
} from "@/lib/focus-runner";

describe("canSelectSessionType", () => {
  it("allows a type that does not require a track, with or without one", () => {
    expect(canSelectSessionType({ requires_track: false }, null)).toBe(true);
    expect(canSelectSessionType({ requires_track: false }, "t1")).toBe(true);
  });

  it("allows a requires_track type once a track is attached", () => {
    expect(canSelectSessionType({ requires_track: true }, "t1")).toBe(true);
  });

  it("blocks a requires_track type with no track attached", () => {
    expect(canSelectSessionType({ requires_track: true }, null)).toBe(false);
  });
});

describe("resolveTrackSelection", () => {
  it("routes to the track's focus page when a track is picked", () => {
    expect(
      resolveTrackSelection({
        nextTrackId: "t1",
        sessionTypeRequiresTrack: false,
      }),
    ).toEqual({ allowed: true, path: "/focus/t1" });
  });

  it("routes to /focus/new when the track is cleared and nothing requires one", () => {
    expect(
      resolveTrackSelection({
        nextTrackId: null,
        sessionTypeRequiresTrack: false,
      }),
    ).toEqual({ allowed: true, path: "/focus/new" });
  });

  it("picking a track is never blocked, even for a requires_track type", () => {
    expect(
      resolveTrackSelection({
        nextTrackId: "t1",
        sessionTypeRequiresTrack: true,
      }),
    ).toEqual({ allowed: true, path: "/focus/t1" });
  });

  it("refuses to clear the track when the current type requires one", () => {
    const result = resolveTrackSelection({
      nextTrackId: null,
      sessionTypeRequiresTrack: true,
      sessionTypeName: "Mixing",
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain("Mixing");
    }
  });

  it("falls back to a generic name when none is given", () => {
    const result = resolveTrackSelection({
      nextTrackId: null,
      sessionTypeRequiresTrack: true,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain("This session type");
    }
  });
});

describe("shouldReseedGoal", () => {
  it("reseeds when the track changes and the goal is untouched", () => {
    expect(
      shouldReseedGoal({ trackId: "t2", goalTrackId: "t1", goalEdited: false }),
    ).toBe(true);
  });

  it("does not reseed when the track is unchanged", () => {
    expect(
      shouldReseedGoal({ trackId: "t1", goalTrackId: "t1", goalEdited: false }),
    ).toBe(false);
  });

  it("never reseeds once the user has edited the goal, even after a track change", () => {
    expect(
      shouldReseedGoal({ trackId: "t2", goalTrackId: "t1", goalEdited: true }),
    ).toBe(false);
  });

  it("reseeds from a track-less session onto a track, and back", () => {
    expect(
      shouldReseedGoal({ trackId: "t1", goalTrackId: null, goalEdited: false }),
    ).toBe(true);
    expect(
      shouldReseedGoal({ trackId: null, goalTrackId: "t1", goalEdited: false }),
    ).toBe(true);
  });
});
