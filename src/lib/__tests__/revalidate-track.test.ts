import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";

describe("revalidateTrackSurfaces", () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  it("revalidates every surface that renders track data", () => {
    revalidateTrackSurfaces("abc-123");
    const calls = vi.mocked(revalidatePath).mock.calls.map((c) => c[0]);
    // The feature-parity contract: both track detail route shapes plus the
    // focus page and the aggregate surfaces.
    expect(calls).toEqual(
      expect.arrayContaining([
        "/m/abc-123",
        "/tracks/abc-123",
        "/focus/abc-123",
        "/",
        "/calendar",
        "/sessions",
      ]),
    );
    expect(calls).toHaveLength(6);
  });
});
