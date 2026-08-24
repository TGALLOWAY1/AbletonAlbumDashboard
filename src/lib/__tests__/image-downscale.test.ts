import { describe, expect, it } from "vitest";
import { fitWithin, isResizableImageType } from "@/lib/image-downscale";

describe("fitWithin", () => {
  it("leaves an image already inside the box alone", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it("scales the long edge down and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never rounds a dimension to zero", () => {
    expect(fitWithin(10000, 3, 1600)).toEqual({ width: 1600, height: 1 });
  });

  it("tolerates a zero-sized decode", () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe("isResizableImageType", () => {
  it("accepts the still raster formats a canvas round-trip preserves", () => {
    expect(isResizableImageType("image/png")).toBe(true);
    expect(isResizableImageType("image/JPEG")).toBe(true);
    expect(isResizableImageType("image/webp")).toBe(true);
  });

  it("passes animated and vector formats through untouched", () => {
    expect(isResizableImageType("image/gif")).toBe(false);
    expect(isResizableImageType("image/svg+xml")).toBe(false);
  });
});
