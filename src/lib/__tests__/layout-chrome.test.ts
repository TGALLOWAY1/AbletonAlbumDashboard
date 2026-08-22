import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_CHROME,
  CHROME_SOURCE_FILES,
  MOBILE_HEADER_HEIGHT_REM,
  MOBILE_NAV_HEIGHT_REM,
  SIDEBAR_WIDTH_REM,
} from "@/lib/layout-chrome";

// "The nav bar moves when I scroll" has come back several times, always the
// same way: a piece of chrome ends up `sticky` (which unpins itself the moment
// an ancestor gains `overflow`, the parent stops being taller than it, or the
// page overflows sideways) instead of `fixed` (anchored to the viewport, so
// none of that can reach it). These tests lock the positioning down, and lock
// the offsets that reserve space for it to the chrome's real dimensions.

const REPO_ROOT = path.resolve(__dirname, "../../..");

/** Utilities in a class string, ignoring responsive/state variants. */
function utilities(classes: string) {
  return classes.split(/\s+/).filter(Boolean);
}

/** Strips a `md:` / `hover:` style prefix off a utility. */
function base(utility: string) {
  return utility.slice(utility.lastIndexOf(":") + 1);
}

/** Tailwind's spacing scale is rem = n / 4 (`pt-16` -> 4rem, `w-64` -> 16rem). */
function scaleToRem(utility: string) {
  const n = Number(base(utility).split("-").pop());
  expect(Number.isFinite(n), `${utility} is not on the numeric spacing scale`).toBe(
    true,
  );
  return n / 4;
}

function findUtility(classes: string, prefix: string) {
  return utilities(classes).find((u) => base(u).startsWith(prefix));
}

const PINNED_CHROME = [
  ["sidebar", APP_CHROME.sidebar],
  ["mobileHeader", APP_CHROME.mobileHeader],
  ["mobileBottomNav", APP_CHROME.mobileBottomNav],
  ["libraryMiniPlayer", APP_CHROME.libraryMiniPlayer],
] as const;

describe("persistent chrome is pinned to the viewport", () => {
  it.each(PINNED_CHROME)("%s is `fixed`", (_name, classes) => {
    expect(utilities(classes)).toContain("fixed");
  });

  // The actual regression, spelled out: `sticky` renders identically until an
  // unrelated change moves the scrollport, and then the bar rides the page.
  it.each(PINNED_CHROME)(
    "%s uses no other positioning scheme",
    (_name, classes) => {
      for (const banned of ["sticky", "absolute", "relative", "static"]) {
        expect(
          utilities(classes).map(base),
          `chrome must be \`fixed\`, never \`${banned}\``,
        ).not.toContain(banned);
      }
    },
  );

  // `fixed` alone still floats where flow left it. Each bar has to name the
  // edges it is pinned to, or it drifts as soon as content around it changes.
  it("the sidebar is pinned to the full left edge", () => {
    const u = utilities(APP_CHROME.sidebar);
    expect(u).toContain("inset-y-0");
    expect(u).toContain("left-0");
  });

  it("the mobile header is pinned across the top", () => {
    const u = utilities(APP_CHROME.mobileHeader);
    expect(u).toContain("inset-x-0");
    expect(u).toContain("top-0");
  });

  it("the mobile bottom nav is pinned across the bottom", () => {
    const u = utilities(APP_CHROME.mobileBottomNav);
    expect(u).toContain("inset-x-0");
    expect(u).toContain("bottom-0");
  });

  it("chrome stacks above page content but below dialogs", () => {
    for (const [name, classes] of PINNED_CHROME) {
      const z = findUtility(classes, "z-");
      expect(z, `${name} needs an explicit z-index`).toBeDefined();
      const value = Number(base(z!).slice("z-".length));
      expect(value).toBeGreaterThanOrEqual(30);
      // Dialogs, sheets and toasts own z-50; chrome must not cover them.
      expect(value).toBeLessThan(50);
    }
  });
});

