import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { isMissingColumn } from "@/lib/migration-errors";
import type {
  AnalyticsSession,
  AnalyticsTaskCompletion,
  AnalyticsTrack,
} from "@/lib/analytics";

type SessionSlim = {
  track_id: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  status: string;
  track: { owner_id: string } | null;
};

type TrackSlim = { id: string; status: string };

type CompletionSlim = {
  completed_at: string | null;
  owner_id: string | null;
  track: { owner_id: string } | null;
};

/**
 * Everything the Progress panel measures, unfiltered by range.
 *
 * The range lives in client state (the 7D/30D/… control), so the server
 * cannot pre-filter without a round trip per switch. It sends the raw series
 * instead — reduced to the two or three fields each stat needs — and the panel
 * recomputes locally. That is what makes the heatmap and the figures under it
 * respond to the same control instantly, and what makes them impossible to
 * disagree.
 */
export async function fetchAnalyticsData() {
  const supabase = getServerSupabase();
  const [tracksRes, sessionsRes, completionsRes] = await Promise.all([
    supabase.from("tracks").select("id, status").eq("owner_id", OWNER_ID),
    supabase
      .from("sessions")
      .select(
        "track_id, duration_seconds, started_at, status, track:tracks!sessions_track_id_fkey(owner_id)",
      ),
    // Both kinds of task: a track's (owned through the track) and the studio's
    // (owned directly — migration 0027). Left join so the track-less ones
    // survive it.
    supabase
      .from("actions")
      .select(
        "completed_at, owner_id, track:tracks!actions_track_id_fkey(owner_id)",
      )
      .not("completed_at", "is", null),
  ]);

  const tracks = (tracksRes.data ?? []) as TrackSlim[];
  const sessionRows = (sessionsRes.data ?? []) as unknown as SessionSlim[];

  const sessions: AnalyticsSession[] = sessionRows
    // Left join: keep track-less rows, and (single-user) only the owner's tracks.
    .filter((s) => !s.track || s.track.owner_id === OWNER_ID)
    .filter((s) => s.started_at && s.duration_seconds != null)
    .map((s) => ({
      trackId: s.track_id,
      startedAt: s.started_at as string,
      durationSeconds: s.duration_seconds ?? 0,
      status: s.status,
    }));

  // A database without 0027 has no `actions.owner_id`, which fails the whole
  // select. Tasks-done then reads as zero rather than taking the panel down.
  if (completionsRes.error && isMissingColumn(completionsRes.error)) {
    console.warn(
      "[analytics] actions.owner_id is missing — apply supabase/migrations/" +
        "0027_general_tasks.sql to count completed tasks.",
    );
  }
  const completionRows = (completionsRes.data ??
    []) as unknown as CompletionSlim[];

  const taskCompletions: AnalyticsTaskCompletion[] = completionRows
    .filter((a) =>
      a.track ? a.track.owner_id === OWNER_ID : a.owner_id === OWNER_ID,
    )
    .filter((a): a is CompletionSlim & { completed_at: string } =>
      Boolean(a.completed_at),
    )
    .map((a) => ({ completedAt: a.completed_at }));

  const analyticsTracks: AnalyticsTrack[] = tracks.map((t) => ({
    id: t.id,
    status: t.status,
  }));

  return { sessions, tracks: analyticsTracks, taskCompletions };
}
