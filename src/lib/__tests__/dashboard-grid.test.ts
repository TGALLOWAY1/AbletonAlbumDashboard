import { describe, expect, it } from "vitest";
import {
  GRID_COLUMNS,
  clampItem,
  collides,
  compact,
  findSlot,
  gridHeight,
  moveItem,
  normalize,
  removeItem,
  resizeItem,
  stackOrder,
  stepInStack,
  stepItem,
  tabletSpan,
  type GridItem,
} from "@/lib/dashboard/grid";

const box = (id: string, x: number, y: number, w: number, h: number): GridItem => ({
  id,
  x,
  y,
  w,
  h,
});

const at = (items: GridItem[], id: string) => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`no item ${id}`);
  return item;
};

/** The two invariants every function in the module promises. */
function expectSound(items: GridItem[]) {
  for (const a of items) {
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.y).toBeGreaterThanOrEqual(0);
    expect(a.x + a.w).toBeLessThanOrEqual(GRID_COLUMNS);
    for (const b of items) {
      expect(collides(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
    }
  }
  // Gravity: nothing could rise a row without hitting something.
  for (const a of items) {
    if (a.y === 0) continue;
    const lifted = { ...a, y: a.y - 1 };
    expect(
      items.some((b) => collides(lifted, b)),
      `${a.id} is floating`,
    ).toBe(true);
  }
}

describe("collides", () => {
  it("is true only for rectangles that share a cell", () => {
    expect(collides(box("a", 0, 0, 2, 2), box("b", 1, 1, 2, 2))).toBe(true);
    expect(collides(box("a", 0, 0, 2, 2), box("b", 2, 0, 2, 2))).toBe(false);
    expect(collides(box("a", 0, 0, 2, 2), box("b", 0, 2, 2, 2))).toBe(false);
  });

  it("never reports an item as colliding with itself", () => {
    const a = box("a", 0, 0, 2, 2);
    expect(collides(a, { ...a })).toBe(false);
  });
});

describe("clampItem", () => {
  it("pulls an item back inside the columns", () => {
    expect(clampItem(box("a", 11, 0, 4, 2))).toMatchObject({ x: 8, w: 4 });
    expect(clampItem(box("a", -3, -2, 4, 2))).toMatchObject({ x: 0, y: 0 });
  });

  it("enforces a minimum and never exceeds the grid", () => {
    expect(clampItem(box("a", 0, 0, 1, 1), { minW: 3, minH: 2 })).toMatchObject({
      w: 3,
      h: 2,
    });
    expect(clampItem(box("a", 0, 0, 40, 400))).toMatchObject({ w: 12, h: 12 });
  });

  it("turns nonsense numbers into something drawable", () => {
    const fixed = clampItem(
      { id: "a", x: Number.NaN, y: Infinity, w: 2.6, h: Number.NaN },
      { minW: 2, minH: 3 },
    );
    expect(fixed).toMatchObject({ x: 0, y: 0, w: 3, h: 3 });
  });
});

describe("compact", () => {
  it("closes vertical gaps", () => {
    const out = compact([box("a", 0, 5, 4, 2), box("b", 0, 20, 4, 2)]);
    expect(at(out, "a").y).toBe(0);
    expect(at(out, "b").y).toBe(2);
  });

  it("separates overlapping items instead of drawing one over the other", () => {
    const out = compact([box("a", 0, 0, 6, 3), box("b", 3, 1, 6, 3), box("c", 5, 2, 4, 2)]);
    expectSound(out);
  });

  it("handles an absurd row without looping over every row in between", () => {
    const out = compact([box("a", 0, 0, 4, 2), box("b", 0, 1_000_000_000, 4, 2)]);
    expect(at(out, "b").y).toBe(2);
  });

  it("leaves a sound layout exactly as it was", () => {
    const sound = [box("a", 0, 0, 6, 3), box("b", 6, 0, 6, 2), box("c", 6, 2, 6, 2)];
    expect(compact(sound)).toEqual(sound);
  });
});

describe("normalize", () => {
  it("applies each item's own bounds", () => {
    const out = normalize([box("a", 0, 0, 1, 1), box("b", 0, 0, 1, 1)], (item) =>
      item.id === "a" ? { minW: 6, minH: 3 } : { minW: 3, minH: 2 },
    );
    expect(at(out, "a")).toMatchObject({ w: 6, h: 3 });
    expect(at(out, "b")).toMatchObject({ w: 3, h: 2 });
    expectSound(out);
  });
});

describe("moveItem", () => {
  // Two stacked in the left half, one filling the right.
  const start = [box("a", 0, 0, 6, 3), box("b", 0, 3, 6, 4), box("c", 6, 0, 6, 3)];

  it("moves into free space and lets gravity settle it", () => {
    const out = moveItem([box("a", 0, 0, 4, 2), box("b", 4, 0, 4, 2)], "a", 8, 5);
    expect(at(out, "a")).toMatchObject({ x: 8, y: 0 });
    expectSound(out);
  });

  it("keeps a neighbour in place until the mover's centre has crossed it", () => {
    // a (rows 0-2) nudged two rows down still has its centre above b's.
    const out = moveItem(start, "a", 0, 2);
    expect(at(out, "a").y).toBe(0);
    expect(at(out, "b").y).toBe(3);
  });

  it("trades places once the centre has crossed", () => {
    const out = moveItem(start, "a", 0, 5);
    expect(at(out, "b").y).toBe(0);
    expect(at(out, "a").y).toBe(4);
    expectSound(out);
  });

  it("pushes down what it lands on from the side", () => {
    const out = moveItem(start, "c", 0, 0);
    expect(at(out, "c")).toMatchObject({ x: 0, y: 0 });
    expect(at(out, "a").y).toBe(3);
    expect(at(out, "b").y).toBe(6);
    expectSound(out);
  });

  it("restores the original when dragged out and back", () => {
    // Each frame is computed from the layout at drag start, so returning to
    // the starting cell must give back exactly what was there.
    expect(moveItem(start, "a", 0, 0)).toEqual(start);
  });

  it("cannot leave the grid", () => {
    const out = moveItem(start, "a", 99, -5);
    expect(at(out, "a").x).toBe(6);
    expectSound(out);
  });

  it("returns the input untouched for an unknown id", () => {
    expect(moveItem(start, "nope", 0, 0)).toBe(start);
  });

  it("never drops, duplicates or resizes anything", () => {
    for (let x = 0; x <= 12; x += 3) {
      for (let y = 0; y <= 9; y += 1) {
        const out = moveItem(start, "b", x, y);
        expect(out.map((i) => i.id).sort()).toEqual(["a", "b", "c"]);
        for (const item of start) {
          expect(at(out, item.id)).toMatchObject({ w: item.w, h: item.h });
        }
        expectSound(out);
      }
    }
  });
});

describe("resizeItem", () => {
  const start = [box("a", 0, 0, 4, 2), box("b", 4, 0, 4, 4), box("c", 0, 2, 4, 2)];

  it("grows in place and pushes what it covers below it", () => {
    const out = resizeItem(start, "a", 8, 2);
    expect(at(out, "a")).toMatchObject({ x: 0, y: 0, w: 8, h: 2 });
    expect(at(out, "b").y).toBe(2);
    expectSound(out);
  });

  it("lets neighbours rise when it shrinks", () => {
    const tall = [box("a", 0, 0, 4, 5), box("b", 0, 5, 4, 2)];
    const out = resizeItem(tall, "a", 4, 2);
    expect(at(out, "b").y).toBe(2);
  });

  it("stops at the widget's bounds and at the right edge", () => {
    const out = resizeItem(start, "a", 1, 1, { minW: 3, minH: 2 });
    expect(at(out, "a")).toMatchObject({ w: 3, h: 2 });
    const wide = resizeItem(start, "b", 99, 4);
    expect(at(wide, "b")).toMatchObject({ x: 4, w: 8 });
    expectSound(wide);
  });
});

describe("findSlot", () => {
  it("uses the top-left of an empty grid", () => {
    expect(findSlot([], 3, 2)).toEqual({ x: 0, y: 0 });
  });

  it("fills a hole at the end of a row before starting a new one", () => {
    const items = [box("a", 0, 0, 5, 3), box("b", 5, 0, 3, 3)];
    expect(findSlot(items, 4, 3)).toEqual({ x: 8, y: 0 });
  });

  it("starts a new row when nothing fits beside what is there", () => {
    const items = [box("a", 0, 0, 8, 3)];
    expect(findSlot(items, 6, 2)).toEqual({ x: 0, y: 3 });
  });
});

describe("removeItem", () => {
  it("closes the space the item left", () => {
    const out = removeItem([box("a", 0, 0, 12, 3), box("b", 0, 3, 12, 2)], "a");
    expect(out).toEqual([box("b", 0, 0, 12, 2)]);
  });
});

describe("stepItem (the keyboard path)", () => {
  const start = [box("a", 0, 0, 6, 2), box("b", 0, 2, 6, 5), box("c", 6, 0, 6, 3)];

  it("moves a column sideways", () => {
    const out = stepItem([box("a", 0, 0, 3, 2)], "a", "right");
    expect(at(out, "a").x).toBe(1);
  });

  it("goes past the neighbour below, whatever its height", () => {
    const out = stepItem(start, "a", "down");
    expect(at(out, "b").y).toBe(0);
    expect(at(out, "a").y).toBe(5);
    expectSound(out);
  });

  it("goes past the neighbour above, whatever its height", () => {
    // b is far taller than a, so the pointer's centre rule alone would never
    // let a short widget climb over it in one step.
    const tallAbove = [box("b", 0, 0, 6, 5), box("a", 0, 5, 6, 2)];
    const out = stepItem(tallAbove, "a", "up");
    expect(at(out, "a").y).toBe(0);
    expect(at(out, "b").y).toBe(2);
  });

  it("returns the same array at an edge, so a bump is detectable", () => {
    expect(stepItem(start, "a", "up")).toBe(start);
    expect(stepItem(start, "a", "left")).toBe(start);
    expect(stepItem(start, "b", "down")).toBe(start);
    expect(stepItem(start, "c", "right")).toBe(start);
  });

  it("round-trips: down then up restores the layout", () => {
    expect(stepItem(stepItem(start, "a", "down"), "a", "up")).toEqual(start);
  });
});

describe("stackOrder", () => {
  const items = [box("c", 6, 0, 6, 2), box("a", 0, 0, 6, 2), box("b", 0, 2, 12, 2)];

  it("reads the grid top-to-bottom, left-to-right when nothing is saved", () => {
    expect(stackOrder(items)).toEqual(["a", "c", "b"]);
    expect(stackOrder(items, [])).toEqual(["a", "c", "b"]);
  });

  it("honours a saved order", () => {
    expect(stackOrder(items, ["b", "c", "a"])).toEqual(["b", "c", "a"]);
  });

  it("drops stale ids and appends widgets the order has never seen", () => {
    // "gone" was removed on a desktop; "c" was added there afterwards.
    expect(stackOrder(items, ["b", "gone", "a", "b"])).toEqual(["b", "a", "c"]);
  });
});

describe("stepInStack", () => {
  it("swaps with the neighbour and stops at the ends", () => {
    const order = ["a", "b", "c"];
    expect(stepInStack(order, "b", -1)).toEqual(["b", "a", "c"]);
    expect(stepInStack(order, "b", 1)).toEqual(["a", "c", "b"]);
    expect(stepInStack(order, "a", -1)).toBe(order);
    expect(stepInStack(order, "c", 1)).toBe(order);
    expect(stepInStack(order, "nope", 1)).toBe(order);
  });
});

describe("tabletSpan", () => {
  it("is half the six-column row for narrow widgets and all of it for wide ones", () => {
    expect([1, 3, 4].map(tabletSpan)).toEqual([3, 3, 3]);
    expect([5, 6, 12].map(tabletSpan)).toEqual([6, 6, 6]);
  });
});

describe("gridHeight", () => {
  it("is the lowest bottom edge", () => {
    expect(gridHeight([])).toBe(0);
    expect(gridHeight([box("a", 0, 0, 2, 3), box("b", 2, 4, 2, 2)])).toBe(6);
  });
});
