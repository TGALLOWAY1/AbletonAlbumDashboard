import { describe, expect, it } from "vitest";
import { mergeVisibleTrackOrder } from "@/lib/track-order";

describe("mergeVisibleTrackOrder", () => {
  it("reorders a complete status group", () => {
    expect(
      mergeVisibleTrackOrder(["a", "b", "c"], ["c", "a", "b"]),
    ).toEqual(["c", "a", "b"]);
  });

  it("keeps filtered-out tracks in their existing slots", () => {
    expect(
      mergeVisibleTrackOrder(
        ["priority", "hidden-1", "later", "hidden-2"],
        ["later", "priority"],
      ),
    ).toEqual(["later", "hidden-1", "priority", "hidden-2"]);
  });
});
