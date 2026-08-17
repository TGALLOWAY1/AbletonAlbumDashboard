import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_FILTERS,
  buildCollectionMembership,
  filterLoopStacks,
  filterPresets,
  loopStackMatches,
  presetMatches,
  usedPresetCategories,
  type LibraryCollection,
  type LoopStack,
  type Preset,
} from "@/lib/data/library";

function stack(overrides: Partial<LoopStack> & { id: string; name: string }): LoopStack {
  return {
    favorite: false,
    notes: "",
    components: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function preset(
  overrides: Partial<Preset> & { id: string; name: string },
): Preset {
  return {
    category: "Other",
    favorite: false,
    core: false,
    notes: "",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const neonGlide = stack({
  id: "s1",
  name: "Neon Glide",
  key: "C minor",
  bpm: 95,
  bars: 8,
  sourceProject: "Midnight EP",
});
const lateNight = stack({ id: "s2", name: "Late Night", key: "F# major" });

const gritSub = preset({
  id: "p1",
  name: "Grit Sub 02",
  plugin: "Serum 2",
  category: "Bass",
  sourceProject: "Midnight EP",
});
const glassChords = preset({
  id: "p2",
  name: "Glass Chords",
  plugin: "Phase Plant",
  category: "Chords",
});
const echoPad = preset({ id: "p3", name: "Echo Pad", category: "Pad", core: true });

describe("search matching", () => {
  it("matches a loop stack on name, key and source project", () => {
    expect(loopStackMatches(neonGlide, "neon")).toBe(true);
    expect(loopStackMatches(neonGlide, "c minor")).toBe(true);
    expect(loopStackMatches(neonGlide, "midnight")).toBe(true);
    expect(loopStackMatches(neonGlide, "velvet")).toBe(false);
  });

  it("matches a preset on name, plugin and category", () => {
    expect(presetMatches(gritSub, "grit")).toBe(true);
    expect(presetMatches(gritSub, "serum")).toBe(true);
    expect(presetMatches(gritSub, "bass")).toBe(true);
    expect(presetMatches(gritSub, "pad")).toBe(false);
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(presetMatches(glassChords, "  GLASS  ")).toBe(true);
  });

  it("treats an empty query as matching everything", () => {
    expect(presetMatches(gritSub, "")).toBe(true);
    expect(presetMatches(gritSub, "   ")).toBe(true);
  });

  it("matches on collection membership", () => {
    const collections: LibraryCollection[] = [
      {
        id: "c1",
        name: "Heavy Bass",
        items: [
          { itemId: "i1", type: "preset", id: "p1", position: 0 },
          { itemId: "i2", type: "loopStack", id: "s1", position: 1 },
        ],
        position: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    const membership = buildCollectionMembership(collections);

    expect(presetMatches(gritSub, "heavy bass", membership)).toBe(true);
    expect(loopStackMatches(neonGlide, "heavy bass", membership)).toBe(true);
    // Not a member, so the collection name must not pull it in.
    expect(presetMatches(glassChords, "heavy bass", membership)).toBe(false);
    // Without the membership map the same query finds nothing.
    expect(presetMatches(gritSub, "heavy bass")).toBe(false);
  });

  it("collects every collection an asset belongs to", () => {
    const membership = buildCollectionMembership([
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
        name: "Current Favorites",
        items: [{ itemId: "i2", type: "preset", id: "p1", position: 0 }],
        position: 1,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    expect(membership.get("p1")).toEqual(["Heavy Bass", "Current Favorites"]);
  });
});

describe("filterPresets", () => {
  const all = [gritSub, glassChords, echoPad];

  it("narrows to a single category and leaves All alone", () => {
    expect(
      filterPresets(all, { ...DEFAULT_LIBRARY_FILTERS, category: "Bass" }).map(
        (p) => p.id,
      ),
    ).toEqual(["p1"]);
    expect(
      filterPresets(all, { ...DEFAULT_LIBRARY_FILTERS, category: "All" }),
    ).toHaveLength(3);
    expect(filterPresets(all, DEFAULT_LIBRARY_FILTERS)).toHaveLength(3);
  });

  it("combines category and query", () => {
    expect(
      filterPresets(all, {
        ...DEFAULT_LIBRARY_FILTERS,
        category: "Bass",
        query: "glass",
      }),
    ).toEqual([]);
  });

  it("filters to favorites and to Core independently", () => {
    const favorited = [{ ...gritSub, favorite: true }, glassChords, echoPad];
    expect(
      filterPresets(favorited, {
        ...DEFAULT_LIBRARY_FILTERS,
        favoritesOnly: true,
      }).map((p) => p.id),
    ).toEqual(["p1"]);
    expect(
      filterPresets(all, { ...DEFAULT_LIBRARY_FILTERS, coreOnly: true }).map(
        (p) => p.id,
      ),
    ).toEqual(["p3"]);
  });

  it("sorts by name when asked, and floats favorites above everything", () => {
    const byName = filterPresets(all, {
      ...DEFAULT_LIBRARY_FILTERS,
      sort: "name",
    });
    expect(byName.map((p) => p.name)).toEqual([
      "Echo Pad",
      "Glass Chords",
      "Grit Sub 02",
    ]);

    const withFavorite = filterPresets(
      [gritSub, glassChords, { ...echoPad, favorite: true }],
      { ...DEFAULT_LIBRARY_FILTERS, sort: "name" },
    );
    expect(withFavorite[0].name).toBe("Echo Pad");
  });

  it("sorts by most recent capture by default", () => {
    const older = preset({
      id: "p9",
      name: "Aardvark",
      createdAt: "2025-01-01T00:00:00Z",
    });
    const newer = preset({
      id: "p8",
      name: "Zebra",
      createdAt: "2026-06-01T00:00:00Z",
    });
    expect(
      filterPresets([older, newer], DEFAULT_LIBRARY_FILTERS).map((p) => p.id),
    ).toEqual(["p8", "p9"]);
  });

  it("reports only the categories that actually have presets", () => {
    expect(usedPresetCategories(all)).toEqual(["Bass", "Chords", "Pad"]);
    expect(usedPresetCategories([])).toEqual([]);
  });
});

describe("filterLoopStacks", () => {
  it("filters by query and favorites, and never sees preset-only fields", () => {
    const all = [neonGlide, lateNight];
    expect(
      filterLoopStacks(all, { ...DEFAULT_LIBRARY_FILTERS, query: "late" }).map(
        (s) => s.id,
      ),
    ).toEqual(["s2"]);
    expect(
      filterLoopStacks([{ ...neonGlide, favorite: true }, lateNight], {
        ...DEFAULT_LIBRARY_FILTERS,
        favoritesOnly: true,
      }).map((s) => s.id),
    ).toEqual(["s1"]);
  });

  it("does not mutate the array it is given", () => {
    const all = [neonGlide, lateNight];
    filterLoopStacks(all, { ...DEFAULT_LIBRARY_FILTERS, sort: "name" });
    expect(all.map((s) => s.id)).toEqual(["s1", "s2"]);
  });
});
