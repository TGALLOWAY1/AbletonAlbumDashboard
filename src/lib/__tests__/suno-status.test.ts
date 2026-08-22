import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUNO_STATUS,
  nextSunoStatus,
  SUNO_STATUS_EMOJI,
  SUNO_STATUS_LABELS,
  SUNO_STATUSES,
  trackSunoStatus,
  type TrackRow,
} from "@/lib/types";

function migration(file: string): string {
  return readFileSync(
    path.resolve(__dirname, "../../../supabase/migrations/", file),
    "utf8",
  );
}

const MIGRATION = migration("0021_album_genre_track_suno.sql");
// 0022 widened the constraint to three states, so it — not 0021 — is the one
// that has to agree with SUNO_STATUSES.
const WIDENING = migration("0022_suno_status_error.sql");

function row(suno_status: string | null): Pick<TrackRow, "suno_status"> {
  return { suno_status } as Pick<TrackRow, "suno_status">;
}

describe("trackSunoStatus", () => {
  it("reads a stored status", () => {
    expect(trackSunoStatus(row("done"))).toBe("done");
    expect(trackSunoStatus(row("todo"))).toBe("todo");
    expect(trackSunoStatus(row("error"))).toBe("error");
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
  it("cycles through the three states", () => {
    expect(nextSunoStatus("todo")).toBe("done");
    expect(nextSunoStatus("done")).toBe("error");
    expect(nextSunoStatus("error")).toBe("todo");
  });

  it("keeps marking a track done one click from todo", () => {
    expect(nextSunoStatus(DEFAULT_SUNO_STATUS)).toBe("done");
  });

  it("round-trips back to where it started", () => {
    for (const status of SUNO_STATUSES) {
      let seen = status;
      for (let i = 0; i < SUNO_STATUSES.length; i++) seen = nextSunoStatus(seen);
      expect(seen).toBe(status);
    }
  });

  it("visits every state on the way round", () => {
    let seen = DEFAULT_SUNO_STATUS;
    const visited = SUNO_STATUSES.map(() => {
      const current = seen;
      seen = nextSunoStatus(seen);
      return current;
    });
    expect(new Set(visited)).toEqual(new Set(SUNO_STATUSES));
  });
});

describe("status presentation", () => {
  it("gives every state a distinct emoji and label", () => {
    const emoji = SUNO_STATUSES.map((s) => SUNO_STATUS_EMOJI[s]);
    const labels = SUNO_STATUSES.map((s) => SUNO_STATUS_LABELS[s]);
    expect(new Set(emoji).size).toBe(SUNO_STATUSES.length);
    expect(new Set(labels).size).toBe(SUNO_STATUSES.length);
    expect(emoji.every((e) => e.length > 0)).toBe(true);
  });
});

// Same invariant as suno-migration-sync.test.ts: the check constraint and the
// union must not drift, in either direction.
describe("0022 migration ↔ src/lib sync", () => {
  it("suno_status constraint matches SUNO_STATUSES", () => {
    const match = WIDENING.match(
      /tracks_suno_status_check[\s\S]*?check \(suno_status in \(([^)]+)\)/,
    );
    expect(match).not.toBeNull();
    const values = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(values).toEqual([...SUNO_STATUSES]);
  });

  it("drops 0021's narrower constraint before replacing it", () => {
    expect(WIDENING).toMatch(
      /drop constraint if exists tracks_suno_status_check/,
    );
    expect(WIDENING.indexOf("drop constraint")).toBeLessThan(
      WIDENING.indexOf("add constraint"),
    );
  });
});

describe("0021 migration ↔ src/lib sync", () => {
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
