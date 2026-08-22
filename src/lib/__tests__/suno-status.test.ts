import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUNO_STATUS,
  nextSunoStatus,
  SUNO_STATUSES,
  trackSunoStatus,
  type TrackRow,
} from "@/lib/types";

const MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    "../../../supabase/migrations/0021_album_genre_track_suno.sql",
  ),
  "utf8",
);

function row(suno_status: string | null): Pick<TrackRow, "suno_status"> {
  return { suno_status } as Pick<TrackRow, "suno_status">;
}

describe("trackSunoStatus", () => {
  it("reads a stored status", () => {
    expect(trackSunoStatus(row("done"))).toBe("done");
    expect(trackSunoStatus(row("todo"))).toBe("todo");
  });

  it("falls back to todo for rows written before migration 0021", () => {
    expect(trackSunoStatus(row(null))).toBe(DEFAULT_SUNO_STATUS);
    expect(DEFAULT_SUNO_STATUS).toBe("todo");
  });

  it("falls back to todo for an unrecognised value", () => {
    expect(trackSunoStatus(row("in_progress"))).toBe("todo");
  });
});

describe("nextSunoStatus", () => {
  it("flips between the two states", () => {
    expect(nextSunoStatus("todo")).toBe("done");
    expect(nextSunoStatus("done")).toBe("todo");
  });

  it("round-trips back to where it started", () => {
    for (const status of SUNO_STATUSES) {
      expect(nextSunoStatus(nextSunoStatus(status))).toBe(status);
    }
  });
});

// Same invariant as suno-migration-sync.test.ts: the check constraint and the
// union must not drift, in either direction.
describe("0021 migration ↔ src/lib sync", () => {
  it("suno_status constraint matches SUNO_STATUSES", () => {
    const match = MIGRATION.match(
      /tracks_suno_status_check[\s\S]*?check \(suno_status in \(([^)]+)\)/,
    );
    expect(match).not.toBeNull();
    const values = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(values).toEqual([...SUNO_STATUSES]);
  });

  it("defaults the column to the default status", () => {
    expect(MIGRATION).toMatch(
      new RegExp(
        `suno_status text not null default '${DEFAULT_SUNO_STATUS}'`,
      ),
    );
  });

  it("adds the album-level genre column", () => {
    expect(MIGRATION).toMatch(/alter table albums add column if not exists genre text;/);
  });
});