describe("the scrolling column reserves space for the fixed chrome", () => {
  // Fixed chrome is out of flow, so these offsets are the only thing keeping
  // content from sliding underneath it. They have to track the real sizes.
  it("the content column is inset by exactly the sidebar width", () => {
    const width = findUtility(APP_CHROME.sidebar, "w-");
    const inset = findUtility(APP_CHROME.contentColumn, "pl-");
    expect(width).toBe("w-64");
    expect(inset).toBe("md:pl-64");
    expect(scaleToRem(width!)).toBe(SIDEBAR_WIDTH_REM);
    expect(scaleToRem(inset!)).toBe(SIDEBAR_WIDTH_REM);
  });

  it("the sidebar offset only applies where the sidebar is visible", () => {
    // The sidebar is `hidden ... md:flex`; a bare `pl-64` would indent the
    // mobile surface by a sidebar that isn't there.
    expect(findUtility(APP_CHROME.contentColumn, "pl-")).toMatch(/^md:/);
  });

  it("main's top padding clears the fixed mobile header", () => {
    const top = findUtility(APP_CHROME.mainPadding, "pt-");
    expect(top).toBe("pt-16");
    expect(scaleToRem(top!)).toBeGreaterThanOrEqual(MOBILE_HEADER_HEIGHT_REM);
    expect(scaleToRem(findUtility(APP_CHROME.mobileHeader, "h-")!)).toBe(
      MOBILE_HEADER_HEIGHT_REM,
    );
  });

  it("main's bottom padding clears the fixed mobile bottom nav", () => {
    const bottom = utilities(APP_CHROME.mainPadding).find(
      (u) => u === "pb-24" || (base(u).startsWith("pb-") && !u.includes(":")),
    );
    expect(bottom).toBeDefined();
    expect(scaleToRem(bottom!)).toBeGreaterThanOrEqual(MOBILE_NAV_HEIGHT_REM);
  });

  it("the library mini-player sits above the bottom nav, not under it", () => {
    // Hard-coded rem in the arbitrary value, so it can drift from the nav's
    // real height — that regression shipped once already (PR #56).
    expect(APP_CHROME.libraryMiniPlayer).toContain(
      `bottom-[calc(${MOBILE_NAV_HEIGHT_REM}rem+env(safe-area-inset-bottom))]`,
    );
    // On md+ the bottom nav is gone but the sidebar is not.
    expect(utilities(APP_CHROME.libraryMiniPlayer)).toContain("md:bottom-0");
    expect(scaleToRem(findUtility(APP_CHROME.libraryMiniPlayer, "left-")!)).toBe(
      SIDEBAR_WIDTH_REM,
    );
  });
});

describe("chrome components go through the shared contract", () => {
  /** Comments explain the contract; they shouldn't trip the checks below. */
  function stripComments(text: string) {
    return text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  const sources = CHROME_SOURCE_FILES.map((file) => ({
    file,
    text: stripComments(readFileSync(path.join(REPO_ROOT, file), "utf8")),
  }));

  // Without this the constants above can be perfectly correct while a
  // component quietly hand-rolls `sticky top-0` next to them.
  it.each(sources.map((s) => [s.file, s.text] as const))(
    "%s contains no `sticky` positioning",
    (_file, text) => {
      expect(text).not.toMatch(/\bsticky\b/);
    },
  );

  it.each(sources.map((s) => [s.file, s.text] as const))(
    "%s pins its chrome from APP_CHROME rather than by hand",
    (_file, text) => {
      expect(text).toContain("APP_CHROME");
      // A literal `fixed`/`top-0`-style pin in one of these files means some
      // piece of chrome is positioned outside the shared contract.
      expect(text).not.toMatch(/"[^"\n]*\bfixed\b[^"\n]*"/);
    },
  );

  it("the root layout no longer puts the sidebar in flow", () => {
    const layout = sources.find((s) => s.file === "src/app/layout.tsx")!.text;
    // The old shape was a flex row whose height had to stay taller than the
    // `sticky` sidebar. It doesn't, reliably — hence the recurring bug.
    expect(layout).not.toMatch(/className="flex min-h-screen"/);
    expect(layout).toContain("APP_CHROME.contentColumn");
    expect(layout).toContain("APP_CHROME.mainPadding");
  });
});
