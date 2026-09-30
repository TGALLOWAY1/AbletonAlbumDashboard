import { describe, expect, it } from "vitest";
import { orderCategories } from "@/lib/resource-category-order";

const cats = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((c) => c.id);

describe("orderCategories", () => {
  it("keeps the default order when nothing is saved", () => {
    expect(ids(orderCategories(cats, []))).toEqual(["a", "b", "c", "d"]);
  });

  it("applies a full saved order", () => {
    expect(ids(orderCategories(cats, ["d", "b", "a", "c"]))).toEqual([
      "d",
      "b",
      "a",
      "c",
    ]);
  });

  it("puts categories the saved order does not mention after the placed ones", () => {
    expect(ids(orderCategories(cats, ["c", "a"]))).toEqual(["c", "a", "b", "d"]);
  });

  it("drops saved ids that are not categories and ignores repeats", () => {
    expect(ids(orderCategories(cats, ["zzz", "b", "b", "a"]))).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
  });
});
