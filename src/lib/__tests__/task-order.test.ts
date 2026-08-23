import { describe, expect, it } from "vitest";
import { applyOrder, moveItemTo } from "@/lib/task-order";

const list = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("moveItemTo", () => {
  it("moves an item down into the target's slot", () => {
    expect(ids(moveItemTo(list("a", "b", "c", "d"), "a", "c"))).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("moves an item up into the target's slot", () => {
    expect(ids(moveItemTo(list("a", "b", "c", "d"), "d", "b"))).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("promotes to the top — the move that sets the next action", () => {
    expect(ids(moveItemTo(list("a", "b", "c"), "c", "a"))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("returns the same reference when the move is a no-op", () => {
    const original = list("a", "b");
    expect(moveItemTo(original, "a", "a")).toBe(original);
    expect(moveItemTo(original, "a", "nope")).toBe(original);
    expect(moveItemTo(original, "nope", "b")).toBe(original);
  });

  it("never drops or duplicates a row", () => {
    const original = list("a", "b", "c", "d", "e");
    const moved = moveItemTo(original, "b", "e");
    expect(moved).toHaveLength(original.length);
    expect(new Set(ids(moved))).toEqual(new Set(ids(original)));
  });
});

describe("applyOrder", () => {
  it("reorders to the given ids", () => {
    expect(ids(applyOrder(list("a", "b", "c"), ["c", "a", "b"]))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("keeps rows the id list does not mention, at the end", () => {
    // A task added while a reorder was in flight must not vanish.
    expect(ids(applyOrder(list("a", "b", "new"), ["b", "a"]))).toEqual([
      "b",
      "a",
      "new",
    ]);
  });

  it("ignores ids that are not in the list", () => {
    expect(ids(applyOrder(list("a", "b"), ["b", "ghost", "a"]))).toEqual([
      "b",
      "a",
    ]);
  });
});
