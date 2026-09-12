import { z } from "zod";
import type { Database } from "@/lib/database.types";
import {
  FINISHING_STEP_KEYS,
  type FinishingStepKey,
  type StepNoteCounts,
} from "@/lib/types";

/**
 * Notes on a finishing step (migration 0034).
 *
 * Each row of the finishing checklist is a topic — "Build sound palette with
 * ChatGPT" produces a palette, "Save arrangement favorites" produces a
 * screenshot of what was kept — and a note is where that output lives. Same
 * shape as a resource: one note is one kind, inline markdown or an uploaded
 * image, and a step can carry any number of them. This module owns the
 * shapes, the URL of a step's notes page, and the pure row-to-note and
 * counting helpers so the fetcher, the actions and the tests agree.
 */

export const STEP_NOTE_KINDS = ["markdown", "image"] as const;
export type StepNoteKind = (typeof STEP_NOTE_KINDS)[number];

export const STEP_NOTE_KIND_LABELS: Record<StepNoteKind, string> = {
  markdown: "Markdown",
  image: "Image",
};

export function isStepNoteKind(value: string): value is StepNoteKind {
  return STEP_NOTE_KINDS.includes(value as StepNoteKind);
}

export function isFinishingStepKey(value: string): value is FinishingStepKey {
  return FINISHING_STEP_KEYS.includes(value as FinishingStepKey);
}

export type StepNoteRow = Database["public"]["Tables"]["track_step_notes"]["Row"];

export type StepNote = {
  id: string;
  trackId: string;
  /** null = the track's own checklist; set = that variation's run of it. */
  variationId: string | null;
  stepKey: FinishingStepKey;
  kind: StepNoteKind;
  /** Optional caption; empty string when the note has none. */
  title: string;
  /** Markdown body — null on an image note. */
  content: string | null;
  /** Public URL of the uploaded image — null on a markdown note. */
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Note images share the public covers bucket (0004): same public-read
 * posture, same image-only allowlist, and the optimizer already trusts its
 * URLs (`src/lib/image-hosts.ts`). They sit under their own prefix so a
 * track's covers and its notes never mix.
 */
export const STEP_NOTE_IMAGE_BUCKET = "track-images";

export function stepNoteImagePrefix(trackId: string): string {
  return `step-notes/${trackId}`;
}

/**
 * Long edge an uploaded note image is capped at. Wider than a cover's
 * (`COVER_MAX_EDGE`): a note is usually a screenshot of text — a ChatGPT
 * answer, a Suno page — and has to stay readable at full width, where a cover
 * only ever fills a tile.
 */
export const STEP_NOTE_IMAGE_MAX_EDGE = 2048;

export const MAX_STEP_NOTE_TITLE = 120;
export const MAX_STEP_NOTE_CONTENT = 50_000;

/**
 * The notes page for one checklist row. One route for both track surfaces,
 * like `/tracks/[id]/edit`: the page is a single responsive column, so there
 * is nothing for an `/m/` twin to arrange differently. A variation's run of
 * the checklist rides in the query so the path stays the same shape.
 */
export function stepNotesHref(
  trackId: string,
  stepKey: FinishingStepKey,
  variationId?: string | null,
): string {
  const base = `/tracks/${trackId}/finishing/${stepKey}`;
  return variationId ? `${base}?variation=${encodeURIComponent(variationId)}` : base;
}

/**
 * A stored row as the page draws it. Returns null for a row whose kind or
 * step the app does not know — a build older than the database — so one
 * unexpected row is skipped rather than taking the page down. `imageUrl` is
 * resolved by the caller, which has the storage client.
 */
export function stepNoteFromRow(
  row: StepNoteRow,
  imageUrl: string | null,
): StepNote | null {
  if (!isFinishingStepKey(row.step_key) || !isStepNoteKind(row.kind)) {
    return null;
  }
  return {
    id: row.id,
    trackId: row.track_id,
    variationId: row.variation_id,
    stepKey: row.step_key,
    kind: row.kind,
    title: row.title,
    content: row.kind === "markdown" ? row.content : null,
    imageUrl: row.kind === "image" ? imageUrl : null,
    imageWidth: row.kind === "image" ? row.image_width : null,
    imageHeight: row.kind === "image" ? row.image_height : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type StepNoteCountRow = Pick<
  StepNoteRow,
  "track_id" | "variation_id" | "step_key"
>;

/**
 * Per-step note counts, split by which checklist run each note belongs to:
 * `byTrack` for notes on a track's own checklist (no variation), keyed by
 * track id; `byVariation` for notes on a variation's run, keyed by variation
 * id. `attachDetails` hands each map's entry to the matching
 * `finishingStepsFromRows` call. Rows with a step the app does not know are
 * left out, matching what `stepNoteFromRow` would do with them.
 */
export function countStepNotes(rows: StepNoteCountRow[]): {
  byTrack: Map<string, StepNoteCounts>;
  byVariation: Map<string, StepNoteCounts>;
} {
  const byTrack = new Map<string, StepNoteCounts>();
  const byVariation = new Map<string, StepNoteCounts>();
  for (const row of rows) {
    if (!isFinishingStepKey(row.step_key)) continue;
    const [map, id] = row.variation_id
      ? [byVariation, row.variation_id]
      : [byTrack, row.track_id];
    const counts = map.get(id) ?? {};
    counts[row.step_key] = (counts[row.step_key] ?? 0) + 1;
    map.set(id, counts);
  }
  return { byTrack, byVariation };
}

// Input validation for the server actions in src/app/actions/step-notes.ts.
// Here rather than beside them because "use server" modules may only export
// async functions, and the tests import the schemas directly.

const uuid = z.string().uuid();
const title = z.string().trim().max(MAX_STEP_NOTE_TITLE).default("");

export const addStepNoteSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("markdown"),
    trackId: uuid,
    variationId: uuid.nullable().default(null),
    stepKey: z.enum(FINISHING_STEP_KEYS),
    title,
    content: z
      .string()
      .trim()
      .min(1, "Write something before saving.")
      .max(MAX_STEP_NOTE_CONTENT),
  }),
  z.object({
    kind: z.literal("image"),
    trackId: uuid,
    variationId: uuid.nullable().default(null),
    stepKey: z.enum(FINISHING_STEP_KEYS),
    title,
    imagePath: z.string().min(1, "Upload an image before saving.").max(400),
    imageWidth: z.number().int().positive().nullable().default(null),
    imageHeight: z.number().int().positive().nullable().default(null),
  }),
]);
export type AddStepNoteInput = z.input<typeof addStepNoteSchema>;

export const updateStepNoteSchema = z.object({
  noteId: uuid,
  trackId: uuid,
  title,
  /** Only read on a markdown note; an image note's body is its file. */
  content: z
    .string()
    .trim()
    .max(MAX_STEP_NOTE_CONTENT)
    .optional(),
});
export type UpdateStepNoteInput = z.input<typeof updateStepNoteSchema>;

/**
 * Object key for a fresh upload: unique per upload (so the object is
 * immutable and can be cached for a year, like covers) and scoped under the
 * track so a stray object is at least attributable.
 */
export function stepNoteImageKey(
  trackId: string,
  extension: string,
  now: number = Date.now(),
  id: string = crypto.randomUUID(),
): string {
  return `${stepNoteImagePrefix(trackId)}/${now}-${id}.${extension}`;
}
