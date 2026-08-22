import { describe, expect, it } from "vitest";
import type { TemplateItem } from "@/lib/data/templates";
import { compareTemplates, type TemplateSort } from "@/lib/template-sort";
import {
  parseTemplateValues,
  withTemplateValue,
} from "@/lib/template-value";

describe("parseTemplateValues", () => {
  it("returns an empty map when nothing is stored", () => {
    expect(parseTemplateValues(null)).toEqual({});
    expect(parseTemplateValues("")).toEqual({});
  });

  it("reads whole 1-5 ratings", () => {
    expect(parseTemplateValues('{"tpl-a":1,"tpl-b":5}')).toEqual({
      "tpl-a": 1,
      "tpl-b": 5,
    });
  });

  it("drops entries outside the scale or of the wrong shape", () => {
    expect(
      parseTemplateValues('{"a":0,"b":6,"c":3.5,"d":"4","e":null,"f":4}'),
    ).toEqual({ f: 4 });
  });

  it("survives malformed or non-object JSON", () => {
    expect(parseTemplateValues("{not json")).toEqual({});
    expect(parseTemplateValues("[1,2,3]")).toEqual({});
    expect(parseTemplateValues("null")).toEqual({});
  });
});

describe("withTemplateValue", () => {
  it("sets a rating without mutating the input", () => {
    const values = { "tpl-a": 2 };
    expect(withTemplateValue(values, "tpl-b", 5)).toEqual({
      "tpl-a": 2,
      "tpl-b": 5,
    });
    expect(values).toEqual({ "tpl-a": 2 });
  });

  it("overwrites an existing rating", () => {
    expect(withTemplateValue({ "tpl-a": 2 }, "tpl-a", 4)).toEqual({
      "tpl-a": 4,
    });
  });

  it("clears the rating on null", () => {
    expect(withTemplateValue({ "tpl-a": 2, "tpl-b": 3 }, "tpl-a", null)).toEqual(
      { "tpl-b": 3 },
    );
  });

  it("ignores out-of-scale values rather than storing them", () => {
    expect(withTemplateValue({ "tpl-a": 2 }, "tpl-a", 9)).toEqual({});
  });
});

function template(
  id: string,
  overrides: Partial<TemplateItem> = {},
): TemplateItem {
  return {
    id,
    name: id,
    category: "mixing",
    description: "",
    filePath: "",
    folderPath: "",
    tags: [],
    audioPreviews: [],
    notes: "",
    useCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function sortNames(
  items: TemplateItem[],
  sort: TemplateSort,
  values?: Record<string, number>,
): string[] {
  return [...items]
    .sort((a, b) => compareTemplates(a, b, sort, values))
    .map((t) => t.name);
}

describe("compareTemplates: highest-value", () => {
  const items = [
    template("a", { name: "Alpha" }),
    template("b", { name: "Bravo" }),
    template("c", { name: "Charlie" }),
  ];

  it("puts the highest-rated template first", () => {
    expect(sortNames(items, "highest-value", { a: 3, b: 5, c: 1 })).toEqual([
      "Bravo",
      "Alpha",
      "Charlie",
    ]);
  });

  it("sinks unrated templates below rated ones", () => {
    expect(sortNames(items, "highest-value", { c: 2 })).toEqual([
      "Charlie",
      "Alpha",
      "Bravo",
    ]);
  });

  it("breaks ties by name, and falls back to name with no ratings at all", () => {
    expect(sortNames(items, "highest-value", { b: 4, a: 4 })).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
    expect(sortNames(items, "highest-value")).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });
});

describe("compareTemplates: other sorts ignore ratings", () => {
  const items = [
    template("a", {
      name: "Alpha",
      useCount: 1,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-03-01T00:00:00.000Z",
    }),
    template("b", {
      name: "Bravo",
      useCount: 9,
      createdAt: "2024-02-01T00:00:00.000Z",
      updatedAt: "2024-01-15T00:00:00.000Z",
    }),
  ];
  const values = { a: 1, b: 5 };

  it("sorts by recency and use count regardless of value", () => {
    expect(sortNames(items, "recently-modified", values)).toEqual([
      "Alpha",
      "Bravo",
    ]);
    expect(sortNames(items, "recently-created", values)).toEqual([
      "Bravo",
      "Alpha",
    ]);
    expect(sortNames(items, "most-used", values)).toEqual(["Bravo", "Alpha"]);
  });

  it("sorts by category order, then name", () => {
    const mixed = [
      template("m", { name: "Mix", category: "mixing" }),
      template("s", { name: "Sound", category: "sound-design" }),
      template("s2", { name: "Another Sound", category: "sound-design" }),
    ];
    expect(sortNames(mixed, "category")).toEqual([
      "Another Sound",
      "Sound",
      "Mix",
    ]);
  });
});
