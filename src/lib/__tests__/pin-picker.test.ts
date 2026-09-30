import { describe, expect, it } from "vitest";
import { filterPinPickerRows, orderPinPickerRows } from "@/lib/pin-picker";

const track = (id: string, status = "active") => ({ id, name: id, status });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

// `listTrackOptions` order: most recently worked first.
const OPTIONS = [
  track("recent"),
  track("pinned-second"),
  track("finished", "completed"),
  track("shelved", "backlog"),
  track("pinned-first"),
  track("old"),
];

describe("orderPinPickerRows", () => {
  it("lists the shortlist first, in priority order, then the rest as given", () => {
    expect(
      ids(orderPinPickerRows(OPTIONS, ["pinned-first", "pinned-second"])),
    ).toEqual(["pinned-first", "pinned-second", "recent", "shelved", "old"]);
  });

  it("never offers a track the server would refuse to pin", () => {
    // `setTrackPinned` rejects completed and archived tracks; listing them
    // with a live Pin button would be a click that can only fail.
    expect(ids(orderPinPickerRows(OPTIONS, []))).not.toContain("finished");
  });

  it("keeps a pinned track's row whatever its status", () => {
    // Belt and braces — `setTrackStatus` unpins on complete — but if one ever
    // slips through, the dialog is where it can be unpinned.
    expect(ids(orderPinPickerRows(OPTIONS, ["finished"]))).toEqual([
      "finished",
      "recent",
      "pinned-second",
      "shelved",
      "pinned-first",
      "old",
    ]);
  });

  it("skips a pinned id with no matching option", () => {
    expect(ids(orderPinPickerRows(OPTIONS, ["gone", "old"]))).toEqual([
      "old",
      "recent",
      "pinned-second",
      "shelved",
      "pinned-first",
    ]);
  });
});

describe("filterPinPickerRows", () => {
  const rows = [
    { name: "Tribal Wobble" },
    { name: "Wobble Bass Test" },
    { name: "Triple M" },
  ];

  it("matches anywhere in the name, case-insensitively", () => {
    expect(filterPinPickerRows(rows, "wobble").map((r) => r.name)).toEqual([
      "Tribal Wobble",
      "Wobble Bass Test",
    ]);
  });

  it("treats a blank query as no filter", () => {
    expect(filterPinPickerRows(rows, "   ")).toEqual(rows);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterPinPickerRows(rows, "zzz")).toEqual([]);
  });
});
