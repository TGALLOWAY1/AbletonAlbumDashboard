"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { revalidateTrackSurfaces } from "@/lib/revalidate-track";
import {
  DECISION_TO_REVIEW_STATUS,
  MAX_CANDIDATES_PER_EXPERIMENT,
  addSunoCandidateSchema,
  canTransition,
  closeExperimentSchema,
  createSunoExperimentSchema,
  keepCandidateSchema,
  mineCandidateSchema,
  rejectCandidateSchema,
  resolveKeepDecision,
  sunoActionDescription,
  type CloseExperimentInput,
  type SunoCandidateDecision,
  type SunoExperimentStatus,
} from "@/lib/suno";
import { buildSunoPrompt } from "@/lib/suno-prompt";

const ONE_OPEN_MESSAGE =
  "This track already has an open Suno experiment. Close it before starting another.";

export async function createSunoExperiment(input: {
  trackId: string;
  sourceVersionId: string;
  goal: string;
  preserve?: string;
  change?: string;
  avoid?: string;
}) {
  const parsed = createSunoExperimentSchema.parse(input);
  const supabase = getServerSupabase();

  const { data: existing } = await supabase
    .from("suno_experiments")
    .select("id")
    .eq("track_id", parsed.trackId)
    .not("status", "in", "(integrated,discarded)")
    .maybeSingle();
  if (existing) throw new Error(ONE_OPEN_MESSAGE);

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("name, bpm, song_key, album_id")
    .eq("id", parsed.trackId)
    .single();
  if (trackError) throw trackError;

  // Genre lives on the album (migration 0021), so it is read from there
  // rather than off the track's tags. Fetched separately rather than embedded
  // so a project without the albums table still gets a usable prompt.
  let genre: string | null = null;
  if (track.album_id) {
    const { data: album } = await supabase
      .from("albums")
      .select("genre")
      .eq("id", track.album_id)
      .maybeSingle();
    genre = album?.genre?.trim() || null;
  }

  const prompt = buildSunoPrompt({
    genre,
    bpm: track.bpm,
    songKey: track.song_key,
    goal: parsed.goal,
    preserve: parsed.preserve,
    change: parsed.change,
    avoid: parsed.avoid,
  });

  // The linked Finish Five action makes the round-trip visible work; its
  // description evolves with the experiment lifecycle.
  const { data: action, error: actionError } = await supabase
    .from("actions")
    .insert({
      track_id: parsed.trackId,
      description: sunoActionDescription("send", track.name, parsed.goal),
      category: "suno",
      estimated_minutes: 15,
      is_primary: false,
    })
    .select("id")
    .single();
  if (actionError) throw actionError;

  const { error } = await supabase.from("suno_experiments").insert({
    owner_id: OWNER_ID,
    track_id: parsed.trackId,
    source_version_id: parsed.sourceVersionId,
    goal: parsed.goal,
    prompt,
    status: "ready_to_send",
    action_id: action.id,
  });
  if (error) {
    // Lost a race against the partial unique index: clean up the orphan
    // action, then surface the friendly message.
    await supabase.from("actions").delete().eq("id", action.id);
    if ((error as { code?: string }).code === "23505") {
      throw new Error(ONE_OPEN_MESSAGE);
    }
    throw error;
  }

  revalidateTrackSurfaces(parsed.trackId);
}

