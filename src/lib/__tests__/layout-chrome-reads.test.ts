import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The sidebar renders inside the root layout, on every page, so a read that
// throws there has no page-level error boundary above it: it reaches
// global-error.tsx and replaces the whole app. That happened in production —
// a transient Supabase "Gateway Timeout" during a resources-page refresh
// turned a save that had already succeeded into a full-screen "Something went
// wrong". The chrome's reads therefore catch and degrade; the fetchers they
// call keep throwing, because on their own pages a failed read should reach
// that page's boundary.

function source(file: string): string {
  return readFileSync(path.resolve(__dirname, "../../components", file), "utf8");
}

/** The code alone — the docblocks explain the rule and so mention "throw". */
function code(file: string): string {
  return source(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("root-layout chrome never throws on a read", () => {
  it.each(["sidebar-focus-panel.tsx", "sidebar-stats.tsx"])(
    "%s catches its reads and logs the failure",
    (file) => {
      const src = code(file);
      expect(src).toMatch(/try \{[\s\S]*\} catch \(e\) \{/);
      expect(src).toContain("logSupabaseError(");
      expect(src).not.toMatch(/\bthrow\b/);
    },
  );

  it("the focus panel falls back to the plain Start Focus Session link", () => {
    expect(source("sidebar-focus-panel.tsx")).toContain("return <SidebarFocusLink />");
  });

  it("the stats block says it is unavailable rather than printing zeros", () => {
    const src = source("sidebar-stats.tsx");
    expect(src).toContain("Unavailable right now.");
    // Every one of the four reads is checked, not just the ones that throw.
    expect(src).toContain("[active, completed, totalTracks, sessions].find((r) => r.error)");
  });

  it("the library branch of SidebarChrome shares the same fallback block", () => {
    expect(source("sidebar-chrome.tsx")).toContain("<SidebarFocusLink />");
  });
});
