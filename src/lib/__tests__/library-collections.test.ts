import { describe, expect, it } from "vitest";
import {
  collectionsContaining,
  reorderPositions,
  resolveCollectionItems,
  type LibraryCollection,
  type LoopStack,
  type Preset,
} from "@/lib/data/library";

const stack: LoopStack = {
  id: "s1",
  name: "Neon Glide",
  favorite: false,
  notes: "",
  components: [],
  createdAt: "",
  updatedAt: "",
};

const preset: Preset = {
  id: "p1",
  name: "Grit Sub 02",
  category: "Bass",
  favorite: false,
  core: false,
  notes: "",
  createdAt: "",
  updatedAt: "",
};

describe("resolveCollectionItems", () => {
  it("returns assets in stored position order regardless of array order", () => {
    const collection = {
      items: [
        { itemId: "i2", type: "preset" as const, id: "p1", position: 1 },
        { itemId: "i1", type: "loopStack" as const, id: "s1", position: 0 },
      ],
    };
    const resolved = resolveCollectionItems(collection, [stack], [preset]);
    expect(resolved.map((r) => r.itemId)).toEqual(["i1", "i2"]);
    expect(resolved[0].type).toBe("loopStack");
    expect(resolved[1].asset.name).toBe("Grit Sub 02");
  });

  it("drops references whose asset has been deleted", () => {
    const collection = {
      items: [
        { itemId: "i1", type: "loopStack" as const, id: "s1", position: 0 },
        { itemId: "i2", type: "preset" as const, id: "gone", position: 1 },
        { itemId: "i3", type: "loopStack" as const, id: "also-gone", position: 2 },
      ],
    };
    const resolved = resolveCollectionItems(collection, [stack], [preset]);
    expect(resolved.map((r) => r.itemId)).toEqual(["i1"]);
  });

  it("does not confuse a loop stack and a preset that share an id", () => {
    const twin: Preset = { ...preset, id: "s1", name: "Twin Preset" };
    const collection = {
      items: [{ itemId: "i1", type: "preset" as const, id: "s1", position: 0 }],
    };
    const resolved = resolveCollectionItems(collection, [stack], [twin]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].asset.name).toBe("Twin Preset");
  });

  it("returns an empty list for an empty collection", () => {
    expect(resolveCollectionItems({ items: [] }, [stack], [preset])).toEqual([]);
  });
});

describe("reorderPositions", () => {
  const items = [{ itemId: "a" }, { itemId: "b" }, { itemId: "c" }];

  it("swaps an item with the one above it", () => {
    expect(reorderPositions(items, "b", "up")).toEqual([
      { itemId: "b", position: 0 },
      { itemId: "a", position: 1 },
      { itemId: "c", position: 2 },
    ]);
  });

  it("swaps an item with the one below it", () => {
    expect(reorderPositions(items, "b", "down")).toEqual([
      { itemId: "a", position: 0 },
      { itemId: "c", position: 1 },
      { itemId: "b", position: 2 },
    ]);
  });

  it("is a no-op at the boundaries", () => {
    const unchanged = [
      { itemId: "a", position: 0 },
      { itemId: "b", position: 1 },
      { itemId: "c", position: 2 },
    ];
    expect(reorderPositions(items, "a", "up")).toEqual(unchanged);
    expect(reorderPositions(items, "c", "down")).toEqual(unchanged);
  });

  it("normalises positions for an unknown id instead of throwing", () => {
    expect(reorderPositions(items, "nope", "up")).toEqual([
      { itemId: "a", position: 0 },
      { itemId: "b", position: 1 },
      { itemId: "c", position: 2 },
    ]);
  });

  it("renumbers contiguously from zero, so gaps in stored positions heal", () => {
    const gappy = [{ itemId: "a" }, { itemId: "b" }, { itemId: "c" }];
    const moved = reorderPositions(gappy, "c", "up");
    expect(moved.map((m) => m.position)).toEqual([0, 1, 2]);
    expect(moved.map((m) => m.itemId)).toEqual(["a", "c", "b"]);
  });
});

describe("collectionsContaining", () => {
  const collections: LibraryCollection[] = [
    {
      id: "c1",
      name: "Heavy Bass",
      items: [{ itemId: "i1", type: "preset", id: "p1", position: 0 }],
      position: 0,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "c2",
      name: "Feel Good",
      items: [{ itemId: "i2", type: "loopStack", id: "s1", position: 0 }],
      position: 1,
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("finds every collection holding the asset", () => {
    expect(collectionsContaining(collections, "p1").map((c) => c.id)).toEqual([
      "c1",
    ]);
    expect(collectionsContaining(collections, "nope")).toEqual([]);
  });
});
