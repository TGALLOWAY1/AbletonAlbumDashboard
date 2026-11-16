import { describe, expect, it } from "vitest";
import { GRID_COLUMNS, collides } from "@/lib/dashboard/grid";
import {
  LAYOUT_VERSION,
  MAX_WIDGETS,
  addWidget,
  builtInLayout,
  canAddWidget,
  defaultLayout,
  duplicateWidget,
  layoutHref,
  layoutNameSchema,
  pickActiveLayout,
  readLayout,
  removeWidget,
  sameLayout,
  setWidgetConfig,
  setWidgetSize,
  type DashboardLayout,
  type SavedLayout,
} from "@/lib/dashboard/layout";
import {
  WIDGETS,
  WIDGET_SIZES,
  WIDGET_TYPES,
  matchingSize,
  readWidgetConfig,
  resolveWidgetType,
  widgetBounds,
  widgetDefinition,
} from "@/lib/dashboard/widgets";

function expectDrawable(layout: DashboardLayout) {
  expect(layout.version).toBe(LAYOUT_VERSION);
  const ids = layout.items.map((i) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const a of layout.items) {
    const bounds = widgetBounds(a.type);
    expect(a.w).toBeGreaterThanOrEqual(bounds.minW);
    expect(a.h).toBeGreaterThanOrEqual(bounds.minH);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x + a.w).toBeLessThanOrEqual(GRID_COLUMNS);
    expect(widgetDefinition(a.type).config.safeParse(a.config).success).toBe(true);
    for (const b of layout.items) expect(collides(a, b)).toBe(false);
  }
}