async function getExperimentOrThrow(experimentId: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("suno_experiments")
    .select("*")
    .eq("id", experimentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Suno experiment not found.");
  return data;
}

async function updateActionDescription(
  actionId: string | null,
  description: string,
) {
  if (!actionId) return;
  const supabase = getServerSupabase();
  await supabase
    .from("actions")
    .update({ description })
    .eq("id", actionId)
    .is("completed_at", null);
}

export async function markExperimentSent(
  experimentId: string,
  trackId: string,
) {
  const supabase = getServerSupabase();
  const experiment = await getExperimentOrThrow(experimentId);
  const status = experiment.status as SunoExperimentStatus;
  if (!canTransition(status, "waiting_for_results")) {
    throw new Error("This experiment has already been sent.");
  }

  const { error } = await supabase
    .from("suno_experiments")
    .update({ status: "waiting_for_results" })
    .eq("id", experimentId);
  if (error) throw error;

  await updateActionDescription(
    experiment.action_id,
    sunoActionDescription("return", "", experiment.goal),
  );
  revalidateTrackSurfaces(trackId);
}

export async function addSunoCandidate(input: {
  experimentId: string;
  trackId: string;
  label: string;
  storagePath: string;
  durationSeconds?: number | null;
  sunoUrl?: string;
}) {
  const parsed = addSunoCandidateSchema.parse(input);
  const supabase = getServerSupabase();
  const experiment = await getExperimentOrThrow(parsed.experimentId);
  const status = experiment.status as SunoExperimentStatus;
  if (status !== "waiting_for_results" && status !== "reviewing") {
    throw new Error("This experiment isn't accepting uploads.");
  }

  const { count, error: countError } = await supabase
    .from("suno_candidates")
    .select("*", { count: "exact", head: true })
    .eq("experiment_id", parsed.experimentId);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_CANDIDATES_PER_EXPERIMENT) {
    throw new Error(
      `Max ${MAX_CANDIDATES_PER_EXPERIMENT} candidates per experiment — review before adding more.`,
    );
  }

  const { data: version, error: versionError } = await supabase
    .from("track_versions")
    .insert({
      track_id: parsed.trackId,
      label: parsed.label,
      storage_path: parsed.storagePath,
      duration_seconds: parsed.durationSeconds ?? null,
      kind: "suno_variation",
      source: "suno",
      parent_version_id: experiment.source_version_id,
      review_status: "inbox",
      suno_url: parsed.sunoUrl ?? null,
      experiment_id: parsed.experimentId,
    })
    .select("id")
    .single();
  if (versionError) throw versionError;

  const { error: candidateError } = await supabase
    .from("suno_candidates")
    .insert({
      experiment_id: parsed.experimentId,
      version_id: version.id,
      decision: "unreviewed",
    });
  if (candidateError) throw candidateError;

  // First result flips the experiment into review mode.
  if (status === "waiting_for_results") {
    const { error } = await supabase
      .from("suno_experiments")
      .update({ status: "reviewing" })
      .eq("id", parsed.experimentId);
    if (error) throw error;
    await updateActionDescription(
      experiment.action_id,
      sunoActionDescription("review", "", experiment.goal),
    );
  }

  revalidateTrackSurfaces(parsed.trackId);
}

type CandidateWithExperiment = {
  candidate: {
    id: string;
    version_id: string | null;
    decision: SunoCandidateDecision;
  };
  experiment: Awaited<ReturnType<typeof getExperimentOrThrow>>;
  siblings: { id: string; version_id: string | null; decision: SunoCandidateDecision }[];
};

async function getCandidateContext(
  candidateId: string,
): Promise<CandidateWithExperiment> {
  const supabase = getServerSupabase();
  const { data: candidate, error } = await supabase
    .from("suno_candidates")
    .select("id, version_id, decision, experiment_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (error) throw error;
  if (!candidate) throw new Error("Suno candidate not found.");
  const experiment = await getExperimentOrThrow(candidate.experiment_id);
  const { data: siblings, error: siblingsError } = await supabase
    .from("suno_candidates")
    .select("id, version_id, decision")
    .eq("experiment_id", candidate.experiment_id);
  if (siblingsError) throw siblingsError;
  return {
    candidate: {
      id: candidate.id,
      version_id: candidate.version_id,
      decision: candidate.decision as SunoCandidateDecision,
    },
    experiment,
    siblings: (siblings ?? []).map((s) => ({
      id: s.id,
      version_id: s.version_id,
      decision: s.decision as SunoCandidateDecision,
    })),
  };
}

function assertReviewable(status: SunoExperimentStatus) {
  if (status !== "reviewing" && status !== "selected") {
    throw new Error("This experiment isn't in review.");
  }
}

async function setCandidateDecision(
  candidate: { id: string; version_id: string | null },
  decision: SunoCandidateDecision,
  note: string | null,
  extra?: { startSeconds?: number | null; endSeconds?: number | null },
) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("suno_candidates")
    .update({
      decision,
      decision_note: note,
      mine_timestamp_start: extra?.startSeconds ?? null,
      mine_timestamp_end: extra?.endSeconds ?? null,
    })
    .eq("id", candidate.id);
  if (error) throw error;
  if (candidate.version_id) {
    const reviewStatus = DECISION_TO_REVIEW_STATUS[decision];
    const { error: versionError } = await supabase
      .from("track_versions")
      .update({ review_status: reviewStatus })
      .eq("id", candidate.version_id);
    if (versionError) throw versionError;
  }
}

