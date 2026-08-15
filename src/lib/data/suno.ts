import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { SunoCandidateRow, SunoExperimentRow, VersionRow } from "@/lib/types";

// Deploys land before manual migrations in this repo (Vercel deploys on merge;
// SQL is applied by hand), so the read paths must tolerate the Suno tables not
// existing yet — the app renders with Suno features empty instead of crashing
// the dashboard. Writes still fail loudly. PostgREST reports a missing table
// as PGRST205 (absent from its schema cache — the code supabase-js actually
// surfaces; see isMissingRelation in src/lib/data/album.ts); 42P01 is
// Postgres' own undefined_table, kept for raw-SQL paths.
function isMissingSunoTables(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "PGRST205" || code === "42P01";
}

export type SunoCandidateWithVersion = SunoCandidateRow & {
  version: VersionRow | null;
};

export type SunoExperimentWithCandidates = SunoExperimentRow & {
  sourceVersion: VersionRow | null;
  candidates: SunoCandidateWithVersion[]; // created_at asc
};

/** The track's single open (non-terminal) Suno experiment, with its source
 * version and candidates. The partial unique index guarantees at most one. */
export async function getOpenExperimentWithCandidates(
  trackId: string,
): Promise<SunoExperimentWithCandidates | null> {
  const supabase = getServerSupabase();
  const { data: experiment, error } = await supabase
    .from("suno_experiments")
    .select("*")
    .eq("track_id", trackId)
    .not("status", "in", "(integrated,discarded)")
    .maybeSingle();
  if (error) {
    if (isMissingSunoTables(error)) return null;
    throw error;
  }
  if (!experiment) return null;

  const [sourceRes, candidatesRes] = await Promise.all([
    experiment.source_version_id
      ? supabase
          .from("track_versions")
          .select("*")
          .eq("id", experiment.source_version_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("suno_candidates")
      .select("*")
      .eq("experiment_id", experiment.id)
      .order("created_at", { ascending: true }),
  ]);
  if (sourceRes.error) throw sourceRes.error;
  if (candidatesRes.error) throw candidatesRes.error;

  const candidates = candidatesRes.data ?? [];
  const versionIds = candidates
    .map((c) => c.version_id)
    .filter((id): id is string => id != null);
  const versionById = new Map<string, VersionRow>();
  if (versionIds.length > 0) {
    const { data: versions, error: versionsError } = await supabase
      .from("track_versions")
      .select("*")
      .in("id", versionIds);
    if (versionsError) throw versionsError;
    (versions ?? []).forEach((v) => versionById.set(v.id, v));
  }

  return {
    ...experiment,
    sourceVersion: sourceRes.data ?? null,
    candidates: candidates.map((c) => ({
      ...c,
      version: (c.version_id && versionById.get(c.version_id)) || null,
    })),
  };
}

export type SunoWorkItem = {
  trackId: string;
  trackName: string;
  goal: string;
  /** Unreviewed candidate count (needsReview bucket only). */
  count?: number;
};

export type SunoWorkSummary = {
  readyToSend: SunoWorkItem[];
  waiting: SunoWorkItem[];
  needsReview: SunoWorkItem[];
  readyToIntegrate: SunoWorkItem[];
};

/** All open Suno round-trips across the owner's tracks, bucketed for the
 * dashboard strip. A reviewing experiment with zero unreviewed candidates
 * still needs review — a keeper decision is outstanding. */
export async function getSunoWorkSummary(): Promise<SunoWorkSummary> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("suno_experiments")
    .select("id, track_id, status, goal, tracks(name), suno_candidates(decision)")
    .eq("owner_id", OWNER_ID)
    .not("status", "in", "(integrated,discarded)")
    .order("created_at", { ascending: true });

  const summary: SunoWorkSummary = {
    readyToSend: [],
    waiting: [],
    needsReview: [],
    readyToIntegrate: [],
  };
  if (error) {
    if (isMissingSunoTables(error)) return summary;
    throw error;
  }
  for (const exp of data ?? []) {
    const item: SunoWorkItem = {
      trackId: exp.track_id,
      trackName: exp.tracks?.name ?? "Untitled track",
      goal: exp.goal,
    };
    switch (exp.status) {
      case "ready_to_send":
        summary.readyToSend.push(item);
        break;
      case "waiting_for_results":
        summary.waiting.push(item);
        break;
      case "reviewing":
        summary.needsReview.push({
          ...item,
          count: (exp.suno_candidates ?? []).filter(
            (c) => c.decision === "unreviewed",
          ).length,
        });
        break;
      case "selected":
        summary.readyToIntegrate.push(item);
        break;
    }
  }
  return summary;
}
