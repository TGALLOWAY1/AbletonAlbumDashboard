import { describe, expect, it } from "vitest";
import {
  isCheckViolation,
  isMissingColumn,
  MIGRATION_0021_MISSING_MESSAGE,
  MIGRATION_0022_MISSING_MESSAGE,
} from "@/lib/migration-errors";

// These guards exist so a not-yet-applied migration surfaces a sentence the
// user can act on. In a production build Next redacts anything else a server
// action throws down to "An error occurred in the Server Components render",
// so a guard that fails to match doesn't degrade — it goes opaque.

describe("isMissingColumn", () => {
  it("matches the two codes PostgREST uses for an unknown column", () => {
    expect(isMissingColumn({ code: "42703" })).toBe(true);
    expect(isMissingColumn({ code: "PGRST204" })).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMissingColumn({ code: "23514" })).toBe(false);
    expect(isMissingColumn(new Error("boom"))).toBe(false);
    expect(isMissingColumn(null)).toBe(false);
  });
});

describe("isCheckViolation", () => {
  const violation = {
    code: "23514",
    message:
      'new row for relation "tracks" violates check constraint "tracks_suno_status_check"',
  };

  it("matches a check violation, and narrows to a named constraint", () => {
    expect(isCheckViolation(violation)).toBe(true);
    expect(isCheckViolation(violation, "tracks_suno_status_check")).toBe(true);
  });

  it("does not claim a violation raised by a different constraint", () => {
    expect(isCheckViolation(violation, "tracks_status_check")).toBe(false);
  });

  it("ignores unrelated errors", () => {
    expect(isCheckViolation({ code: "42703" })).toBe(false);
    expect(isCheckViolation(new Error("boom"))).toBe(false);
    expect(isCheckViolation(null)).toBe(false);
  });

  it("survives an error with no message when no constraint is named", () => {
    expect(isCheckViolation({ code: "23514" })).toBe(true);
    expect(isCheckViolation({ code: "23514" }, "tracks_suno_status_check")).toBe(
      false,
    );
  });
});

describe("migration messages", () => {
  it("name the file to run, so the message is actionable on its own", () => {
    expect(MIGRATION_0021_MISSING_MESSAGE).toContain(
      "0021_album_genre_track_suno.sql",
    );
    expect(MIGRATION_0022_MISSING_MESSAGE).toContain(
      "0022_suno_status_error.sql",
    );
  });
});
