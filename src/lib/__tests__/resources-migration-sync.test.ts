import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESOURCE_CATEGORIES, RESOURCE_TYPES } from "@/lib/data/resources";
import {
  MIGRATION_0035_MISSING_MESSAGE,
  RESOURCES_CATEGORY_CONSTRAINT,
  RESOURCES_RATING_CONSTRAINT,
} from "@/lib/migration-errors";
import { RESOURCE_RATING_VALUES } from "@/lib/resource-shelf";

// Same spirit as library-migration-sync.test.ts: the category list the app
// writes must stay inside the constraint the database enforces. Drift lets the
// Add Resource dialog offer a category every insert into it will bounce.

function migration(file: string): string {
  return readFileSync(
    path.resolve(__dirname, "../../../supabase/migrations", file),
    "utf8",
  );
}

function checkListAfter(sql: string, marker: string): string[] {
  const start = sql.indexOf(marker);
  expect(start, `marker ${marker} present in migration`).toBeGreaterThan(-1);
  const tail = sql.slice(start);
  // [\s\S] rather than the `s` flag — tsconfig targets below es2018.
  const match = tail.match(/check \([^(]*in \(([^)]+)\)/);
  expect(match, `check list after ${marker}`).not.toBeNull();
  return [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("0026 migration ↔ RESOURCE_CATEGORIES sync", () => {
  const sql = migration("0026_resources_live_performance.sql");

  it("category constraint matches the categories the app offers", () => {
    expect(checkListAfter(sql, RESOURCES_CATEGORY_CONSTRAINT)).toEqual(
      RESOURCE_CATEGORIES.map((c) => c.id),
    );
  });

  it("names the constraint the create action matches on", () => {
    // Unnamed, the app could not tell this violation from any other and would
    // fall back to a generic "try again" instead of naming the migration.
    expect(sql).toContain(`add constraint ${RESOURCES_CATEGORY_CONSTRAINT}`);
  });

  it("keeps Live Performance — the category 0011 predates", () => {
    const original = checkListAfter(
      migration("0011_resources.sql"),
      "category_id",
    );
    expect(original).not.toContain("live-performance");
    expect(checkListAfter(sql, RESOURCES_CATEGORY_CONSTRAINT)).toContain(
      "live-performance",
    );
  });

  it("type constraint still matches RESOURCE_TYPES", () => {
    expect(checkListAfter(migration("0011_resources.sql"), "type")).toEqual([
      ...RESOURCE_TYPES,
    ]);
  });
});

describe("0035 migration ↔ the rating/learning/pin columns", () => {
  const sql = migration("0035_resource_learning.sql");

  it("rating constraint matches the stars the app offers", () => {
    const allowed = [...sql.matchAll(/rating in \(([^)]+)\)/g)]
      .flatMap((match) => [...match[1].matchAll(/(\d+)/g)])
      .map((m) => Number(m[1]));
    expect(allowed).toEqual([...RESOURCE_RATING_VALUES]);
  });

  it("names the constraint the rating action matches on", () => {
    // Unnamed, `setResourceRating` could not tell this violation from any
    // other and would fall back to a generic "try again" — the lesson 0026
    // added its own name for.
    expect(sql).toContain(`add constraint ${RESOURCES_RATING_CONSTRAINT}`);
  });

  it("adds all three columns this migration's message promises", () => {
    for (const column of ["rating", "archived_at", "pinned_at"]) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
  });

  it("leaves every column nullable, so no row needs a backfill", () => {
    // A `not null` here would fail on an existing library, and a default would
    // invent a rating (or a learning) for material nobody has judged yet.
    expect(sql).not.toMatch(/add column if not exists \w+ [^;]*not null/i);
    expect(sql).not.toMatch(/add column if not exists \w+ [^;]*default/i);
  });

  it("points the user at its own filename when the column is missing", () => {
    expect(MIGRATION_0035_MISSING_MESSAGE).toContain(
      "supabase/migrations/0035_resource_learning.sql",
    );
  });

  it("indexes the two partial reads the shelves actually make", () => {
    expect(sql).toMatch(/resources_owner_archived_idx[\s\S]*archived_at is not null/);
    expect(sql).toMatch(/resources_owner_pinned_idx[\s\S]*pinned_at is not null/);
  });
});
