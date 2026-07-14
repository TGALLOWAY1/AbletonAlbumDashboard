import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import {
  revalidateAlbumSurfaces,
  revalidateTrackSurfaces,
} from "@/lib/revalidate-track";

const BASE_TRACK_PATHS = [
  "/m/abc-123",
  "/tracks/abc-123",
  "/focus/abc-123",
  "/",
  "/calendar",
  "/sessions",
  "/tracks",
  "/albums",
];

describe("revalidateTrackSurfaces", () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  it("revalidates every surface that renders track data", () => {
    revalidateTrackSurfaces("abc-123");
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    // The feature-parity contract: both track detail route shapes plus the
    // focus page, the aggregate surfaces, and the track/album listings.
    expect(calls).toEqual(expect.arrayContaining(BASE_TRACK_PATHS));
    expect(calls).toHaveLength(BASE_TRACK_PATHS.length);
  });

  it("revalidates each affected album detail page", () => {
    revalidateTrackSurfaces("abc-123", {
      albumIds: ["album-1", "album-2"],
    });
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        ...BASE_TRACK_PATHS,
        "/albums/album-1",
        "/albums/album-2",
      ]),
    );
    expect(calls).toHaveLength(BASE_TRACK_PATHS.length + 2);
  });

  it("dedupes album ids and skips null/undefined entries", () => {
    revalidateTrackSurfaces("abc-123", {
      albumIds: ["album-1", "album-1", null, undefined],
    });
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(
      calls.filter((path) => path === "/albums/album-1"),
    ).toHaveLength(1);
    expect(calls).toHaveLength(BASE_TRACK_PATHS.length + 1);
  });
});

describe("revalidateAlbumSurfaces", () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  it("revalidates every surface that renders album data", () => {
    revalidateAlbumSurfaces();
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining(["/", "/albums", "/settings"]),
    );
    expect(calls).toHaveLength(3);
  });

  it("also revalidates the album detail page when an id is provided", () => {
    revalidateAlbumSurfaces("album-9");
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining(["/", "/albums", "/settings", "/albums/album-9"]),
    );
    expect(calls).toHaveLength(4);
  });

  it("skips the detail page for a null id", () => {
    revalidateAlbumSurfaces(null);
    expect(vi.mocked(revalidatePath).mock.calls).toHaveLength(3);
  });
});
