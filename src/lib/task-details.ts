/**
 * The two optional facts a task can carry beyond its description: how long it
 * is expected to take, and which of the five production stages it belongs to.
 *
 * Both columns have existed since migration 0001 (`actions.estimated_minutes`,
 * `actions.category`) and `attachDetails` has always summed the first into
 * `estMinutesRemaining` — but nothing ever wrote them, so the "time left"
 * figure the track cards print was structurally always zero. These helpers are
 * the shared definition of how the two columns are read, formatted and
 * validated, so the list, the server action and the card figure cannot drift
 * apart about what an estimate means.
 *
 * `category` is a free-text column with no check constraint, and it already
 * holds at least one non-stage value: `startSunoExperiment` writes
 * `category: "suno"` on the action it creates for a round-trip. So a category
 * is *narrowed* to a stage key on read (`toStageKey`) rather than cast — a row
 * carrying something else reads as "no stage" instead of rendering a chip for
 * a stage that does not exist.
 */

import {
  STAGE_KEYS,
  type ActionRow,
  type StageKey,
} from "@/lib/types";

/**
 * The ceiling on a single task's estimate, in minutes — ten hours.
 *
 * A task is a session's worth of work, not a project: anything past this is a
 * sign the task wants splitting, and the cap keeps a slipped keypress ("300"
 * typed into a field meant for "30") from swamping a track's remaining-time
 * figure. Shared by the Zod schema that guards the write and the number input
 * that offers the value.
 */
export const MAX_ESTIMATE_MINUTES = 600;

/** Is this one of the five production stages? */
export function isStageKey(value: unknown): value is StageKey {
  return (
    typeof value === "string" && (STAGE_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Read a stored `actions.category` as a stage, or as nothing.
 *
 * Anything that is not one of the five keys — null, a legacy value, the
 * `"suno"` marker — comes back as `null`, which is what stops an unknown
 * category from being rendered as a stage chip.
 */
export function toStageKey(value: string | null | undefined): StageKey | null {
  return isStageKey(value) ? value : null;
}

/**
 * A task's optional details in the shape the UI works in: a positive estimate
 * or nothing, and a real stage key or nothing.
 *
 * Deliberately derived from `ActionRow` rather than replacing it. The row type
 * is generated from the database and is what every task surface already
 * passes around; this is the narrowed view of its two loosest columns.
 */
export type TaskDetails = {
  estimatedMinutes: number | null;
  category: StageKey | null;
};

/**
 * Zero is stored-but-not-shown on purpose: the column is an integer with no
 * constraint, so a `0` from an old row or a cleared field is "no estimate"
 * rather than "this takes no time".
 */
export function taskDetails(
  row: Pick<ActionRow, "estimated_minutes" | "category">,
): TaskDetails {
  const minutes = row.estimated_minutes;
  const usable =
    typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0;
  return {
    estimatedMinutes: usable ? Math.round(minutes) : null,
    category: toStageKey(row.category),
  };
}

/**
 * Minutes as a person would say them: "25m", "1h", "1h 30m".
 *
 * Never "90m" and never "1.5h" — the chip sits inline next to a task
 * description at 10-11px, where a decimal reads as part of the sentence and a
 * three-digit minute count has to be divided in your head.
 */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

type EstimatedTask = Pick<ActionRow, "estimated_minutes" | "completed_at">;

function openWithEstimate(tasks: EstimatedTask[]): number[] {
  return tasks
    .filter((t) => t.completed_at == null)
    .map((t) => taskDetails({ ...t, category: null }).estimatedMinutes)
    .filter((m): m is number => m != null);
}

/**
 * Total estimated minutes still to do.
 *
 * Open tasks only — a finished task's estimate is history, not work left —
 * which is the same rule `attachDetails` applies when it builds
 * `estMinutesRemaining` from the open-actions query. Keeping the client total
 * and the server figure on one definition is the point of this living here.
 */
export function sumOpenEstimates(tasks: EstimatedTask[]): number {
  return openWithEstimate(tasks).reduce((sum, m) => sum + m, 0);
}

/** How many open tasks actually carry an estimate. */
export function countOpenEstimates(tasks: EstimatedTask[]): number {
  return openWithEstimate(tasks).length;
}

/**
 * The one-line total printed above an open task list, or `null` when no open
 * task has an estimate — a list nobody has estimated says nothing rather than
 * claiming "~0m across 0 tasks".
 *
 * The count is the number of *estimated* tasks, not the number of open ones,
 * so the line never implies a total covers work it does not.
 */
export function formatEstimateSummary(tasks: EstimatedTask[]): string | null {
  const minutes = sumOpenEstimates(tasks);
  if (minutes <= 0) return null;
  const count = countOpenEstimates(tasks);
  return `~${formatMinutes(minutes)} estimated across ${count} ${
    count === 1 ? "task" : "tasks"
  }`;
}
