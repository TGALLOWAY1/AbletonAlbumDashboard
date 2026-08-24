import { z } from "zod";
import type { Database } from "@/lib/database.types";
import type { SunoExperimentStatus } from "@/lib/suno";

export type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
export type StageRow = Database["public"]["Tables"]["track_stages"]["Row"];
export type FinishingStepRow =
  Database["public"]["Tables"]["track_finishing_steps"]["Row"];
export type ActionRow = Database["public"]["Tables"]["actions"]["Row"];
export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type VersionRow = Database["public"]["Tables"]["track_versions"]["Row"];
export type SunoExperimentRow =
  Database["public"]["Tables"]["suno_experiments"]["Row"];
export type SunoCandidateRow =
  Database["public"]["Tables"]["suno_candidates"]["Row"];


export type ReviewStatus =
  | "not_reviewed"
  | "reviewed_not_added"
  | "added_to_favorites";
export type SessionTypeRow =
  Database["public"]["Tables"]["session_types"]["Row"];
export type SessionActivityRow =
  Database["public"]["Tables"]["session_activities"]["Row"];
export type AlbumRow = Database["public"]["Tables"]["albums"]["Row"];

export type AlbumWithTrackCount = AlbumRow & {
  trackCount: number;
};

// Input validation for the bulk album-assignment server action
// (`assignTracksToAlbum` in src/app/actions/tracks.ts). It lives here rather
// than next to the action because "use server" modules may only export async
// functions, and unit tests need to import the schema directly.
export const assignTracksToAlbumSchema = z.object({
  // null unassigns the tracks from whatever album they are on.
  albumId: z.string().uuid("Invalid album id").nullable(),
  trackIds: z
    .array(z.string().uuid("Invalid track id"))
    .min(1, "Select at least one track"),
});
export type AssignTracksToAlbumInput = z.infer<
  typeof assignTracksToAlbumSchema
>;

