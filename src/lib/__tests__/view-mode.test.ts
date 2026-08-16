import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALBUM_VIEW,
  DEFAULT_TRACK_VIEW,
  mergeQuery,
  parseViewPreference,
  serializeViewPreference,
  viewHref,
} from "@/lib/view-mode";

describe("parseViewPreference", () => {
  it("falls back to the page default when nothing is in the URL", () => {
    expect(parseViewPreference({}, DEFAULT_TRACK_VIEW)).toEqual(
      DEFAULT_TRACK_VIEW,
    );
    expect(parseViewPreference({}, DEFAULT_ALBUM_VIEW)).toEqual(
      DEFAULT_ALBUM_VIEW,
    );
  });

  it("reads both axes independently", () => {
    expect(
      parseViewPreference({ view: "gallery", size: "small" }, DEFAULT_TRACK_VIEW),
    ).toEqual({ layout: "gallery", size: "small" });
    expect(parseViewPreference({ size: "medium" }, DEFAULT_TRACK_VIEW)).toEqual({
      layout: "list",
      size: "medium",
    });
  });

  it("ignores unknown values instead of rendering an unhandled view", () => {
    expect(
      parseViewPreference({ view: "carousel", size: "huge" }, DEFAULT_ALBUM_VIEW),
    ).toEqual(DEFAULT_ALBUM_VIEW);
  });

  it("takes the first value of a repeated param and trims it", () => {
    expect(
      parseViewPreference(
        { view: [" gallery ", "list"], size: [" small "] },
        DEFAULT_TRACK_VIEW,
      ),
    ).toEqual({ layout: "gallery", size: "small" });
  });
});

describe("serializeViewPreference", () => {
  it("is empty when the preference is the page default", () => {
    expect(serializeViewPreference(DEFAULT_TRACK_VIEW, DEFAULT_TRACK_VIEW)).toBe(
      "",
    );
  });

  it("only emits the axes that differ from the default", () => {
    expect(
      serializeViewPreference(
        { layout: "list", size: "small" },
        DEFAULT_TRACK_VIEW,
      ),
    ).toBe("size=small");
    expect(
      serializeViewPreference(
        { layout: "gallery", size: "large" },
        DEFAULT_TRACK_VIEW,
      ),
    ).toBe("view=gallery");
    expect(
      serializeViewPreference(
        { layout: "list", size: "small" },
        DEFAULT_ALBUM_VIEW,
      ),
    ).toBe("view=list&size=small");
  });

  it("round-trips through parse", () => {
    const preference = { layout: "gallery", size: "small" } as const;
    const qs = serializeViewPreference(preference, DEFAULT_TRACK_VIEW);
    const params = Object.fromEntries(new URLSearchParams(qs));
    expect(parseViewPreference(params, DEFAULT_TRACK_VIEW)).toEqual(preference);
  });
});

describe("mergeQuery", () => {
  it("skips empty fragments", () => {
    expect(mergeQuery("", undefined, null, "view=gallery")).toBe("view=gallery");
    expect(mergeQuery()).toBe("");
  });

  it("keeps params from every fragment", () => {
    expect(mergeQuery("status=active&tag=lofi", "view=gallery&size=small")).toBe(
      "status=active&tag=lofi&view=gallery&size=small",
    );
  });

  it("lets a later fragment replace an earlier fragment's key", () => {
    expect(mergeQuery("view=list", "view=gallery")).toBe("view=gallery");
  });

  it("preserves repeated keys within a fragment", () => {
    expect(mergeQuery("tag=a&tag=b", "view=gallery")).toBe(
      "tag=a&tag=b&view=gallery",
    );
  });
});

describe("viewHref", () => {
  it("returns the bare path for the default view with no other params", () => {
    expect(viewHref("/tracks", DEFAULT_TRACK_VIEW, DEFAULT_TRACK_VIEW)).toBe(
      "/tracks",
    );
  });

  it("carries the active filters through a view switch", () => {
    expect(
      viewHref(
        "/tracks",
        { layout: "gallery", size: "small" },
        DEFAULT_TRACK_VIEW,
        "status=active",
      ),
    ).toBe("/tracks?status=active&view=gallery&size=small");
  });

  it("keeps filters when switching back to the default view", () => {
    expect(
      viewHref("/tracks", DEFAULT_TRACK_VIEW, DEFAULT_TRACK_VIEW, "status=active"),
    ).toBe("/tracks?status=active");
  });
});
