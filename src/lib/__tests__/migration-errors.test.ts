import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isCheckViolation,
  isMissingColumn,
  MIGRATION_0021_MISSING_MESSAGE,
  MIGRATION_0022_MISSING_MESSAGE,
} from "@/lib/migration-errors";

// These guards exist so a not-yet-applied migration surfaces a sentence the
// user can act on. Matching is only half of it: in a production build React
// replaces the message of anything a server action *throws* with the generic
// "An error occurred in the Server Components render", so the matched message
// has to be *returned* to survive the trip. See the contract test below.

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

// Guards against a regression to `throw new Error(MESSAGE)`, which reads as if
// it works — and does, in dev — while showing users nothing in production.
describe("setTrackSunoStatus error contract", () => {
  const SOURCE = readFileSync(
    path.resolve(__dirname, "../../app/actions/tracks.ts"),
    "utf8",
  );

  function body(name: string): string {
    const start = SOURCE.indexOf(`export async function ${name}(`);
    expect(start, `${name} present`).toBeGreaterThan(-1);
    const next = SOURCE.indexOf("\nexport ", start + 1);
    return SOURCE.slice(start, next === -1 ? undefined : next);
  }

  it("returns the migration messages rather than throwing them", () => {
    const action = body("setTrackSunoStatus");
    for (const message of [
      "MIGRATION_0021_MISSING_MESSAGE",
      "MIGRATION_0022_MISSING_MESSAGE",
    ]) {
      expect(action).toContain(`return { error: ${message} }`);
      expect(action).not.toContain(`throw new Error(${message})`);
    }
  });

  it("never throws at all — every exit reports through the return value", () => {
    expect(body("setTrackSunoStatus")).not.toMatch(/\bthrow\b/);
  });

  it("logs an unrecognised failure, which returning would otherwise swallow", () => {
    expect(body("setTrackSunoStatus")).toContain("logSupabaseError(");
  });
});