// Partial update for a single album (`updateAlbum` in src/app/actions/album.ts).
// The album header edits one field at a time — cover, title, genre, or start
// date —
// so every key is optional and an absent key means "leave this column alone".
// An empty string is a real value: it clears the column.
export const albumPatchSchema = z
  .object({
    id: z.string().uuid("Invalid album id"),
    title: z.string().max(120, "Title must be 120 characters or fewer").optional(),
    genre: z.string().max(60, "Genre must be 60 characters or fewer").optional(),
    cover_image_url: z
      .union([z.string().url("Cover must be a URL"), z.literal("")])
      .optional(),
    start_date: z
      .string()
      .refine(
        (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
        "Date must be YYYY-MM-DD",
      )
      .optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.genre !== undefined ||
      v.cover_image_url !== undefined ||
      v.start_date !== undefined,
    "Nothing to update",
  );
export type AlbumPatchInput = z.infer<typeof albumPatchSchema>;

export const SESSION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "skipped",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const TRACK_STATUSES = [
  "active",
  "backlog",
  "completed",
  "archived",
] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];

/**
 * Standing "has this track been through Suno yet?" marker, set straight from a
 * track card. Deliberately separate from the `suno_experiments` round-trip
 * (src/lib/suno.ts): that models one bounded experiment and its candidates,
 * while this is the album-planning question of whether the track has had its
 * Suno pass at all.
 *
 * Three states, because "not done" and "tried and it came back broken" are
 * different pieces of planning information — the second one is a track to
 * revisit, not one to start. Array order is the click order of the chip, so
 * the common "I did the pass" case stays one click from `todo`. Keep in sync
 * with the check constraint in
 * supabase/migrations/0022_suno_status_error.sql.
 */
export const SUNO_STATUSES = ["todo", "done", "error"] as const;
export type SunoStatus = (typeof SUNO_STATUSES)[number];

export const SUNO_STATUS_LABELS: Record<SunoStatus, string> = {
  todo: "Not done",
  done: "Complete",
  error: "Tried — error",
};

/**
 * The marker for each state. The chip is badge-sized, so the state has to read
 * from the emoji alone; the word only appears on the detail surfaces.
 */
export const SUNO_STATUS_EMOJI: Record<SunoStatus, string> = {
  todo: "⬜",
  done: "✅",
  error: "⚠️",
};

export const DEFAULT_SUNO_STATUS: SunoStatus = "todo";

/** Rows written before migration 0021 have no value — read them as "todo". */
export function trackSunoStatus(
  track: Pick<TrackRow, "suno_status">,
): SunoStatus {
  return SUNO_STATUSES.includes(track.suno_status as SunoStatus)
    ? (track.suno_status as SunoStatus)
    : DEFAULT_SUNO_STATUS;
}

/** The next status in the cycle — what a chip click should write. */
export function nextSunoStatus(current: SunoStatus): SunoStatus {
  const index = SUNO_STATUSES.indexOf(current);
  return SUNO_STATUSES[(index + 1) % SUNO_STATUSES.length];
}

export const STAGE_KEYS = [
  "idea",
  "sound_design",
  "arrangement",
  "mixing",
  "mastering",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STAGE_LABELS: Record<StageKey, string> = {
  idea: "Idea / Concept",
  sound_design: "Sound Design",
  arrangement: "Arrangement",
  mixing: "Mixing",
  mastering: "Mastering",
};

/**
 * The same five stages, named to survive a phone.
 *
 * Five columns across a 390px screen leave roughly 55px each, which the full
 * labels overflow — the mobile stage strip used to render "Arrangement…" and
 * lose the word it was abbreviating. These are picked to fit whole; the long
 * form still goes to the accessible name.
 */
export const STAGE_SHORT_LABELS: Record<StageKey, string> = {
  idea: "Idea",
  sound_design: "Sound",
  arrangement: "Arrange",
  mixing: "Mix",
  mastering: "Master",
};

/**
 * The hand-off checklist every track goes through once the music is done —
 * three fixed jobs, same three for every track, shown straight on the large
 * track card so the last mile is visible without opening the track.
 *
 * Separate from `STAGE_KEYS`: stages are the creative arc and their average is
 * the track's progress percentage, while these are housekeeping that says
 * nothing about how finished the music is. Array order is the order they are
 * rendered and the order they are done in. Keep in sync with the check
 * constraint in supabase/migrations/0023_track_finishing_steps.sql
 * (finishing-steps.test.ts asserts it).
 */
export const FINISHING_STEP_KEYS = [
  "suno_variations",
  "stems_midi",
  "ableton_cleanup",
] as const;
export type FinishingStepKey = (typeof FINISHING_STEP_KEYS)[number];

export const FINISHING_STEP_LABELS: Record<FinishingStepKey, string> = {
  suno_variations: "Create Suno variations",
  stems_midi: "Save stems and MIDI",
  ableton_cleanup: "Cleanup in Ableton",
};

/** One checklist row as the card draws it — always three, always in order. */
export type FinishingStep = {
  key: FinishingStepKey;
  /** ISO timestamp of the tick, or null while the step is outstanding. */
  completedAt: string | null;
};

/**
 * The three steps in render order. A track with no rows yet (never ticked, or
 * a database without migration 0023) reads as three outstanding steps rather
 * than as an empty checklist, so the card never renders a hole.
 */
export function finishingStepsFromRows(
  rows: FinishingStepRow[] = [],
): FinishingStep[] {
  const byKey = new Map(rows.map((r) => [r.step_key, r]));
  return FINISHING_STEP_KEYS.map((key) => ({
    key,
    completedAt: byKey.get(key)?.completed_at ?? null,
  }));
}

/**
 * How many tracks can sit on the shortlist at once.
 *
 * The point of the number is that it is small enough to hurt: filling it and
 * wanting a sixth is the moment you have to decide what you are *not* working
 * on. The cap therefore lives on the pin — a reversible note about priority —
 * rather than on `status`, which used to carry it. Under the old rule the only
 * way to make room was to archive or back-burner a song, so the dashboard
 * asked for a commitment to five specific tracks. Now you unpin one, or you
 * finish it and it unpins itself (`setTrackStatus`).
 *
 * Enforced in `setTrackPinned`, the only writer — see migration 0027 for why
 * it is not a database constraint.
 */
export const MAX_PINNED_TRACKS = 5;

/**
 * Statuses a track can be pinned in.
 *
 * `setTrackStatus` unpins on complete/archive, so allowing those to be pinned
 * again would make that a suggestion rather than an invariant: a finished song
 * could sit in one of the five slots forever, which is the exact stall the cap
 * exists to prevent. Shared by the server action that enforces it and the UI
 * that decides whether to offer the control, so the two cannot disagree about
 * what is pinnable.
 */
export const PINNABLE_TRACK_STATUSES: readonly TrackStatus[] = [
  "active",
  "backlog",
];

export function isPinnableStatus(status: string): boolean {
  return PINNABLE_TRACK_STATUSES.includes(status as TrackStatus);
}

/** Is this track on the shortlist? */
export function isTrackPinned(
  track: Pick<TrackRow, "pinned_at">,
): boolean {
  return track.pinned_at != null;
}

/**
 * Compare two tracks by shortlist position: hand-set `pin_order` first with
 * NULLs last, then oldest pin. Same shape as the task ordering in migration
 * 0025, and the same reason — a newly pinned track has no `pin_order` yet and
 * belongs at the bottom, without the insert having to look up a maximum.
 *
 * Exported so the database read (`getPinnedTracks`) and the optimistic client
 * list cannot disagree about what "priority order" means.
 */
export function comparePinPosition(
  a: Pick<TrackRow, "pin_order" | "pinned_at">,
  b: Pick<TrackRow, "pin_order" | "pinned_at">,
): number {
  const ao = a.pin_order ?? Number.POSITIVE_INFINITY;
  const bo = b.pin_order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  const at = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
  const bt = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
  return at - bt;
}

// A track untouched for longer than this is considered going stale and gets
// flagged on the dashboard ("Needs attention") and on track cards.
export const STALE_AFTER_DAYS = 7;

/**
 * Days since a track was last worked on — `Infinity` when it never was.
 * `nowMs` is passed in rather than read from the clock so callers stay pure:
 * staleness is computed once on the server and handed to the card, never
 * derived during render.
 */
export function daysSinceWorked(
  track: Pick<TrackRow, "last_worked_at">,
  nowMs: number,
): number {
  if (!track.last_worked_at) return Infinity;
  return (nowMs - new Date(track.last_worked_at).getTime()) / 86_400_000;
}

export function isTrackStale(
  track: Pick<TrackRow, "last_worked_at">,
  nowMs: number,
): boolean {
  return daysSinceWorked(track, nowMs) > STALE_AFTER_DAYS;
}

// Compact summary of a track's open (non-terminal) Suno experiment, computed
// by attachDetails for badges, the dashboard strip, and the recommendation.
export type TrackSunoSummary = {
  id: string;
  status: SunoExperimentStatus;
  goal: string;
  unreviewedCount: number;
};

/**
 * Aggregate shape used by dashboard + detail views.
 *
 * There is deliberately no "next action" field. The next thing to do on a
 * track is the top of its open task list — an ordering, not a flag — so
 * surfaces that need it read `nextTask` off the fetched task list rather than
 * a second copy of a row that is already in the list.
 */
export type TrackWithDetails = TrackRow & {
  stages: StageRow[];
  // Always three entries (see `finishingStepsFromRows`) so the card can
  // draw the checklist without a length check.
  finishingSteps: FinishingStep[];
  /** First open task in list order, or null when nothing is open. */
  nextTask: ActionRow | null;
  openTaskCount: number;
  completedTaskCount: number;
  estMinutesRemaining: number;
  // Genre rides along with the album because it is an album-level fact — a
  // record has one genre, not one per track.
  album: { id: string; title: string | null; genre: string | null } | null;
  sunoExperiment: TrackSunoSummary | null;
};

export function progressFromStages(stages: StageRow[]): number {
  if (stages.length === 0) return 0;
  const total = stages.reduce((acc, s) => {
    if (s.percent != null) return acc + s.percent;
    return acc + (s.complete ? 100 : 0);
  }, 0);
  return Math.round(total / stages.length);
}

// Human-readable current stage: the first incomplete stage in workflow order.
// Falls back to the final stage label once everything is complete.
export function currentStageLabel(stages: StageRow[]): string {
  for (const key of STAGE_KEYS) {
    const stage = stages.find((s) => s.stage_key === key);
    const done = stage?.complete || (stage?.percent ?? 0) >= 100;
    if (!done) return STAGE_LABELS[key];
  }
  return STAGE_LABELS[STAGE_KEYS[STAGE_KEYS.length - 1]];
}
