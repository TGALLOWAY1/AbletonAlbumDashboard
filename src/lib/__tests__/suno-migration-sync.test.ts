import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCTION_ACTIVITY_KEYS } from "@/lib/production-activities";
import {
  SUNO_CANDIDATE_DECISIONS,
  SUNO_EXPERIMENT_STATUSES,
  VERSION_KINDS,
  VERSION_REVIEW_STATUSES,
  VERSION_SOURCES,
} from "@/lib/suno";

// Cross-module invariant (same spirit as nav-consistency.test.ts): the check
// constraints in the Suno migration must stay in sync with the unions in
// src/lib — drift in either direction would let the app write rows the DB
// rejects, or vice versa.

const MIGRATION = readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/0019_suno_round_trip.sql"),
  "utf8",
);

/** Extracts the quoted values of the first `check (<column> in (...))` list
 * that follows the given marker (constraint name or column-definition regex). */
function checkListAfter(marker: string | RegExp): string[] {
  const start =
    typeof marker === "string"
      ? MIGRATION.indexOf(marker)
      : (MIGRATION.search(marker) as number);
  expect(start, `marker ${marker} present in migration`).toBeGreaterThan(-1);
  const tail = MIGRATION.slice(start);
  const match = tail.match(/check \([^(]*in \(([^)]+)\)/);
  expect(match, `check list after ${marker}`).not.toBeNull();
  return [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("0019 migration ↔ src/lib sync", () => {
  it("kind constraint matches VERSION_KINDS", () => {
    expect(checkListAfter("track_versions_kind_check")).toEqual([
      ...VERSION_KINDS,
    ]);
  });

  it("source constraint matches VERSION_SOURCES", () => {
    expect(checkListAfter("track_versions_source_check")).toEqual([
      ...VERSION_SOURCES,
    ]);
  });

  it("review_status constraint matches VERSION_REVIEW_STATUSES", () => {
    expect(checkListAfter("track_versions_review_status_check")).toEqual([
      ...VERSION_REVIEW_STATUSES,
    ]);
  });

  it("experiment status constraint matches SUNO_EXPERIMENT_STATUSES", () => {
    expect(
      checkListAfter(/status\s+text not null default 'ready_to_send'/),
    ).toEqual([...SUNO_EXPERIMENT_STATUSES]);
  });

  it("candidate decision constraint matches SUNO_CANDIDATE_DECISIONS", () => {
    expect(
      checkListAfter(/decision\s+text not null default 'unreviewed'/),
    ).toEqual([...SUNO_CANDIDATE_DECISIONS]);
  });

  it("activity_key constraint matches PRODUCTION_ACTIVITY_KEYS", () => {
    expect(checkListAfter("session_activities_activity_key_check")).toEqual([
      ...PRODUCTION_ACTIVITY_KEYS,
    ]);
  });

  it("locks down both new tables with RLS", () => {
    expect(MIGRATION).toMatch(
      /alter table suno_experiments enable row level security;/,
    );
    expect(MIGRATION).toMatch(
      /alter table suno_candidates\s+enable row level security;/,
    );
  });

  it("scopes the one-open-per-track index to non-terminal statuses", () => {
    expect(MIGRATION).toMatch(
      /suno_experiments_one_open_per_track[\s\S]*?where status not in \('integrated', 'discarded'\)/,
    );
  });
});
