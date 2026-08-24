import { describe, expect, it } from "vitest";
import {
  buildTrackPickerOptions,
  clampHighlight,
  filterTrackOptions,
  nextHighlight,
  NO_HIGHLIGHT,
  NO_TRACK_OPTION_KEY,
  TRACK_PICKER_BROWSE_LIMIT,
  TRACK_PICKER_SEARCH_LIMIT,
} from "@/lib/track-picker";

const track = (name: string) => ({ id: name, name, status: "active" });
const names = (rows: { name: string }[]) => rows.map((r) => r.name);

const LIBRARY = [
  track("I Don't Need It"),
  track("Put Me In Your Mind"),
  track("Caught in a shadow"),
  track("Tribal Wobble"),
  track("Of The Trees Inspired"),
  track("Night Drive"),
  track("Shadow Play"),
  track("Wobble Bass Test"),
];

describe("filterTrackOptions", () => {
  it("shows a short browse list when there is no query", () => {
    expect(filterTrackOptions(LIBRARY, "")).toHaveLength(
      TRACK_PICKER_BROWSE_LIMIT,
    );
  });

  it("treats whitespace as no query", () => {
    expect(names(filterTrackOptions(LIBRARY, "   "))).toEqual(
      names(filterTrackOptions(LIBRARY, "")),
    );
  });

  it("matches anywhere in the name, case-insensitively", () => {
    expect(names(filterTrackOptions(LIBRARY, "wobble"))).toEqual([
      "Tribal Wobble",
      "Wobble Bass Test",
    ]);
  });

  it("allows a longer list once the user has searched", () => {
    const many = Array.from({ length: 20 }, (_, i) => track(`Take ${i}`));
    expect(filterTrackOptions(many, "take")).toHaveLength(
      TRACK_PICKER_SEARCH_LIMIT,
    );
  });

  it("returns nothing when a query matches nothing", () => {
    expect(filterTrackOptions(LIBRARY, "zzz")).toEqual([]);
  });
});

describe("nextHighlight", () => {
  it("enters the list at the top on ArrowDown", () => {
    expect(nextHighlight(3, NO_HIGHLIGHT, 1)).toBe(0);
  });

  it("enters the list at the bottom on ArrowUp", () => {
    expect(nextHighlight(3, NO_HIGHLIGHT, -1)).toBe(2);
  });

  it("steps through the list", () => {
    expect(nextHighlight(3, 0, 1)).toBe(1);
    expect(nextHighlight(3, 2, -1)).toBe(1);
  });

  it("wraps at both ends", () => {
    expect(nextHighlight(3, 2, 1)).toBe(0);
    expect(nextHighlight(3, 0, -1)).toBe(2);
  });

  it("has nowhere to go in an empty list", () => {
    expect(nextHighlight(0, NO_HIGHLIGHT, 1)).toBe(NO_HIGHLIGHT);
    expect(nextHighlight(0, 2, -1)).toBe(NO_HIGHLIGHT);
  });
});

describe("clampHighlight", () => {
  it("keeps a highlight that is still in range", () => {
    expect(clampHighlight(4, 2)).toBe(2);
  });

  it("drops a highlight the shrinking list left behind", () => {
    expect(clampHighlight(2, 5)).toBe(NO_HIGHLIGHT);
  });

  it("drops every highlight when the list empties", () => {
    expect(clampHighlight(0, 0)).toBe(NO_HIGHLIGHT);
  });

  it("leaves an untouched field untouched", () => {
    expect(clampHighlight(4, NO_HIGHLIGHT)).toBe(NO_HIGHLIGHT);
  });
});

describe("buildTrackPickerOptions", () => {
  const three = LIBRARY.slice(0, 3);

  it("offers the no-track row last when the field is optional", () => {
    const options = buildTrackPickerOptions(three, true);
    expect(options).toHaveLength(4);
    expect(options[3]).toMatchObject({
      key: NO_TRACK_OPTION_KEY,
      trackId: null,
      track: null,
    });
  });

  it("keeps the no-track row reachable by keyboard — it is a real option", () => {
    const options = buildTrackPickerOptions(three, true);
    // ArrowUp from an untouched field lands on it, ArrowDown wraps onto it.
    expect(nextHighlight(options.length, NO_HIGHLIGHT, -1)).toBe(3);
    expect(nextHighlight(options.length, 2, 1)).toBe(3);
    expect(options[3].trackId).toBeNull();
  });

  it("still offers it when no track matches the query", () => {
    const options = buildTrackPickerOptions([], true);
    expect(options.map((o) => o.key)).toEqual([NO_TRACK_OPTION_KEY]);
  });

  it("omits it when a track is required", () => {
    const options = buildTrackPickerOptions(three, false);
    expect(options).toHaveLength(3);
    expect(options.every((o) => o.trackId !== null)).toBe(true);
  });

  it("has nothing to highlight when a required field matches nothing", () => {
    const options = buildTrackPickerOptions([], false);
    expect(options).toEqual([]);
    expect(nextHighlight(options.length, NO_HIGHLIGHT, 1)).toBe(NO_HIGHLIGHT);
  });

  it("carries each track through so the row can draw it", () => {
    expect(buildTrackPickerOptions(three, true)[0]).toMatchObject({
      key: three[0].id,
      trackId: three[0].id,
      track: three[0],
    });
  });
});
