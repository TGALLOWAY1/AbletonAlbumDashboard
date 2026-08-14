import { z } from "zod";

// Domain model for the Suno round-trip workflow (see SUNO_INTEGRATION_PLAN.md).
// Unions, the experiment state machine, and the server-action input schemas
// live here rather than in src/app/actions/suno-experiments.ts because
// "use server" modules may only export async functions, and unit tests need
// to import these directly. Keep the value lists in sync with the check
// constraints in supabase/migrations/0019_suno_round_trip.sql (enforced by
// suno-migration-sync.test.ts).

export const VERSION_KINDS = ["bounce", "suno_variation", "reference"] as const;
export type VersionKind = (typeof VERSION_KINDS)[number];

export const VERSION_SOURCES = ["ableton", "suno", "upload"] as const;
export type VersionSource = (typeof VERSION_SOURCES)[number];

// Named VersionReviewStatus — types.ts still carries a legacy `ReviewStatus`
// union from the removed samples feature.
export const VERSION_REVIEW_STATUSES = [
  "none",
  "inbox",
  "keeper",
  "mined",
  "rejected",
] as const;
export type VersionReviewStatus = (typeof VERSION_REVIEW_STATUSES)[number];

export const SUNO_EXPERIMENT_STATUSES = [
  "ready_to_send",
  "waiting_for_results",
  "reviewing",
  "selected",
  "integrated",
  "discarded",
] as const;
export type SunoExperimentStatus = (typeof SUNO_EXPERIMENT_STATUSES)[number];

export const SUNO_CANDIDATE_DECISIONS = [
  "unreviewed",
  "keep",
  "mine",
  "reject",
] as const;
export type SunoCandidateDecision = (typeof SUNO_CANDIDATE_DECISIONS)[number];

// Review guardrail: an experiment is a bounded question, not a collection.
export const MAX_CANDIDATES_PER_EXPERIMENT = 4;

// ---------------------------------------------------------------------------
// Experiment state machine. Terminal states have no exits — a closed
// experiment can never reopen.
// ---------------------------------------------------------------------------

export const EXPERIMENT_TRANSITIONS: Record<
  SunoExperimentStatus,
  readonly SunoExperimentStatus[]
> = {
  ready_to_send: ["waiting_for_results"],
  waiting_for_results: ["reviewing", "discarded"],
  reviewing: ["selected", "discarded"],
  selected: ["integrated", "reviewing", "discarded"],
  integrated: [],
  discarded: [],
};

export function isTerminal(status: SunoExperimentStatus): boolean {
  return EXPERIMENT_TRANSITIONS[status].length === 0;
}

export function canTransition(
  from: SunoExperimentStatus,
  to: SunoExperimentStatus,
): boolean {
  return EXPERIMENT_TRANSITIONS[from].includes(to);
}

// A candidate decision always mirrors onto the underlying version row.
export const DECISION_TO_REVIEW_STATUS: Record<
  SunoCandidateDecision,
  VersionReviewStatus
> = {
  unreviewed: "inbox",
  keep: "keeper",
  mine: "mined",
  reject: "rejected",
};

// The linked Finish Five action's description evolves with the round-trip.
export function sunoActionDescription(
  step: "send" | "return" | "review",
  trackName: string,
  goal: string,
): string {
  switch (step) {
    case "send":
      return `Send "${trackName}" to Suno: ${goal}`;
    case "return":
      return "Return Suno variations for review";
    case "review":
      return `Review Suno variations: ${goal}`;
  }
}

// Keeper uniqueness as pure logic: at most one candidate may be the keeper.
// Returns which candidate (if any) must be demoted back to unreviewed, or
// flags the conflict so the UI can ask before replacing.
export function resolveKeepDecision(
  candidates: ReadonlyArray<{ id: string; decision: SunoCandidateDecision }>,
  targetId: string,
  replaceExistingKeeper: boolean,
):
  | { ok: true; demoteCandidateId: string | null }
  | { ok: false; reason: "keeper_exists" } {
  const existingKeeper = candidates.find(
    (c) => c.decision === "keep" && c.id !== targetId,
  );
  if (!existingKeeper) return { ok: true, demoteCandidateId: null };
  if (!replaceExistingKeeper) return { ok: false, reason: "keeper_exists" };
  return { ok: true, demoteCandidateId: existingKeeper.id };
}

// Compact label for track cards and the dashboard strip. Null hides the badge
// (terminal experiments are finished work, not a signal).
export function sunoBadgeLabel(exp: {
  status: SunoExperimentStatus;
  unreviewedCount: number;
}): string | null {
  switch (exp.status) {
    case "ready_to_send":
      return "Suno: ready to send";
    case "waiting_for_results":
      return "Suno: waiting";
    case "reviewing":
      return exp.unreviewedCount > 0
        ? `Suno: ${exp.unreviewedCount} to review`
        : "Suno: pick a keeper";
    case "selected":
      return "Suno: ready to integrate";
    case "integrated":
    case "discarded":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Server-action input schemas
// ---------------------------------------------------------------------------

export const createSunoExperimentSchema = z.object({
  trackId: z.string().uuid(),
  sourceVersionId: z.string().uuid(),
  goal: z.string().trim().min(1, "Goal is required").max(300),
  preserve: z.string().trim().max(200).optional(),
  change: z.string().trim().max(200).optional(),
  avoid: z.string().trim().max(200).optional(),
});
export type CreateSunoExperimentInput = z.infer<
  typeof createSunoExperimentSchema
>;

export const addSunoCandidateSchema = z.object({
  experimentId: z.string().uuid(),
  trackId: z.string().uuid(),
  label: z.string().min(1).max(120),
  storagePath: z.string().min(1).max(400),
  durationSeconds: z.number().nullable().optional(),
  sunoUrl: z.string().url().max(400).optional(),
});
export type AddSunoCandidateInput = z.infer<typeof addSunoCandidateSchema>;

export const keepCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  trackId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
  // "What needs to happen in Ableton?" — becomes a normal Finish Five task.
  taskDescription: z.string().trim().max(300).optional(),
  replaceExistingKeeper: z.boolean().optional(),
});
export type KeepCandidateInput = z.infer<typeof keepCandidateSchema>;

export const mineCandidateSchema = z
  .object({
    candidateId: z.string().uuid(),
    trackId: z.string().uuid(),
    note: z.string().trim().min(1, "Say what's worth keeping").max(500),
    startSeconds: z.number().min(0).nullable().optional(),
    endSeconds: z.number().min(0).nullable().optional(),
    // Mining without an Ableton follow-up is just hoarding — require it.
    taskDescription: z
      .string()
      .trim()
      .min(1, "Mining needs an Ableton action")
      .max(300),
  })
  .refine(
    (v) =>
      v.endSeconds == null ||
      (v.startSeconds != null && v.endSeconds > v.startSeconds),
    { message: "End must come after start", path: ["endSeconds"] },
  );
export type MineCandidateInput = z.infer<typeof mineCandidateSchema>;

export const rejectCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  trackId: z.string().uuid(),
  note: z.string().trim().max(500).optional(),
});
export type RejectCandidateInput = z.infer<typeof rejectCandidateSchema>;

export const closeExperimentSchema = z.object({
  experimentId: z.string().uuid(),
  trackId: z.string().uuid(),
  outcome: z.enum(["integrated", "discarded"]),
  outcomeNote: z.string().trim().max(500).optional(),
  // Only used when outcome is "integrated".
  integrationTaskDescription: z.string().trim().max(300).optional(),
});
export type CloseExperimentInput = z.infer<typeof closeExperimentSchema>;