async function insertSunoTask(trackId: string, description: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("actions").insert({
    track_id: trackId,
    description,
    category: "suno",
    is_primary: false,
  });
  if (error) throw error;
}

export async function keepCandidate(input: {
  candidateId: string;
  trackId: string;
  note?: string;
  taskDescription?: string;
  replaceExistingKeeper?: boolean;
}) {
  const parsed = keepCandidateSchema.parse(input);
  const supabase = getServerSupabase();
  const { candidate, experiment, siblings } = await getCandidateContext(
    parsed.candidateId,
  );
  const status = experiment.status as SunoExperimentStatus;
  assertReviewable(status);

  const resolution = resolveKeepDecision(
    siblings,
    candidate.id,
    parsed.replaceExistingKeeper ?? false,
  );
  if (!resolution.ok) {
    throw new Error("Another candidate is already the keeper. Replace it?");
  }
  if (resolution.demoteCandidateId) {
    const demoted = siblings.find((s) => s.id === resolution.demoteCandidateId);
    if (demoted) await setCandidateDecision(demoted, "unreviewed", null);
  }

  await setCandidateDecision(candidate, "keep", parsed.note ?? null);

  if (status === "reviewing") {
    const { error } = await supabase
      .from("suno_experiments")
      .update({ status: "selected" })
      .eq("id", experiment.id);
    if (error) throw error;
  }

  if (parsed.taskDescription) {
    await insertSunoTask(parsed.trackId, parsed.taskDescription);
  }

  revalidateTrackSurfaces(parsed.trackId);
}

export async function mineCandidate(input: {
  candidateId: string;
  trackId: string;
  note: string;
  startSeconds?: number | null;
  endSeconds?: number | null;
  taskDescription: string;
}) {
  const parsed = mineCandidateSchema.parse(input);
  const { candidate, experiment } = await getCandidateContext(
    parsed.candidateId,
  );
  assertReviewable(experiment.status as SunoExperimentStatus);

  await setCandidateDecision(candidate, "mine", parsed.note, {
    startSeconds: parsed.startSeconds,
    endSeconds: parsed.endSeconds,
  });
  // Mining always creates the Ableton follow-up task; it never selects the
  // candidate as the experiment keeper.
  await insertSunoTask(parsed.trackId, parsed.taskDescription);
  revalidateTrackSurfaces(parsed.trackId);
}

export async function rejectCandidate(input: {
  candidateId: string;
  trackId: string;
  note?: string;
}) {
  const parsed = rejectCandidateSchema.parse(input);
  const { candidate, experiment } = await getCandidateContext(
    parsed.candidateId,
  );
  assertReviewable(experiment.status as SunoExperimentStatus);
  // Audio is kept during review — storage cleanup happens at experiment close.
  await setCandidateDecision(candidate, "reject", parsed.note ?? null);
  revalidateTrackSurfaces(parsed.trackId);
}

/** Walk back a keeper decision: selected → reviewing. */
export async function unkeepCandidate(candidateId: string, trackId: string) {
  const supabase = getServerSupabase();
  const { candidate, experiment } = await getCandidateContext(candidateId);
  const status = experiment.status as SunoExperimentStatus;
  if (status !== "selected" || candidate.decision !== "keep") {
    throw new Error("This candidate isn't the current keeper.");
  }

  await setCandidateDecision(candidate, "unreviewed", null);
  const { error } = await supabase
    .from("suno_experiments")
    .update({ status: "reviewing" })
    .eq("id", experiment.id);
  if (error) throw error;
  await updateActionDescription(
    experiment.action_id,
    sunoActionDescription("review", "", experiment.goal),
  );
  revalidateTrackSurfaces(trackId);
}

