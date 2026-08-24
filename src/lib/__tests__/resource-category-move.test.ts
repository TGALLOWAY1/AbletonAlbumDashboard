import { describe, expect, it } from "vitest";
import { planResourceCategoryMove } from "@/lib/resource-category-move";

const RESOURCE_ID = "7c1f2b90-4a3d-4f21-8b6e-2d5a9c0e1f34";

describe("planResourceCategoryMove", () => {
  it("rejects a category the app doesn't know", () => {
    const plan = planResourceCategoryMove({
      resourceId: RESOURCE_ID,
      from: "sound-design",
      to: "not-a-category",
    });
    expect(plan).toEqual({ ok: false, error: "That category doesn't exist." });
  });

  it("revalidates both the category left and the one joined", () => {
    const plan = planResourceCategoryMove({
      resourceId: RESOURCE_ID,
      from: "sound-design",
      to: "mixing-mastering",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.unchanged).toBe(false);
    // Both galleries change — the old one loses a topic and renumbers, the new
    // one gains one.
    expect(plan.categoryIds).toEqual(["sound-design", "mixing-mastering"]);
  });

  it("points at the resource's new URL, since the category is in the path", () => {
    const plan = planResourceCategoryMove({
      resourceId: RESOURCE_ID,
      from: "sound-design",
      to: "mixing-mastering",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.destination).toBe(`/resources/mixing-mastering/${RESOURCE_ID}`);
  });

  it("flags a no-op move so the action can skip the write", () => {
    const plan = planResourceCategoryMove({
      resourceId: RESOURCE_ID,
      from: "sound-design",
      to: "sound-design",
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.unchanged).toBe(true);
    expect(plan.categoryIds).toEqual(["sound-design"]);
    expect(plan.destination).toBe(`/resources/sound-design/${RESOURCE_ID}`);
  });

  it("still moves a row whose stored category is unreadable", () => {
    // A row written before a category was renamed has no surface to refresh on
    // the way out — that must not block the move itself.
    for (const from of ["retired-category", null, undefined]) {
      const plan = planResourceCategoryMove({
        resourceId: RESOURCE_ID,
        from,
        to: "workflow-mindset",
      });
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      expect(plan.unchanged).toBe(false);
      expect(plan.categoryIds).toEqual(["workflow-mindset"]);
    }
  });
});
