import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MIGRATION_0034_MISSING_MESSAGE,
  STEP_NOTE_STEP_CONSTRAINT,
} from "@/lib/migration-errors";
import {
  addStepNoteSchema,
  countStepNotes,
  STEP_NOTE_IMAGE_BUCKET,
  STEP_NOTE_KINDS,
  stepNoteFromRow,
  stepNoteImageKey,
  stepNotesHref,
  updateStepNoteSchema,
  type StepNoteRow,
} from "@/lib/step-notes";
import {
  FINISHING_STEP_KEYS,
  finishingStepsFromRows,
  trackVariationFromRow,
} from "@/lib/types";

const MIGRATION = readFileSync(
  path.resolve(__dirname, "../../../supabase/migrations/0034_track_step_notes.sql"),
  "utf8",
);

const TRACK = "11111111-1111-4111-8111-111111111111";
const VARIATION = "22222222-2222-4222-8222-222222222222";

function row(overrides: Partial<StepNoteRow> = {}): StepNoteRow {
  return {
    id: "n1",
    track_id: TRACK,
    variation_id: null,
    step_key: "sound_palette",
    kind: "markdown",
    title: "",
    content: "# Palette",
    image_path: null,
    image_width: null,
    image_height: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

// Same cross-module invariant as finishing-steps.test.ts: the notes table
// keys on FINISHING_STEP_KEYS, so its check constraint has to carry the
// identical list or a note on a new step is a row the database rejects.
describe("0034 migration ↔ app constants", () => {
  it("the step_key constraint lists exactly the keys the app knows", () => {
    const match = MIGRATION.match(/check \(step_key in \(([^)]+)\)/);
    expect(match, "step_key check list present").not.toBeNull();
    const keys = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(keys).toEqual([...FINISHING_STEP_KEYS]);
  });

  it("the kind constraint lists exactly the kinds the app can add", () => {
    const match = MIGRATION.match(/check \(kind in \(([^)]+)\)/);
    expect(match, "kind check list present").not.toBeNull();
    const kinds = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(kinds).toEqual([...STEP_NOTE_KINDS]);
  });

  it("names the step constraint the app matches on", () => {
    expect(MIGRATION).toContain(`constraint ${STEP_NOTE_STEP_CONSTRAINT} check`);
  });

  it("requires the body for the chosen kind, like resources do", () => {
    expect(MIGRATION).toContain("(kind = 'markdown' and content is not null)");
    expect(MIGRATION).toContain("(kind = 'image' and image_path is not null)");
  });

  it("cascades with the track and with the variation", () => {
    expect(MIGRATION).toContain("references tracks(id) on delete cascade");
    expect(MIGRATION).toContain(
      "references track_variations(id) on delete cascade",
    );
  });

  it("enables RLS, like every other table since 0016", () => {
    expect(MIGRATION).toContain(
      "alter table track_step_notes enable row level security",
    );
  });
});

describe("stepNotesHref", () => {
  it("is one route under the desktop track path, for both surfaces", () => {
    expect(stepNotesHref(TRACK, "mixing_tips")).toBe(
      `/tracks/${TRACK}/finishing/mixing_tips`,
    );
  });

  it("carries a variation in the query so the path keeps its shape", () => {
    expect(stepNotesHref(TRACK, "mixing_tips", VARIATION)).toBe(
      `/tracks/${TRACK}/finishing/mixing_tips?variation=${VARIATION}`,
    );
    expect(stepNotesHref(TRACK, "mixing_tips", null)).toBe(
      `/tracks/${TRACK}/finishing/mixing_tips`,
    );
  });
});

describe("stepNoteFromRow", () => {
  it("maps a markdown row and leaves the image fields empty", () => {
    const note = stepNoteFromRow(row(), "https://example.test/ignored");
    expect(note).toMatchObject({
      id: "n1",
      trackId: TRACK,
      variationId: null,
      stepKey: "sound_palette",
      kind: "markdown",
      content: "# Palette",
      imageUrl: null,
      imageWidth: null,
      imageHeight: null,
    });
  });

  it("maps an image row with the resolved public URL and its size", () => {
    const note = stepNoteFromRow(
      row({
        kind: "image",
        content: null,
        image_path: `step-notes/${TRACK}/1-a.webp`,
        image_width: 1179,
        image_height: 2556,
        variation_id: VARIATION,
      }),
      "https://example.test/public/1-a.webp",
    );
    expect(note).toMatchObject({
      kind: "image",
      variationId: VARIATION,
      content: null,
      imageUrl: "https://example.test/public/1-a.webp",
      imageWidth: 1179,
      imageHeight: 2556,
    });
  });

  it("skips a row whose kind or step the app does not know", () => {
    expect(stepNoteFromRow(row({ kind: "video" }), null)).toBeNull();
    expect(stepNoteFromRow(row({ step_key: "mastering" }), null)).toBeNull();
  });
});

describe("countStepNotes", () => {
  it("counts per step, split by the track's checklist vs. a variation's", () => {
    const { byTrack, byVariation } = countStepNotes([
      { track_id: TRACK, variation_id: null, step_key: "sound_palette" },
      { track_id: TRACK, variation_id: null, step_key: "sound_palette" },
      { track_id: TRACK, variation_id: null, step_key: "stems_midi" },
      { track_id: TRACK, variation_id: VARIATION, step_key: "sound_palette" },
      { track_id: TRACK, variation_id: null, step_key: "mastering" },
    ]);
    expect(byTrack.get(TRACK)).toEqual({ sound_palette: 2, stems_midi: 1 });
    expect(byVariation.get(VARIATION)).toEqual({ sound_palette: 1 });
  });

  it("carries through to the checklist rows, defaulting to zero", () => {
    const { byTrack, byVariation } = countStepNotes([
      { track_id: TRACK, variation_id: null, step_key: "mixing_tips" },
      { track_id: TRACK, variation_id: VARIATION, step_key: "core_elements" },
    ]);
    const steps = finishingStepsFromRows([], byTrack.get(TRACK));
    expect(steps.find((s) => s.key === "mixing_tips")?.noteCount).toBe(1);
    expect(steps.find((s) => s.key === "core_elements")?.noteCount).toBe(0);

    const variation = trackVariationFromRow(
      { id: VARIATION, track_id: TRACK, name: "Radio Edit", created_at: "2026-08-01T00:00:00.000Z" },
      [],
      byVariation.get(VARIATION),
    );
    expect(variation.steps.find((s) => s.key === "core_elements")?.noteCount).toBe(1);
    expect(variation.steps.find((s) => s.key === "mixing_tips")?.noteCount).toBe(0);
  });

  it("reads a database without 0034 as no notes, not a broken checklist", () => {
    expect(finishingStepsFromRows().every((s) => s.noteCount === 0)).toBe(true);
  });
});

describe("addStepNoteSchema", () => {
  const base = { trackId: TRACK, variationId: null, stepKey: "sound_palette" as const };

  it("accepts a markdown note and trims its title", () => {
    const parsed = addStepNoteSchema.safeParse({
      ...base,
      kind: "markdown",
      title: "  Palette  ",
      content: "# Palette",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.title).toBe("Palette");
  });

  it("rejects an empty markdown body with a message the dialog can show", () => {
    const parsed = addStepNoteSchema.safeParse({
      ...base,
      kind: "markdown",
      content: "   ",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Write something before saving.");
    }
  });

  it("requires an uploaded object on an image note", () => {
    expect(
      addStepNoteSchema.safeParse({ ...base, kind: "image", imagePath: "" }).success,
    ).toBe(false);
    const ok = addStepNoteSchema.safeParse({
      ...base,
      kind: "image",
      imagePath: `step-notes/${TRACK}/1-a.webp`,
      imageWidth: 800,
      imageHeight: 600,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects a step the app does not know", () => {
    expect(
      addStepNoteSchema.safeParse({
        ...base,
        stepKey: "mastering",
        kind: "markdown",
        content: "x",
      }).success,
    ).toBe(false);
  });

  it("updates take an optional body — an image note has none to edit", () => {
    expect(
      updateStepNoteSchema.safeParse({ noteId: VARIATION, trackId: TRACK, title: "" })
        .success,
    ).toBe(true);
  });
});

describe("image storage", () => {
  it("shares the public covers bucket, under its own prefix per track", () => {
    expect(STEP_NOTE_IMAGE_BUCKET).toBe("track-images");
    expect(stepNoteImageKey(TRACK, "webp", 1700000000000, "abc")).toBe(
      `step-notes/${TRACK}/1700000000000-abc.webp`,
    );
  });
});

// Same contract as setFinishingStep: failures are returned, not thrown, and a
// pre-0034 database gets a message naming the file to run.
describe("step-note actions error contract", () => {
  const SOURCE = readFileSync(
    path.resolve(__dirname, "../../app/actions/step-notes.ts"),
    "utf8",
  );

  it("names the file to run, so the message is actionable on its own", () => {
    expect(MIGRATION_0034_MISSING_MESSAGE).toContain("0034_track_step_notes.sql");
  });

  it("every action returns the 0034 message on a missing table", () => {
    const returns = SOURCE.match(
      /return \{ error: MIGRATION_0034_MISSING_MESSAGE \}/g,
    );
    // addStepNote, updateStepNote, deleteStepNote.
    expect(returns).toHaveLength(3);
  });

  it("never throws at all — every exit reports through the return value", () => {
    expect(SOURCE).not.toMatch(/\bthrow\b/);
  });

  it("logs an unrecognised failure, which returning would otherwise swallow", () => {
    expect(SOURCE).toContain("logSupabaseError(");
  });

  it("refreshes both track surfaces through the shared helper, plus its own page", () => {
    expect(SOURCE).toContain("revalidateTrackSurfaces(trackId)");
    expect(SOURCE).toContain("revalidatePath(stepNotesHref(trackId, stepKey))");
  });

  it("removes the stored image when an image note is deleted", () => {
    expect(SOURCE).toContain(".remove([existing.image_path])");
  });
});

// A track or a variation is deleted as a parent row and its notes cascade
// away in the database, which never tells storage. Each deleting action has
// to list the image keys before the delete and remove them after it — that
// order, so a delete that fails cannot leave notes pointing at missing files.
describe("parent deletion sweeps note images", () => {
  function body(source: string, name: string): string {
    const start = source.indexOf(`export async function ${name}(`);
    expect(start, `${name} present`).toBeGreaterThan(-1);
    const next = source.indexOf("\nexport ", start + 1);
    return source.slice(start, next === -1 ? undefined : next);
  }

  it.each([
    ["deleteTrackVariation", "../../app/actions/finishing-steps.ts", "{ variationId }"],
    ["deleteTrack", "../../app/actions/tracks.ts", "trackId: id"],
  ])("%s lists the keys, deletes, then removes the files", (name, file, scope) => {
    const action = body(
      readFileSync(path.resolve(__dirname, file), "utf8"),
      name,
    );
    const list = action.indexOf("listStepNoteImagePaths(");
    const del = action.indexOf(".delete()");
    const remove = action.indexOf("removeStepNoteImages(");
    expect(list, "lists before deleting").toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(list);
    expect(remove, "removes after deleting").toBeGreaterThan(del);
    expect(action).toContain(scope);
  });
});

// While an image is uploading, or a note is saving, closing the add dialog
// would remove an upload that is about to belong to a row.
describe("add-note dialog", () => {
  const SOURCE = readFileSync(
    path.resolve(
      __dirname,
      "../../components/step-notes/add-step-note-dialog.tsx",
    ),
    "utf8",
  );

  it("refuses to close while an upload or a save is in flight", () => {
    expect(SOURCE).toContain("if (!next && (submitting || uploading)) return;");
  });
});
