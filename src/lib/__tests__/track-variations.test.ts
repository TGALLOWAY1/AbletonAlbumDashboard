import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MIGRATION_0031_MISSING_MESSAGE } from "@/lib/migration-errors";
import {
  FINISHING_STEP_KEYS,
  trackVariationFromRow,
  type TrackVariationRow,
  type TrackVariationStepRow,
} from "@/lib/types";

const MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    "../../../supabase/migrations/0031_track_variations.sql",
  ),
  "utf8",
);

const VARIATION: TrackVariationRow = {
  id: "v1",
  track_id: "t1",
  name: "Radio Edit",
  created_at: "2026-08-01T00:00:00.000Z",
};

function stepRow(
  step_key: string,
  completed_at: string | null = null,
): TrackVariationStepRow {
  return { variation_id: "v1", step_key, completed_at };
}

// Same cross-module invariant as finishing-steps.test.ts: the variation
// checklist reuses FINISHING_STEP_KEYS, so its check constraint has to carry
// the identical list or the app writes rows the database rejects.
describe("0031 migration ↔ FINISHING_STEP_KEYS", () => {
  it("the step_key constraint lists exactly the keys the app knows", () => {
    const match = MIGRATION.match(/check \(step_key in \(([^)]+)\)/);
    expect(match, "step_key check list present").not.toBeNull();
    const keys = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(keys).toEqual([...FINISHING_STEP_KEYS]);
  });

  it("variations cascade with the track, steps cascade with the variation", () => {
    expect(MIGRATION).toContain("references tracks(id) on delete cascade");
    expect(MIGRATION).toContain(
      "references track_variations(id) on delete cascade",
    );
  });

  it("keys steps on (variation_id, step_key) — one row per step, upsertable", () => {
    expect(MIGRATION).toContain("primary key (variation_id, step_key)");
  });

  it("rejects a blank variation name at the database too", () => {
    expect(MIGRATION).toContain("check (length(trim(name)) > 0)");
  });

  it("enables RLS on both tables, like every other table since 0016", () => {
    expect(MIGRATION).toContain(
      "alter table track_variations enable row level security",
    );
    expect(MIGRATION).toContain(
      "alter table track_variation_steps enable row level security",
    );
  });
});

describe("trackVariationFromRow", () => {
  it("always returns every step in render order", () => {
    const variation = trackVariationFromRow(VARIATION, []);
    expect(variation.steps.map((s) => s.key)).toEqual([...FINISHING_STEP_KEYS]);
  });

  it("reads a fresh variation (no step rows) as all-outstanding", () => {
    const variation = trackVariationFromRow(VARIATION);
    expect(variation.steps.every((s) => s.completedAt === null)).toBe(true);
  });

  it("carries identity and the completion timestamps through", () => {
    const variation = trackVariationFromRow(VARIATION, [
      stepRow("sound_palette", "2026-08-02T10:00:00.000Z"),
    ]);
    expect(variation.id).toBe("v1");
    expect(variation.name).toBe("Radio Edit");
    expect(variation.createdAt).toBe("2026-08-01T00:00:00.000Z");
    expect(
      variation.steps.find((s) => s.key === "sound_palette")?.completedAt,
    ).toBe("2026-08-02T10:00:00.000Z");
    expect(
      variation.steps.find((s) => s.key === "suno_variations")?.completedAt,
    ).toBeNull();
  });

  it("ignores a key the app does not know", () => {
    const variation = trackVariationFromRow(VARIATION, [
      stepRow("mastering", "2026-08-02T10:00:00.000Z"),
    ]);
    expect(variation.steps).toHaveLength(FINISHING_STEP_KEYS.length);
    expect(variation.steps.every((s) => s.completedAt === null)).toBe(true);
  });
});

// Same contract as setFinishingStep: failures are returned, not thrown, and a
// pre-0031 database gets a message naming the file to run. The no-throw and
// logging assertions in finishing-steps.test.ts scan the whole actions file,
// so they already cover the variation actions too.
describe("variation actions error contract", () => {
  const SOURCE = readFileSync(
    path.resolve(__dirname, "../../app/actions/finishing-steps.ts"),
    "utf8",
  );

  it("names the file to run, so the message is actionable on its own", () => {
    expect(MIGRATION_0031_MISSING_MESSAGE).toContain(
      "0031_track_variations.sql",
    );
  });

  it("every variation action returns the 0031 message on a missing table", () => {
    const returns = SOURCE.match(
      /return \{ error: MIGRATION_0031_MISSING_MESSAGE \}/g,
    );
    // addTrackVariation, deleteTrackVariation, setVariationStep.
    expect(returns).toHaveLength(3);
  });

  it("upserts variation ticks on (variation_id, step_key)", () => {
    expect(SOURCE).toContain('{ onConflict: "variation_id,step_key" }');
  });
});
