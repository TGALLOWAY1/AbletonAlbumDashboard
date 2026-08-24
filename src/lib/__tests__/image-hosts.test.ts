import { describe, expect, it } from "vitest";
import {
  matchesPattern,
  storagePatternFor,
  type RemoteImagePattern,
} from "@/lib/image-hosts";

const SUPABASE: RemoteImagePattern = {
  protocol: "https",
  hostname: "abc123.supabase.co",
  pathname: "/storage/v1/object/public/**",
};

const YOUTUBE: RemoteImagePattern = {
  protocol: "https",
  hostname: "img.youtube.com",
  pathname: "/vi/**",
};

describe("storagePatternFor", () => {
  it("derives the project host from the public Supabase URL", () => {
    expect(storagePatternFor("https://abc123.supabase.co")).toEqual(SUPABASE);
  });

  it("is null when the env var is missing or unparseable", () => {
    expect(storagePatternFor(undefined)).toBeNull();
    expect(storagePatternFor("")).toBeNull();
    expect(storagePatternFor("not a url")).toBeNull();
  });
});

describe("matchesPattern", () => {
  it("matches public storage objects at any depth", () => {
    expect(
      matchesPattern(
        "https://abc123.supabase.co/storage/v1/object/public/track-images/covers/id/1-2.png",
        SUPABASE,
      ),
    ).toBe(true);
  });

  it("rejects another project on the same provider", () => {
    expect(
      matchesPattern(
        "https://other.supabase.co/storage/v1/object/public/track-images/a.png",
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects signed and authenticated object paths", () => {
    expect(
      matchesPattern(
        "https://abc123.supabase.co/storage/v1/object/sign/track-audio/a.wav",
        SUPABASE,
      ),
    ).toBe(false);
    expect(
      matchesPattern(
        "https://abc123.supabase.co/storage/v1/object/authenticated/track-audio/a.wav",
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects plaintext http", () => {
    expect(
      matchesPattern(
        "http://abc123.supabase.co/storage/v1/object/public/track-images/a.png",
        SUPABASE,
      ),
    ).toBe(false);
  });

  it("rejects a non-URL", () => {
    expect(matchesPattern("covers/a.png", SUPABASE)).toBe(false);
  });

  it("does not let a wildcard escape its prefix", () => {
    expect(
      matchesPattern("https://img.youtube.com/other/abc.jpg", YOUTUBE),
    ).toBe(false);
    expect(
      matchesPattern("https://img.youtube.com/vi/abc/hqdefault.jpg", YOUTUBE),
    ).toBe(true);
  });
});
