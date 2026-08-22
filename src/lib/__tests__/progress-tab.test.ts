import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRESS_TAB,
  parseProgressTab,
  progressTabHref,
} from "@/lib/progress-tab";

describe("parseProgressTab", () => {
  it("reads a known tab from the query string", () => {
    expect(parseProgressTab({ progress: "history" })).toBe("history");
    expect(parseProgressTab({ progress: "overview" })).toBe("overview");
  });

  it("falls back to the default for missing or unknown values", () => {
    for (const params of [
      {},
      { progress: "" },
      { progress: "  " },
      { progress: "bogus" },
    ]) {
      expect(parseProgressTab(params)).toBe(DEFAULT_PROGRESS_TAB);
    }
  });

  it("takes the first value when a param is repeated", () => {
    expect(parseProgressTab({ progress: ["history", "overview"] })).toBe(
      "history",
    );
  });
});

describe("progressTabHref", () => {
  // The default tab is what a bare "/" already renders, so it must not add a
  // param — otherwise every dashboard link would carry a redundant query.
  it("omits the param for the default tab", () => {
    expect(progressTabHref("overview")).toBe("/#progress");
  });

  it("sets the param for a non-default tab and keeps the anchor", () => {
    expect(progressTabHref("history")).toBe("/?progress=history#progress");
  });
});
