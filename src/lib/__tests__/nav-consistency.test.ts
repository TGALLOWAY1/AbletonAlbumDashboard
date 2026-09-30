import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavActive } from "@/components/nav-items";
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

  it("lists the mobile tabs in the sidebar's order", () => {
    const mobileOrder = MOBILE_NAV_TABS.map((tab) => tab.href);
    const sidebarOrder = NAV_ITEMS.map((item) => item.href).filter((href) =>
      mobileOrder.includes(href),
    );
    expect(mobileOrder).toEqual(sidebarOrder);
  });

  it("has no nav entry pointing at the retired albums shelf", () => {
    expect(NAV_ITEMS.map((item) => item.href)).not.toContain("/albums");
    expect(MOBILE_NAV_TABS.map((tab) => tab.href)).not.toContain("/albums");
  });

  it("has no nav entry pointing at the retired progress page", () => {
    expect(NAV_ITEMS.map((item) => item.href)).not.toContain("/analytics");
    expect(MOBILE_NAV_TABS.map((tab) => tab.href)).not.toContain("/analytics");
  });
});

// The album routes outlived the albums nav entry: the library absorbed the
// shelf, so an album page has to light up Tracks on both surfaces or the user
// lands somewhere with nothing highlighted.
describe("album routes highlight the Tracks section", () => {
  const albumPaths = ["/albums", "/albums/alb-1", "/albums/new"];

  it.each(albumPaths)("sidebar: %s is under Tracks", (path) => {
    expect(isNavActive(path, "/tracks")).toBe(true);
  });

  it.each(albumPaths)("mobile: %s is under Tracks", (path) => {
    const tracks = MOBILE_NAV_TABS.find((tab) => tab.href === "/tracks");
    expect(tracks?.match(path)).toBe(true);
  });

  it("does not light up Tracks for unrelated sections", () => {
    for (const path of ["/library", "/analytics", "/settings", "/"]) {
      expect(isNavActive(path, "/tracks")).toBe(false);
    }
  });

  it("keeps the mobile track detail route under Tracks", () => {
    const tracks = MOBILE_NAV_TABS.find((tab) => tab.href === "/tracks");
    expect(tracks?.match("/m/track-1")).toBe(true);
    expect(isNavActive("/m/track-1", "/tracks")).toBe(true);
  });
});

// Resources is one section at three scopes — the landing page, a category and
// a single topic — so each of them has to light up the Resources tab, and only
// that tab, on both surfaces.
describe("resource routes highlight the Resources section", () => {
  const resourcePaths = [
    "/resources",
    "/resources/cat-1",
    "/resources/cat-1/res-1",
  ];

  it.each(resourcePaths)("sidebar: %s is under Resources", (path) => {
    expect(isNavActive(path, "/resources")).toBe(true);
  });

  it.each(resourcePaths)("mobile: %s lights up only Resources", (path) => {
    const lit = MOBILE_NAV_TABS.filter((tab) => tab.match(path)).map(
      (tab) => tab.href,
    );
    expect(lit).toEqual(["/resources"]);
  });
});
