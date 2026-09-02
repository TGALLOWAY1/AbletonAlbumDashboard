import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareTags,
  countResourceTags,
  filterResourcesByTags,
  formatTag,
  groupResourcesByTag,
  MAX_TAGS_PER_RESOURCE,
  MAX_TAG_LENGTH,
  normalizeTag,
  normalizeTags,
  parseTagInput,
  parseTagParam,
  RESOURCE_TAG_SUGGESTIONS,
  serializeTagParam,
  toggleTag,
  UNTAGGED_GROUP_LABEL,
} from "@/lib/resource-tags";
import { PRESET_CATEGORIES } from "@/lib/data/library";
import { SEED_RESOURCES } from "@/lib/data/resources";

function item(id: string, tags: string[]) {
  return { id, tags };
}

describe("normalizeTag", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeTag("  Bass ")).toBe("bass");
    expect(normalizeTag("Sound   Design")).toBe("sound design");
  });

  it("returns null for anything empty", () => {
    expect(normalizeTag("")).toBeNull();
    expect(normalizeTag("   ")).toBeNull();
    expect(normalizeTag(",")).toBeNull();
  });

  it("caps length and never leaves a trailing space behind the cut", () => {
    const long = normalizeTag("a".repeat(MAX_TAG_LENGTH + 20));
    expect(long).toHaveLength(MAX_TAG_LENGTH);
    // The slice lands mid-gap here; the trailing space must not be stored.
    const cut = normalizeTag(`${"a".repeat(MAX_TAG_LENGTH - 1)} bbbb`);
    expect(cut).toBe("a".repeat(MAX_TAG_LENGTH - 1));
  });
});

describe("normalizeTags", () => {
  it("drops empties and duplicates, keeping first-seen order", () => {
    expect(normalizeTags(["Pad", "", "  ", "pad", "FX"])).toEqual([
      "pad",
      "fx",
    ]);
  });

  it("survives null, undefined and non-strings", () => {
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags([null, undefined, "bass"])).toEqual(["bass"]);
  });

  it("caps how many tags one resource can carry", () => {
    const many = Array.from({ length: MAX_TAGS_PER_RESOURCE + 5 }, (_, i) => `t${i}`);
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS_PER_RESOURCE);
  });
});

describe("parseTagInput", () => {
  it("splits a free-text field on commas", () => {
    expect(parseTagInput("Bass, drums , ,pad")).toEqual([
      "bass",
      "drums",
      "pad",
    ]);
  });
});

describe("RESOURCE_TAG_SUGGESTIONS", () => {
  it("is already in storage form", () => {
    expect(normalizeTags([...RESOURCE_TAG_SUGGESTIONS])).toEqual([
      ...RESOURCE_TAG_SUGGESTIONS,
    ]);
  });

  it("speaks the library's own instrument vocabulary", () => {
    // A resource about pads and a preset filed under Pad must answer to the
    // same word, so every instrument-ish preset category is offered here.
    const presets = PRESET_CATEGORIES.map((c) => c.toLowerCase()).filter(
      (c) => c !== "other",
    );
    for (const preset of presets) {
      expect(RESOURCE_TAG_SUGGESTIONS).toContain(preset);
    }
  });

  it("adds the sound-design words a preset category has no name for", () => {
    for (const tag of ["vocals", "sampling", "synthesis", "modulation"]) {
      expect(RESOURCE_TAG_SUGGESTIONS).toContain(tag);
    }
  });
});

describe("formatTag", () => {
  it("capitalises for display", () => {
    expect(formatTag("bass")).toBe("Bass");
    expect(formatTag("sound design")).toBe("Sound Design");
  });

  it("keeps acronyms upper case", () => {
    expect(formatTag("fx")).toBe("FX");
    expect(formatTag("FX")).toBe("FX");
    expect(formatTag("midi")).toBe("MIDI");
  });

  it("is empty for an empty tag", () => {
    expect(formatTag("  ")).toBe("");
  });
});

