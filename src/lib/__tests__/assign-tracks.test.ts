import { describe, expect, it } from "vitest";
import { assignTracksToAlbumSchema } from "@/lib/types";

const ALBUM_ID = "3f8e2a44-1c9b-4d7e-9a21-6b5f0d8c3e12";
const TRACK_A = "7c1d9e02-5a3f-4b68-8d94-2e7a1f6c0b45";
const TRACK_B = "b2a4c8d6-0e1f-4a23-b567-89cdef012345";

describe("assignTracksToAlbumSchema", () => {
  it("accepts a uuid album id with a list of uuid track ids", () => {
    const parsed = assignTracksToAlbumSchema.parse({
      albumId: ALBUM_ID,
      trackIds: [TRACK_A, TRACK_B],
    });
    expect(parsed).toEqual({
      albumId: ALBUM_ID,
      trackIds: [TRACK_A, TRACK_B],
    });
  });

  it("accepts a null album id (unassign)", () => {
    const parsed = assignTracksToAlbumSchema.parse({
      albumId: null,
      trackIds: [TRACK_A],
    });
    expect(parsed.albumId).toBeNull();
    expect(parsed.trackIds).toEqual([TRACK_A]);
  });

  it("rejects an empty trackIds array", () => {
    expect(() =>
      assignTracksToAlbumSchema.parse({ albumId: ALBUM_ID, trackIds: [] }),
    ).toThrow();
  });

  it("rejects a non-uuid album id", () => {
    expect(() =>
      assignTracksToAlbumSchema.parse({
        albumId: "not-a-uuid",
        trackIds: [TRACK_A],
      }),
    ).toThrow();
  });

  it("rejects non-uuid track ids", () => {
    expect(() =>
      assignTracksToAlbumSchema.parse({
        albumId: ALBUM_ID,
        trackIds: [TRACK_A, "not-a-uuid"],
      }),
    ).toThrow();
  });

  it("rejects an undefined album id (must be explicit null)", () => {
    expect(() =>
      assignTracksToAlbumSchema.parse({ trackIds: [TRACK_A] }),
    ).toThrow();
  });
});
