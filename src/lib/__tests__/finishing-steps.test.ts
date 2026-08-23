import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MIGRATION_0023_MISSING_MESSAGE, isMissingTable } from "@/lib/migration-errors";
import {
  FINISHING_STEP_KEYS,
  FINISHING_STEP_LABELS,
  finishingStepsFromRows,
  type FinishingStepRow,
} from "@/lib/types";

const MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    "../../../supabase/migrations/0023_track_finishing_steps.sql",
  ),
  "utf8",
);

function row(
  step_key: string,
  completed_at: string | null = null,
): FinishingStepRow {
  return { track_id: "t1", step_key, completed_at };
}

// Same cross-module invariant as suno-migration-sync.test.ts: drift between
// the check constraint and the union would let the app write rows the database
// rejects, or leave a key the app can never render.
describe("0023 migration ↔ FINISHING_STEP_KEYS", () => {
  it("the step_key constraint lists exactly the keys the app knows", () => {
    const match = MIGRATION.match(/check \(step_key in \(([^)]+)\)/);
    expect(match, "step_key check list present").not.toBeNull();
    const keys = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(keys).toEqual([...FINISHING_STEP_KEYS]);
  });

  it("cascades with the track, so deleting a track leaves no orphans", () => {
    expect(MIGRATION).toContain("references tracks(id) on delete cascade");
  });

  it("keys on (track_id, step_key) — one row per step, upsertable", () => {
    expect(MIGRATION).toContain("primary key (track_id, step_key)");
  });

  it("enables RLS, like every other table since 0016", () => {
    expect(MIGRATION).toContain(
      "alter table track_finishing_steps enable row level security",
    );
  });
});

describe("finishingStepsFromRows", () => {
  it("always returns the three steps in render order", () => {
    expect(finishingStepsFromRows([]).map((s) => s.key)).toEqual([
      "suno_variations",
      "stems_midi",
      "ableton_cleanup",
    ]);
  });

  it("reads a track with no rows as three outstanding steps", () => {
    expect(finishingStepsFromRows([]).every((s) => s.completedAt === null)).toBe(
      true,
    );
  });

  it("defaults to outstanding when called with nothing at all", () => {
    // A database without 0023 applied hands the fetcher no rows.
    expect(finishingStepsFromRows()).toHaveLength(3);
  });

  it("carries the completion timestamp through", () => {
    const steps = finishingStepsFromRows([
      row("stems_midi", "2026-05-28T10:00:00.000Z"),
    ]);
    expect(steps.find((s) => s.key === "stems_midi")?.completedAt).toBe(
      "2026-05-28T10:00:00.000Z",
    );
    expect(steps.find((s) => s.key === "suno_variations")?.completedAt).toBeNull();
  });

  it("keeps render order regardless of the order rows come back in", () => {
    const steps = finishingStepsFromRows([
      row("ableton_cleanup", "2026-05-01T00:00:00.000Z"),
      row("suno_variations", "2026-04-01T00:00:00.000Z"),
    ]);
    expect(steps.map((s) => s.key)).toEqual([...FINISHING_STEP_KEYS]);
  });

  it("ignores a key the app does not know", () => {
    const steps = finishingStepsFromRows([row("mastering", "2026-05-01T00:00:00.000Z")]);
    expect(steps).toHaveLength(3);
    expect(steps.every((s) => s.completedAt === null)).toBe(true);
  });
});

describe("FINISHING_STEP_LABELS", () => {
  it("labels every key", () => {
    for (const key of FINISHING_STEP_KEYS) {
      expect(FINISHING_STEP_LABELS[key]).toBeTruthy();
    }
  });
});

describe("isMissingTable", () => {
  it("matches the two codes PostgREST uses for an unknown table", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
  });

  it("ignores a missing *column*, which has its own guard and message", () => {
    expect(isMissingTable({ code: "42703" })).toBe(false);
    expect(isMissingTable(new Error("boom"))).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});

// Same contract as setTrackSunoStatus: React replaces a *thrown* message with
// the generic render error in production, so the migration hint has to be
// returned to survive the trip.
describe("setFinishingStep error contract", () => {
  const SOURCE = readFileSync(
    path.resolve(__dirname, "../../app/actions/finishing-steps.ts"),
    "utf8",
  );

  it("names the file to run, so the message is actionable on its own", () => {
    expect(MIGRATION_0023_MISSING_MESSAGE).toContain(
      "0023_track_finishing_steps.sql",
    );
  });

  it("returns the migration message rather than throwing it", () => {
    expect(SOURCE).toContain("return { error: MIGRATION_0023_MISSING_MESSAGE }");
    expect(SOURCE).not.toContain("throw new Error(MIGRATION_0023_MISSING_MESSAGE)");
  });

  it("never throws at all — every exit reports through the return value", () => {
    expect(SOURCE).not.toMatch(/\bthrow\b/);
  });

  it("logs an unrecognised failure, which returning would otherwise swallow", () => {
    expect(SOURCE).toContain("logSupabaseError(");
  });

  it("refreshes both track surfaces through the shared helper", () => {
    expect(SOURCE).toContain("revalidateTrackSurfaces(trackId)");
  });
});
