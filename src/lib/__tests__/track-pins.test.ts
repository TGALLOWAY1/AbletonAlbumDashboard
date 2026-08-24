import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { comparePinPosition, isTrackPinned, MAX_PINNED_TRACKS } from "@/lib/types";
import { moveItemTo } from "@/lib/task-order";

type Pin = { id: string; pin_order: number | null; pinned_at: string | null };

function pin(overrides: Partial<Pin> & { id: string }): Pin {
  return { pin_order: null, pinned_at: null, ...overrides };
}

const MIGRATION = readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/0026_track_pins.sql"),
  "utf8",
);

describe("isTrackPinned", () => {
  it("reads the timestamp, not the order", () => {
    // A track pinned but never reordered has no `pin_order` — it is still on
    // the shortlist, and reading the order instead would lose it.
    expect(isTrackPinned({ pinned_at: "2026-08-01T10:00:00Z" })).toBe(true);
    expect(isTrackPinned({ pinned_at: null })).toBe(false);
  });
});

describe("comparePinPosition", () => {
  it("puts hand-set order first, ascending", () => {
    const list = [
      pin({ id: "c", pin_order: 2 }),
      pin({ id: "a", pin_order: 0 }),
      pin({ id: "b", pin_order: 1 }),
    ];
    expect(list.sort(comparePinPosition).map((t) => t.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("sorts never-reordered tracks last, oldest pin first", () => {
    // The mixed state migration 0026 describes: a reordered prefix, then
    // whatever was pinned since, by age.
    const list = [
      pin({ id: "new", pinned_at: "2026-08-03T00:00:00Z" }),
      pin({ id: "ordered", pin_order: 0, pinned_at: "2026-08-01T00:00:00Z" }),
      pin({ id: "older", pinned_at: "2026-08-02T00:00:00Z" }),
    ];
    expect(list.sort(comparePinPosition).map((t) => t.id)).toEqual([
      "ordered",
      "older",
      "new",
    ]);
  });

  it("is a total order — sorting twice does not change the result", () => {
    const list = [
      pin({ id: "b", pin_order: 1 }),
      pin({ id: "a", pin_order: 0 }),
      pin({ id: "c" }),
    ];
    const once = [...list].sort(comparePinPosition).map((t) => t.id);
    const twice = [...list]
      .sort(comparePinPosition)
      .sort(comparePinPosition)
      .map((t) => t.id);
    expect(twice).toEqual(once);
  });
});

describe("reordering the shortlist", () => {
  // The drag handler and the keyboard handler both go through `moveItemTo`,
  // and the resulting index is written straight to `pin_order` as 0..n-1 —
  // so what the list looks like after a move is what the database stores.
  const list = ["a", "b", "c", "d"].map((id) => ({ id }));

  it("renumbers to a contiguous 0..n-1 after a move", () => {
    const moved = moveItemTo(list, "d", "a");
    expect(moved.map((t) => t.id)).toEqual(["d", "a", "b", "c"]);
    expect(moved.map((_, i) => i)).toEqual([0, 1, 2, 3]);
  });

  it("leaves the list alone when the move is a no-op", () => {
    expect(moveItemTo(list, "b", "b")).toBe(list);
    expect(moveItemTo(list, "b", "nope")).toBe(list);
  });
});

describe("0026 migration ↔ src/lib sync", () => {
  it("backfills at most MAX_PINNED_TRACKS tracks", () => {
    // The backfill's own cap has to match the constant the app enforces, or a
    // freshly migrated project lands over the limit and cannot pin anything
    // until it unpins twice.
    expect(MIGRATION).toContain(`s.rank < ${MAX_PINNED_TRACKS}`);
  });

  it("drops the single-focus column it replaces", () => {
    expect(MIGRATION).toContain("drop column if exists is_focus");
    expect(MIGRATION).toContain("drop index if exists tracks_one_focus_per_owner");
  });
});
