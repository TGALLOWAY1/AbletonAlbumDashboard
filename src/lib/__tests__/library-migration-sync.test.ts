import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRESET_CATEGORIES } from "@/lib/data/library";
import {
  LIBRARY_ARTWORK_BUCKET,
  LIBRARY_PREVIEW_BUCKET,
} from "@/lib/library-storage";

// Same spirit as suno-migration-sync.test.ts: the constraints and bucket names
// in the Library migration must stay in sync with the constants in src/lib.
// Drift in either direction lets the app write rows Postgres rejects, upload
// into a bucket that doesn't exist, or quietly strand a category.

const MIGRATION = readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/0020_library_redesign.sql"),
  "utf8",
);

function checkListAfter(marker: string): string[] {
  const start = MIGRATION.indexOf(marker);
  expect(start, `marker ${marker} present in migration`).toBeGreaterThan(-1);
  const tail = MIGRATION.slice(start);
  // [\s\S] rather than the `s` flag — tsconfig targets below es2018.
  const match = tail.match(/check \([^(]*in \(([^)]+)\)/);
  expect(match, `check list after ${marker}`).not.toBeNull();
  return [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("0020 migration ↔ src/lib sync", () => {
  it("preset category constraint matches PRESET_CATEGORIES", () => {
    expect(checkListAfter("library_presets_category_check")).toEqual([
      ...PRESET_CATEGORIES,
    ]);
  });

  it("creates the buckets the upload code writes to", () => {
    expect(MIGRATION).toContain(`'${LIBRARY_PREVIEW_BUCKET}'`);
    expect(MIGRATION).toContain(`'${LIBRARY_ARTWORK_BUCKET}'`);
  });

  it("keeps previews private and artwork public", () => {
    // Previews are signed on read; artwork is embedded directly via getPublicUrl.
    expect(MIGRATION).toMatch(
      new RegExp(`'${LIBRARY_PREVIEW_BUCKET}',\\s*'${LIBRARY_PREVIEW_BUCKET}',\\s*false`),
    );
    expect(MIGRATION).toMatch(
      new RegExp(`'${LIBRARY_ARTWORK_BUCKET}',\\s*'${LIBRARY_ARTWORK_BUCKET}',\\s*true`),
    );
  });

  it("grants all four object policies on each bucket", () => {
    for (const bucket of [LIBRARY_PREVIEW_BUCKET, LIBRARY_ARTWORK_BUCKET]) {
      for (const verb of ["read", "insert", "update", "delete"]) {
        expect(MIGRATION, `${verb} policy for ${bucket}`).toContain(
          `create policy "anon ${verb} ${bucket}"`,
        );
      }
    }
  });

  it("cascades collection membership on asset delete", () => {
    // This is what makes "deleting an asset removes dangling collection
    // references" a database guarantee rather than application cleanup.
    expect(MIGRATION).toMatch(
      /loop_stack_id uuid references library_loop_stacks\(id\) on delete cascade/,
    );
    expect(MIGRATION).toMatch(
      /preset_id\s+uuid references library_presets\(id\)\s+on delete cascade/,
    );
    expect(MIGRATION).toMatch(
      /collection_id uuid not null\s+references library_collections\(id\) on delete cascade/,
    );
  });

  it("allows exactly one asset reference per collection item", () => {
    expect(MIGRATION).toContain("library_collection_items_one_asset");
  });

  it("locks down every new table with RLS", () => {
    for (const table of [
      "library_loop_stacks",
      "library_presets",
      "library_collections",
      "library_collection_items",
    ]) {
      expect(MIGRATION, `RLS on ${table}`).toMatch(
        new RegExp(`alter table ${table}\\s+enable row level security`),
      );
    }
  });

  it("drops the legacy instruments table", () => {
    expect(MIGRATION).toContain("drop table if exists instruments;");
  });
});
