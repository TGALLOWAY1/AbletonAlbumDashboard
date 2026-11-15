import { cache } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { progressFromStages, type StageRow } from "@/lib/types";

/**
 * "Overall" on the Progress Overview widget.
 *
 * The definition is deliberately the one the rest of the app already prints:
 * a track's progress is `progressFromStages(stages)` — the figure on every
 * track card and beside every row of the pinned shortlist — and overall is
 * the plain mean of that across the tracks whose status is `active`. Not
 * weighted by tasks or time, and not including finished tracks (which would
 * pin the average upward forever) or the backlog (which would pin it down):
 * it answers "how far along is the work I currently have open".
 *
 * `percent` is null when there is no active track. That is "nothing to
 * average", which the widget shows as an empty state — it is not 0%.
 */
export type ActiveTrackProgress = {
  /** How many tracks are active right now. */
  trackCount: number;
  /** Mean of the per-track figures, rounded; null with no active tracks. */
  percent: number | null;
};

/** The mean of per-track progress figures, as the whole number the ring shows. */
export function overallProgress(perTrack: number[]): number | null {
  if (perTrack.length === 0) return null;
  return Math.round(perTrack.reduce((a, b) => a + b, 0) / perTrack.length);
}

/**
 * Stages for the active tracks, and nothing else.
 *
 * One query. The track list pages go through `attachDetails`, which fans out
 * to eight more tables per request (tasks, albums, Suno, finishing steps…);
 * none of that is needed to average five stage rows per track, and this widget
 * renders on the home page.
 *
 * Throws on failure — the widget's error boundary reports it. Returning zeros
 * here would draw a confident "0%" over real progress.
 */
export async function getActiveTrackProgress(): Promise<ActiveTrackProgress> {
  const { data, error } = await getServerSupabase()
    .from("tracks")
    .select("id, track_stages(track_id, stage_key, percent, complete)")
    .eq("owner_id", OWNER_ID)
    .eq("status", "active");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    track_stages: StageRow[] | null;
  }[];

  return {
    trackCount: rows.length,
    percent: overallProgress(
      rows.map((row) => progressFromStages(row.track_stages ?? [])),
    ),
  };
}

/** De-duplicated per request: two copies of the widget are one query. */
export const getActiveTrackProgressCached = cache(getActiveTrackProgress);