export async function closeExperiment(input: CloseExperimentInput) {
  const parsed = closeExperimentSchema.parse(input);
  const supabase = getServerSupabase();
  const experiment = await getExperimentOrThrow(parsed.experimentId);
  const status = experiment.status as SunoExperimentStatus;
  if (!canTransition(status, parsed.outcome)) {
    throw new Error(
      parsed.outcome === "integrated"
        ? "Pick a keeper before marking the experiment integrated."
        : "This experiment can't be discarded from its current state.",
    );
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from("suno_candidates")
    .select("id, version_id, decision")
    .eq("experiment_id", parsed.experimentId);
  if (candidatesError) throw candidatesError;

  // Discarding is a decision about everything still open.
  const toReject = (candidates ?? []).filter(
    (c) => c.decision === "unreviewed" && parsed.outcome === "discarded",
  );
  for (const c of toReject) {
    await setCandidateDecision(
      { id: c.id, version_id: c.version_id },
      "reject",
      null,
    );
  }

  // Storage cleanup: rejected candidates lose their audio and version rows;
  // the candidate rows keep the decision history (version_id FK is set null).
  const rejectedVersionIds = (candidates ?? [])
    .filter(
      (c) =>
        c.decision === "reject" || toReject.some((r) => r.id === c.id),
    )
    .map((c) => c.version_id)
    .filter((id): id is string => id != null);
  if (rejectedVersionIds.length > 0) {
    const { data: rejectedVersions, error: versionsError } = await supabase
      .from("track_versions")
      .select("id, storage_path")
      .in("id", rejectedVersionIds);
    if (versionsError) throw versionsError;
    const paths = (rejectedVersions ?? []).map((v) => v.storage_path);
    if (paths.length > 0) {
      await supabase.storage.from("track-audio").remove(paths);
    }
    const { error: deleteError } = await supabase
      .from("track_versions")
      .delete()
      .in("id", rejectedVersionIds);
    if (deleteError) throw deleteError;
  }

  const { error } = await supabase
    .from("suno_experiments")
    .update({
      status: parsed.outcome,
      outcome_note: parsed.outcomeNote ?? null,
      closed_at: new Date().toISOString(),
    })
    .eq("id", parsed.experimentId);
  if (error) throw error;

  // Complete the lifecycle action; integration work continues as its own task.
  if (experiment.action_id) {
    await supabase
      .from("actions")
      .update({ completed_at: new Date().toISOString(), is_primary: false })
      .eq("id", experiment.action_id)
      .is("completed_at", null);
  }
  if (parsed.outcome === "integrated" && parsed.integrationTaskDescription) {
    await insertSunoTask(parsed.trackId, parsed.integrationTaskDescription);
  }

  revalidateTrackSurfaces(parsed.trackId);
}

/** Escape hatch for a mis-created experiment: ready_to_send has no discard
 * transition in the state machine, which would otherwise trap the track under
 * the one-open cap. Hard delete, only before anything has been sent. */
export async function deleteExperiment(experimentId: string, trackId: string) {
  const supabase = getServerSupabase();
  const experiment = await getExperimentOrThrow(experimentId);
  if ((experiment.status as SunoExperimentStatus) !== "ready_to_send") {
    throw new Error("Only an unsent experiment can be deleted.");
  }
  const { count } = await supabase
    .from("suno_candidates")
    .select("*", { count: "exact", head: true })
    .eq("experiment_id", experimentId);
  if ((count ?? 0) > 0) {
    throw new Error("This experiment already has results — close it instead.");
  }

  const { error } = await supabase
    .from("suno_experiments")
    .delete()
    .eq("id", experimentId);
  if (error) throw error;
  if (experiment.action_id) {
    await supabase
      .from("actions")
      .delete()
      .eq("id", experiment.action_id)
      .is("completed_at", null);
  }
  revalidateTrackSurfaces(trackId);
}
