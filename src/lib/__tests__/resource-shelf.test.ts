import { describe, expect, it } from "vitest";
import {
  MAX_PINNED_RESOURCES,
  activeResources,
  averageRating,
  isResourceRating,
  learnedInRange,
  learnedResources,
  learningDayMap,
  learningsByCategory,
  pinnedResources,
  readRating,
} from "@/lib/resource-shelf";
import { toDayKey } from "@/lib/analytics";
import type { ResourceCategoryId, ResourceItem } from "@/lib/data/resources";

function resource(
  id: string,
  patch: Partial<ResourceItem> = {},
): ResourceItem {
  return {
    id,
    title: id,
    description: "",
    type: "article",
    categoryId: "production-guides",
    sourceKind: "markdown",
    content: "# hi",
    readMinutes: 5,
    tags: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

/** Local midnight on a given day, as the ISO string a write would store. */
function archivedOn(year: number, month: number, date: number): string {
  return new Date(year, month, date, 12, 0, 0).toISOString();
}

describe("readRating", () => {
  it("keeps the five real values", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(readRating(value)).toBe(value);
      expect(isResourceRating(value)).toBe(true);
    }
  });

  it("reads anything else as unrated rather than clamping it", () => {
    // Clamping would invent a judgement the user never made — and 0 is not
    // "one star", it is "no stars at all".
    for (const value of [0, 6, -1, 2.5, null, undefined, "3", NaN]) {
      expect(readRating(value)).toBeNull();
    }
  });
});

describe("activeResources / learnedResources", () => {
  const items = [
    resource("a"),
    resource("b", { archivedAt: archivedOn(2026, 7, 10) }),
    resource("c", { archivedAt: archivedOn(2026, 7, 20) }),
  ];

  it("splits the library at the archive line, with nothing in both", () => {
    expect(activeResources(items).map((i) => i.id)).toEqual(["a"]);
    expect(learnedResources(items).map((i) => i.id).sort()).toEqual(["b", "c"]);
  });

  it("keeps the caller's order in the active half", () => {
    const ordered = [resource("z"), resource("y"), resource("x")];
    expect(activeResources(ordered).map((i) => i.id)).toEqual(["z", "y", "x"]);
  });

  it("puts the most recently learned first — an archive is a log", () => {
    expect(learnedResources(items).map((i) => i.id)).toEqual(["c", "b"]);
  });
});

describe("pinnedResources", () => {
  it("orders by the pin itself, first pinned first", () => {
    const items = [
      resource("second", { pinnedAt: "2026-08-02T00:00:00.000Z" }),
      resource("first", { pinnedAt: "2026-08-01T00:00:00.000Z" }),
      resource("third", { pinnedAt: "2026-08-03T00:00:00.000Z" }),
    ];
    expect(pinnedResources(items).map((i) => i.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("leaves unpinned resources off the shelf", () => {
    expect(pinnedResources([resource("a"), resource("b")])).toEqual([]);
  });

  it("never shows a resource on two shelves at once", () => {
    // setResourceArchived clears the pin, so this row should not exist — but
    // if one ever does, the learned shelf owns it, not the poster wall.
    const both = resource("both", {
      pinnedAt: "2026-08-01T00:00:00.000Z",
      archivedAt: archivedOn(2026, 7, 10),
    });
    expect(pinnedResources([both])).toEqual([]);
    expect(learnedResources([both]).map((i) => i.id)).toEqual(["both"]);
  });

  it("stops at the cap even if the database somehow holds more", () => {
    const many = Array.from({ length: MAX_PINNED_RESOURCES + 4 }, (_, i) =>
      resource(`r${i}`, {
        pinnedAt: new Date(2026, 7, 1, i).toISOString(),
      }),
    );
    expect(pinnedResources(many)).toHaveLength(MAX_PINNED_RESOURCES);
  });
});

describe("learningDayMap", () => {
  it("counts archives per local calendar day", () => {
    const map = learningDayMap([
      resource("a", { archivedAt: archivedOn(2026, 7, 20) }),
      resource("b", { archivedAt: archivedOn(2026, 7, 20) }),
      resource("c", { archivedAt: archivedOn(2026, 7, 21) }),
    ]);

    expect(map.get(toDayKey(new Date(2026, 7, 20)))).toBe(2);
    expect(map.get(toDayKey(new Date(2026, 7, 21)))).toBe(1);
    expect(map.size).toBe(2);
  });

  it("ignores un-archived rows — the counter is derived, not stored", () => {
    expect(learningDayMap([resource("a"), resource("b")]).size).toBe(0);
  });

  it("skips an unparseable timestamp rather than bucketing it under NaN", () => {
    const map = learningDayMap([
      resource("bad", { archivedAt: "not a date" }),
      resource("good", { archivedAt: archivedOn(2026, 7, 20) }),
    ]);
    expect(map.size).toBe(1);
    expect(map.get(toDayKey(new Date(2026, 7, 20)))).toBe(1);
  });
});

describe("learnedInRange", () => {
  const items = [
    resource("before", { archivedAt: archivedOn(2026, 6, 1) }),
    resource("inside", { archivedAt: archivedOn(2026, 7, 15) }),
    resource("after", { archivedAt: archivedOn(2026, 8, 1) }),
    resource("never"),
  ];

  it("keeps only the archives whose day falls inside the window", () => {
    const kept = learnedInRange(
      items,
      new Date(2026, 7, 1),
      new Date(2026, 7, 31, 23, 59, 59),
    );
    expect(kept.map((i) => i.id)).toEqual(["inside"]);
  });
});

describe("learningsByCategory", () => {
  const items = [
    resource("a", {
      categoryId: "sound-design",
      archivedAt: archivedOn(2026, 7, 20),
    }),
    resource("b", {
      categoryId: "sound-design",
      archivedAt: archivedOn(2026, 7, 21),
    }),
    resource("c", {
      categoryId: "mixing-mastering",
      archivedAt: archivedOn(2026, 7, 21),
    }),
    resource("d", { categoryId: "tools-plugins" }),
  ];

  it("returns the heaviest category first, with its own day map", () => {
    const [first, second, ...rest] = learningsByCategory(items);

    expect(first).toMatchObject({ categoryId: "sound-design", count: 2 });
    expect(second).toMatchObject({ categoryId: "mixing-mastering", count: 1 });
    expect(rest).toEqual([]);
    expect(first.dailyMap.get(toDayKey(new Date(2026, 7, 20)))).toBe(1);
  });

  it("leaves out categories with nothing learned in them", () => {
    const ids = learningsByCategory(items).map((e) => e.categoryId);
    expect(ids).not.toContain<ResourceCategoryId>("tools-plugins");
  });

  it("breaks a tie by category id, so the order never flickers", () => {
    const tied = [
      resource("x", {
        categoryId: "workflow-mindset",
        archivedAt: archivedOn(2026, 7, 20),
      }),
      resource("y", {
        categoryId: "file-organization",
        archivedAt: archivedOn(2026, 7, 20),
      }),
    ];
    expect(learningsByCategory(tied).map((e) => e.categoryId)).toEqual([
      "file-organization",
      "workflow-mindset",
    ]);
  });
});

describe("averageRating", () => {
  it("averages only what is actually rated", () => {
    expect(
      averageRating([
        resource("a", { rating: 5 }),
        resource("b", { rating: 3 }),
        resource("c"),
      ]),
    ).toBe(4);
  });

  it("is null when nothing is rated, not zero", () => {
    expect(averageRating([resource("a"), resource("b")])).toBeNull();
  });
});
