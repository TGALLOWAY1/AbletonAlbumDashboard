import { describe, expect, it } from "vitest";
import { albumPatchSchema } from "@/lib/types";

const ALBUM_ID = "3f8e2a44-1c9b-4d7e-9a21-6b5f0d8c3e12";

describe("albumPatchSchema", () => {
  it("accepts a single-field patch", () => {
    expect(albumPatchSchema.parse({ id: ALBUM_ID, title: "RIP DUBSTEP" })).toEqual(
      { id: ALBUM_ID, title: "RIP DUBSTEP" },
    );
  });

  it("leaves untouched keys undefined so the action skips those columns", () => {
    const parsed = albumPatchSchema.parse({
      id: ALBUM_ID,
      start_date: "2026-08-21",
    });
    expect(parsed.title).toBeUndefined();
    expect(parsed.cover_image_url).toBeUndefined();
    expect(parsed.start_date).toBe("2026-08-21");
  });

  it("accepts empty strings as explicit clears", () => {
    const parsed = albumPatchSchema.parse({
      id: ALBUM_ID,
      cover_image_url: "",
      start_date: "",
    });
    expect(parsed.cover_image_url).toBe("");
    expect(parsed.start_date).toBe("");
  });

  it("rejects a patch with no fields to update", () => {
    expect(() => albumPatchSchema.parse({ id: ALBUM_ID })).toThrow();
  });

  it("rejects a malformed start date", () => {
    expect(() =>
      albumPatchSchema.parse({ id: ALBUM_ID, start_date: "21/08/2026" }),
    ).toThrow();
  });

  it("rejects a non-url cover", () => {
    expect(() =>
      albumPatchSchema.parse({ id: ALBUM_ID, cover_image_url: "not-a-url" }),
    ).toThrow();
  });

  it("rejects a title over 120 characters", () => {
    expect(() =>
      albumPatchSchema.parse({ id: ALBUM_ID, title: "a".repeat(121) }),
    ).toThrow();
  });
});