describe("filterResourcesByTags", () => {
  const items = [
    item("a", ["bass", "fx"]),
    item("b", ["bass"]),
    item("c", []),
  ];

  it("returns everything when nothing is selected", () => {
    expect(filterResourcesByTags(items, []).map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ANDs the selection — a second tag narrows, it does not widen", () => {
    expect(filterResourcesByTags(items, ["bass"]).map((i) => i.id)).toEqual([
      "a",
      "b",
    ]);
    expect(
      filterResourcesByTags(items, ["bass", "fx"]).map((i) => i.id),
    ).toEqual(["a"]);
    expect(filterResourcesByTags(items, ["bass", "pad"])).toEqual([]);
  });

  it("normalises the selection it is handed", () => {
    expect(filterResourcesByTags(items, [" Bass "]).map((i) => i.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("does not mutate or alias the input list", () => {
    const out = filterResourcesByTags(items, []);
    expect(out).not.toBe(items);
  });
});

describe("groupResourcesByTag", () => {
  it("orders groups by the suggestion list, then alphabetically, untagged last", () => {
    const groups = groupResourcesByTag([
      item("a", ["zither"]),
      item("b", ["drums"]),
      item("c", ["bass"]),
      item("d", ["ambience"]),
      item("e", []),
    ]);
    expect(groups.map((g) => g.tag)).toEqual([
      "bass",
      "drums",
      "ambience",
      "zither",
      null,
    ]);
    expect(groups.at(-1)?.label).toBe(UNTAGGED_GROUP_LABEL);
  });

  it("puts a two-tag item in both groups", () => {
    const groups = groupResourcesByTag([item("a", ["pad", "texture"])]);
    expect(groups.map((g) => g.tag)).toEqual(["pad", "texture"]);
    expect(groups.every((g) => g.items[0].id === "a")).toBe(true);
  });

  it("labels each group for display", () => {
    const groups = groupResourcesByTag([item("a", ["fx"])]);
    expect(groups[0].label).toBe("FX");
  });

  it("omits the untagged group when everything carries a tag", () => {
    const groups = groupResourcesByTag([item("a", ["bass"])]);
    expect(groups.map((g) => g.tag)).toEqual(["bass"]);
  });

  it("has no groups at all for an empty list", () => {
    expect(groupResourcesByTag([])).toEqual([]);
  });
});

describe("countResourceTags", () => {
  it("counts each tag once per item, in group order", () => {
    expect(
      countResourceTags([
        item("a", ["fx", "bass"]),
        item("b", ["bass"]),
        item("c", []),
      ]),
    ).toEqual([
      { tag: "bass", count: 2 },
      { tag: "fx", count: 1 },
    ]);
  });
});

describe("compareTags", () => {
  it("ranks suggested words ahead of invented ones", () => {
    expect(compareTags("bass", "ambience")).toBeLessThan(0);
    expect(compareTags("ambience", "bass")).toBeGreaterThan(0);
    expect(compareTags("ambience", "zither")).toBeLessThan(0);
  });
});

describe("toggleTag", () => {
  it("adds what is missing and removes what is there", () => {
    expect(toggleTag(["bass"], "fx")).toEqual(["bass", "fx"]);
    expect(toggleTag(["bass", "fx"], "bass")).toEqual(["fx"]);
  });

  it("normalises before comparing, so a chip can't be added twice", () => {
    expect(toggleTag(["bass"], " Bass ")).toEqual([]);
  });

  it("ignores an empty tag", () => {
    expect(toggleTag(["bass"], "  ")).toEqual(["bass"]);
  });
});

describe("tag URL params", () => {
  it("round-trips a selection through ?tag=a&tag=b", () => {
    expect(serializeTagParam(["Bass", "fx"])).toBe("tag=bass&tag=fx");
    expect(parseTagParam(["bass", "fx"])).toEqual(["bass", "fx"]);
    expect(parseTagParam("bass")).toEqual(["bass"]);
    expect(parseTagParam(undefined)).toEqual([]);
  });

  it("serializes an empty selection to nothing at all", () => {
    expect(serializeTagParam([])).toBe("");
    expect(serializeTagParam(["  "])).toBe("");
  });
});

describe("seed resources", () => {
  it("carry normalised tags, so the demo shows grouping", () => {
    const tagged = SEED_RESOURCES.filter((r) => r.tags.length > 0);
    expect(tagged.length).toBeGreaterThan(SEED_RESOURCES.length / 2);
    for (const resource of SEED_RESOURCES) {
      expect(normalizeTags(resource.tags)).toEqual(resource.tags);
    }
  });
});

describe("0032 migration", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../../../supabase/migrations/0032_resource_tags.sql"),
    "utf8",
  );

  it("adds a defaulted, non-null array column so no backfill is needed", () => {
    expect(sql).toMatch(/add column if not exists tags text\[\]/);
    expect(sql).toMatch(/not null default '\{\}'/);
  });

  it("indexes tags for lookup", () => {
    expect(sql).toMatch(/using gin \(tags\)/);
  });

  it("puts no check constraint on tag values", () => {
    // Adding a word must never need a migration — that is the whole point.
    expect(sql).not.toMatch(/check \(/);
  });
});