describe("the widget registry", () => {
  it.each(WIDGET_TYPES)("%s is well formed", (type) => {
    const def = widgetDefinition(type);
    expect(def.name.length).toBeGreaterThan(0);
    expect(def.description.length).toBeGreaterThan(20);
    expect(def.sizes.length).toBeGreaterThan(0);
    expect(def.sizes).toContain(def.defaultSize);
    // The defaults a new widget starts with must satisfy its own schema.
    expect(def.config.safeParse(def.defaultConfig).success).toBe(true);
    // Every settings field edits a key the schema actually has.
    const keys = Object.keys(def.defaultConfig as object);
    for (const field of def.fields) expect(keys).toContain(field.key);
  });

  it("has unique display names, so the gallery never lists two the same", () => {
    const names = WIDGET_TYPES.map((t) => WIDGETS[t].name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("derives the smallest box from the presets a widget offers", () => {
    expect(widgetBounds("quick-actions")).toEqual({ minW: 3, minH: 2 });
    expect(widgetBounds("pinned-tracks")).toEqual({ minW: 3, minH: 3 });
  });

  it("names the preset a box matches, or none", () => {
    const { w, h } = WIDGET_SIZES.wide;
    expect(matchingSize("current-track", w, h)).toBe("wide");
    expect(matchingSize("current-track", 5, 3)).toBeNull();
    // A preset the widget does not offer is not a match even at that size.
    expect(matchingSize("pinned-tracks", WIDGET_SIZES.small.w, WIDGET_SIZES.small.h)).toBeNull();
  });

  it("resolves only known types", () => {
    expect(resolveWidgetType("tasks")).toBe("tasks");
    expect(resolveWidgetType("my-spaces")).toBeNull();
    expect(resolveWidgetType("constructor")).toBeNull();
    expect(resolveWidgetType(42)).toBeNull();
  });

  it("reads bad settings back as the widget's defaults", () => {
    expect(readWidgetConfig("focus-timer", { minutes: "soon" })).toEqual({ minutes: 25 });
    expect(readWidgetConfig("focus-timer", null)).toEqual({ minutes: 25 });
    expect(readWidgetConfig("focus-timer", { minutes: 45 })).toEqual({ minutes: 45 });
    expect(readWidgetConfig("work-heatmap", { range: "forever" })).toEqual({ range: "30d" });
  });
});

describe("defaultLayout", () => {
  it("is drawable and uses every widget once", () => {
    const layout = defaultLayout();
    expectDrawable(layout);
    expect(layout.items.map((i) => i.type).sort()).toEqual([...WIDGET_TYPES].sort());
  });

  it("survives a round trip through storage unchanged", () => {
    const layout = defaultLayout();
    const { layout: reread, fallback } = readLayout(JSON.parse(JSON.stringify(layout)));
    expect(fallback).toBe(false);
    expect(sameLayout(reread, layout)).toBe(true);
  });

  it("leads with the shortcuts, the shortlist and the tasks on a phone", () => {
    expect(defaultLayout().order?.slice(0, 3)).toEqual([
      "quick-actions",
      "pinned-tracks",
      "tasks",
    ]);
  });

  it("names every widget in its phone order", () => {
    const layout = defaultLayout();
    expect([...(layout.order ?? [])].sort()).toEqual(layout.items.map((i) => i.id).sort());
  });
});

describe("readLayout — stored layouts are untrusted", () => {
  it.each([
    ["null", null],
    ["a number", 7],
    ["an array", []],
    ["an object with no items", { version: 1 }],
    ["unparseable text", "{not json"],
    ["a version from the future", { version: LAYOUT_VERSION + 1, items: [] }],
    ["a nonsense version", { version: -3, items: [] }],
  ])("falls back to the default for %s", (_label, raw) => {
    const { layout, fallback } = readLayout(raw);
    expect(fallback).toBe(true);
    expect(sameLayout(layout, defaultLayout())).toBe(true);
  });

  it("accepts the JSON text as well as the parsed value", () => {
    const { layout, fallback } = readLayout(JSON.stringify(defaultLayout()));
    expect(fallback).toBe(false);
    expect(layout.items).toHaveLength(defaultLayout().items.length);
  });

  it("keeps a deliberately empty dashboard empty", () => {
    const { layout, fallback } = readLayout({ version: 1, items: [], order: null });
    expect(fallback).toBe(false);
    expect(layout.items).toEqual([]);
  });

  it("drops widget types that no longer exist and keeps the rest", () => {
    const { layout, fallback } = readLayout({
      version: 1,
      items: [
        { id: "a", type: "my-spaces", x: 0, y: 0, w: 3, h: 3, config: {} },
        { id: "b", type: "tasks", x: 3, y: 0, w: 3, h: 4, config: { trackId: null } },
        "not an item",
        null,
      ],
      order: ["a", "b"],
    });
    expect(fallback).toBe(false);
    expect(layout.items.map((i) => i.id)).toEqual(["b"]);
    expect(layout.order).toEqual(["b"]);
    expectDrawable(layout);
  });

  it("keeps one copy of a widget that only makes sense once", () => {
    const { layout } = readLayout({
      version: 1,
      items: [
        { id: "a", type: "focus-timer", x: 0, y: 0, w: 3, h: 4, config: {} },
        { id: "b", type: "focus-timer", x: 3, y: 0, w: 3, h: 4, config: {} },
        { id: "c", type: "tasks", x: 6, y: 0, w: 3, h: 4, config: {} },
        { id: "d", type: "tasks", x: 9, y: 0, w: 3, h: 4, config: {} },
      ],
    });
    expect(layout.items.map((i) => i.id)).toEqual(["a", "c", "d"]);
  });

  it("repairs ids, boxes and settings rather than rejecting the layout", () => {
    const { layout, fallback } = readLayout({
      version: 1,
      items: [
        // Same id twice, overlapping, one off the right edge, one too small.
        { id: "x", type: "tasks", x: 0, y: 0, w: 6, h: 4, config: { trackId: "nope" } },
        { id: "x", type: "tasks", x: 2, y: 1, w: 6, h: 4 },
        { type: "work-heatmap", x: 40, y: -9, w: 1, h: 1, config: { range: "century" } },
        { id: "", type: "goals", x: "left", y: null, w: {}, h: [] },
      ],
    });
    expect(fallback).toBe(false);
    expect(layout.items).toHaveLength(4);
    expectDrawable(layout);
    expect(layout.items.find((i) => i.type === "work-heatmap")?.config).toEqual({
      range: "30d",
    });
  });

  it("caps how many widgets one layout can hold", () => {
    const items = Array.from({ length: MAX_WIDGETS + 10 }, (_, i) => ({
      id: `t${i}`,
      type: "tasks",
      x: 0,
      y: i * 4,
      w: 3,
      h: 4,
      config: {},
    }));
    expect(readLayout({ version: 1, items }).layout.items).toHaveLength(MAX_WIDGETS);
  });

  it("treats a layout with no version as the first one", () => {
    const { fallback } = readLayout({ items: [] });
    expect(fallback).toBe(false);
  });
});

describe("editing a layout", () => {
  const base = defaultLayout();

  it("adds a widget at its default size in a free slot", () => {
    const { layout, id } = addWidget(base, "tasks");
    expect(id).not.toBeNull();
    const added = layout.items.find((i) => i.id === id);
    expect(added).toMatchObject({
      type: "tasks",
      w: WIDGET_SIZES.medium.w,
      h: WIDGET_SIZES.medium.h,
    });
    expect(added?.config).toEqual({ trackId: null });
    expect(layout.items).toHaveLength(base.items.length + 1);
    expectDrawable(layout);
  });

  it("appends a new widget to a hand-set phone order, and leaves a null one alone", () => {
    const { layout, id } = addWidget(base, "tasks");
    expect(layout.order?.at(-1)).toBe(id);
    const { layout: following } = addWidget({ ...base, order: null }, "tasks");
    expect(following.order).toBeNull();
  });

  it("refuses a second copy of a one-only widget", () => {
    expect(canAddWidget(base, "focus-timer")).toBe(false);
    const { layout, id } = addWidget(base, "focus-timer");
    expect(id).toBeNull();
    expect(layout).toBe(base);
  });

  it("refuses to add past the cap", () => {
    let layout = base;
    while (layout.items.length < MAX_WIDGETS) layout = addWidget(layout, "tasks").layout;
    expect(canAddWidget(layout, "tasks")).toBe(false);
    expect(addWidget(layout, "tasks").id).toBeNull();
  });

  it("duplicates with independent settings", () => {
    const { layout, id } = duplicateWidget(base, "tasks");
    expect(id).not.toBeNull();
    const original = layout.items.find((i) => i.id === "tasks");
    const copy = layout.items.find((i) => i.id === id);
    expect(copy).toMatchObject({ type: "tasks", w: original?.w, h: original?.h });
    expect(copy?.config).toEqual(original?.config);
    expect(copy?.config).not.toBe(original?.config);
    expectDrawable(layout);
    // …and cannot duplicate what only exists once.
    expect(duplicateWidget(base, "pinned-tracks").id).toBeNull();
  });

  it("removes a widget from the grid and from the phone order", () => {
    const layout = removeWidget(base, "goals");
    expect(layout.items.some((i) => i.id === "goals")).toBe(false);
    expect(layout.order).not.toContain("goals");
    expectDrawable(layout);
    expect(removeWidget(base, "nope")).toBe(base);
  });

  it("validates settings on the way in", () => {
    const good = setWidgetConfig(base, "focus-timer", { minutes: 45 });
    expect(good.items.find((i) => i.id === "focus-timer")?.config).toEqual({ minutes: 45 });
    const bad = setWidgetConfig(base, "focus-timer", { minutes: -1 });
    expect(bad.items.find((i) => i.id === "focus-timer")?.config).toEqual({ minutes: 25 });
  });

  it("snaps to a preset, sliding left when the preset would not fit", () => {
    // progress-overview sits in the last three columns; Wide is six.
    const layout = setWidgetSize(base, "progress-overview", "wide");
    const item = layout.items.find((i) => i.id === "progress-overview");
    expect(item).toMatchObject({ w: 6, h: 3, x: 6 });
    expectDrawable(layout);
  });

  it("knows when nothing has changed", () => {
    expect(sameLayout(base, defaultLayout())).toBe(true);
    expect(sameLayout(base, removeWidget(base, "goals"))).toBe(false);
  });
});

describe("named layouts", () => {
  const saved = (id: string, isDefault = false): SavedLayout => ({
    id,
    name: id,
    isDefault,
    layout: defaultLayout(),
    fallback: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  it("stands in a built-in layout until something is saved", () => {
    const active = pickActiveLayout([], "anything");
    expect(active.id).toBeNull();
    expect(active.name).toBe(builtInLayout().name);
  });

  it("prefers the requested layout, then the default, then the first", () => {
    const list = [saved("a"), saved("b", true), saved("c")];
    expect(pickActiveLayout(list, "c").id).toBe("c");
    expect(pickActiveLayout(list, null).id).toBe("b");
    expect(pickActiveLayout(list, "deleted").id).toBe("b");
    expect(pickActiveLayout([saved("a"), saved("c")], undefined).id).toBe("a");
  });

  it("links the default as a bare / and the others by id", () => {
    expect(layoutHref({ id: "b", isDefault: true })).toBe("/");
    expect(layoutHref({ id: null, isDefault: true })).toBe("/");
    expect(layoutHref({ id: "c", isDefault: false })).toBe("/?layout=c");
  });

  it("validates names", () => {
    expect(layoutNameSchema.safeParse("  Mixing week ").data).toBe("Mixing week");
    expect(layoutNameSchema.safeParse("   ").success).toBe(false);
    expect(layoutNameSchema.safeParse("x".repeat(41)).success).toBe(false);
  });
});
