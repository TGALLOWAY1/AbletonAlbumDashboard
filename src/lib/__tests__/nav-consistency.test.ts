import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/nav-items";
import { MOBILE_NAV_TABS } from "@/components/mobile/bottom-nav";

// The mobile bottom nav is a subset of the sidebar nav. Every tab it shows
// must point at a destination the sidebar also exposes, under the same label,
// so the two surfaces never drift apart (e.g. a renamed or removed page that
// only one surface picked up).
describe("mobile bottom nav ↔ sidebar nav consistency", () => {
  it("every mobile tab has a matching href + label in NAV_ITEMS", () => {
    for (const tab of MOBILE_NAV_TABS) {
      const match = NAV_ITEMS.find((item) => item.href === tab.href);
      expect(
        match,
        `mobile tab "${tab.label}" (${tab.href}) has no sidebar nav item with that href`,
      ).toBeDefined();
      expect(
        match?.label,
        `mobile tab and sidebar item for ${tab.href} disagree on the label`,
      ).toBe(tab.label);
    }
  });
});
