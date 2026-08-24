import { describe, expect, it } from "vitest";
import {
  NAV_STACK_MAX,
  parseStack,
  popCurrent,
  previousPath,
  pushPath,
  hasInAppHistory,
  replaceTop,
  serializeStack,
} from "@/lib/nav-stack";

describe("pushPath", () => {
  it("appends a new path", () => {
    expect(pushPath([], "/")).toEqual(["/"]);
    expect(pushPath(["/"], "/tracks/abc")).toEqual(["/", "/tracks/abc"]);
  });

  it("skips consecutive duplicates (re-renders, refreshes)", () => {
    expect(pushPath(["/", "/tracks/abc"], "/tracks/abc")).toEqual([
      "/",
      "/tracks/abc",
    ]);
  });

  it("allows the same path when not consecutive (A → B → A)", () => {
    expect(pushPath(["/albums/1", "/tracks/abc"], "/albums/1")).toEqual([
      "/albums/1",
      "/tracks/abc",
      "/albums/1",
    ]);
  });

  it("does not mutate the input stack", () => {
    const stack = ["/"];
    pushPath(stack, "/tracks/abc");
    expect(stack).toEqual(["/"]);
  });

  it(`caps the stack at ${NAV_STACK_MAX} by dropping the oldest entries`, () => {
    let stack: string[] = [];
    for (let i = 0; i < NAV_STACK_MAX + 5; i++) {
      stack = pushPath(stack, `/page-${i}`);
    }
    expect(stack).toHaveLength(NAV_STACK_MAX);
    expect(stack[0]).toBe("/page-5"); // oldest five dropped
    expect(stack[stack.length - 1]).toBe(`/page-${NAV_STACK_MAX + 4}`);
  });
});

describe("replaceTop", () => {
  const FROM = "/resources/sound-design/abc";
  const TO = "/resources/mixing-mastering/abc";

  it("swaps the current page out instead of appending", () => {
    // A deep-linked page is the only entry; a replace navigation must leave it
    // that way, or BackLink would see history the browser doesn't have.
    expect(replaceTop([FROM], FROM, TO)).toEqual([TO]);
    expect(hasInAppHistory(replaceTop([FROM], FROM, TO))).toBe(false);
  });

  it("keeps everything below the top", () => {
    expect(replaceTop(["/resources", FROM], FROM, TO)).toEqual([
      "/resources",
      TO,
    ]);
  });

  it("dedupes when the replacement is the entry underneath", () => {
    expect(replaceTop(["/resources", FROM], FROM, "/resources")).toEqual([
      "/resources",
    ]);
  });

  it("falls back to a push when the top isn't the page being replaced", () => {
    expect(replaceTop(["/resources"], FROM, TO)).toEqual(["/resources", TO]);
    expect(replaceTop([], FROM, TO)).toEqual([TO]);
  });

  it("leaves the tracker's follow-up push a no-op", () => {
    // NavigationTracker pushes the destination once the pathname changes;
    // consecutive-duplicate dedupe is what keeps that from re-growing the stack.
    const replaced = replaceTop([FROM], FROM, TO);
    expect(pushPath(replaced, TO)).toEqual(replaced);
  });
});

describe("hasInAppHistory", () => {
  it("is false for an empty or single-entry stack", () => {
    expect(hasInAppHistory([])).toBe(false);
    expect(hasInAppHistory(["/tracks/abc"])).toBe(false);
  });

  it("is true once a second page has been visited", () => {
    expect(hasInAppHistory(["/", "/tracks/abc"])).toBe(true);
  });
});

describe("previousPath", () => {
  it("returns null for an empty stack", () => {
    expect(previousPath([], "/tracks/abc")).toBeNull();
  });

  it("returns null when the only entry is the current page (deep link)", () => {
    expect(previousPath(["/tracks/abc"], "/tracks/abc")).toBeNull();
  });

  it("returns the entry below the top when the tracker already pushed the current page", () => {
    expect(previousPath(["/albums/1", "/tracks/abc"], "/tracks/abc")).toBe(
      "/albums/1",
    );
  });

  it("returns the top when the tracker has not pushed the current page yet", () => {
    expect(previousPath(["/albums/1"], "/tracks/abc")).toBe("/albums/1");
  });
});

describe("popCurrent", () => {
  it("removes a trailing current path", () => {
    expect(popCurrent(["/albums/1", "/tracks/abc"], "/tracks/abc")).toEqual([
      "/albums/1",
    ]);
  });

  it("is a no-op when the top is not the current path", () => {
    expect(popCurrent(["/albums/1"], "/tracks/abc")).toEqual(["/albums/1"]);
    expect(popCurrent([], "/tracks/abc")).toEqual([]);
  });
});

describe("parseStack / serializeStack", () => {
  it("round-trips a stack", () => {
    const stack = ["/", "/tracks/abc"];
    expect(parseStack(serializeStack(stack))).toEqual(stack);
  });

  it("returns [] for null or empty input", () => {
    expect(parseStack(null)).toEqual([]);
    expect(parseStack("")).toEqual([]);
  });

  it("returns [] for garbage JSON", () => {
    expect(parseStack("{not json")).toEqual([]);
    expect(parseStack("undefined")).toEqual([]);
  });

  it("returns [] for valid JSON that is not an array", () => {
    expect(parseStack('{"a":1}')).toEqual([]);
    expect(parseStack('"just a string"')).toEqual([]);
  });

  it("drops non-string entries from an array", () => {
    expect(parseStack('["/", 42, null, "/tracks/abc"]')).toEqual([
      "/",
      "/tracks/abc",
    ]);
  });
});
