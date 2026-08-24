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
 * Completed tasks, owner-scoped, in a shape the range stats can count.
 *
 * Two queries, because this has to survive the deploy-before-migration window.
 * The first reads both kinds of task: track-scoped (owned through the track)
 * and studio (owned directly, migration 0027). On a database without 0027 the
 * `owner_id` column does not exist, which fails the whole select — and
 * returning nothing there would print "0 tasks done" over a history of real,
 * still-queryable completions. So the fallback re-reads the track-scoped ones
 * through the join `getWeeklyDelta` used before this change. Nothing is lost
 * by dropping the studio half in that branch: without 0027 there are no
 * track-less tasks to count.
 */
async function fetchTaskCompletions(
  supabase: ReturnType<typeof getServerSupabase>,
): Promise<AnalyticsTaskCompletion[]> {
  const withOwner = await supabase
    .from("actions")
    .select("completed_at, owner_id, track:tracks!actions_track_id_fkey(owner_id)")
    .not("completed_at", "is", null);

  if (!withOwner.error) {
    const rows = (withOwner.data ?? []) as unknown as CompletionSlim[];
    return rows
      // Left join: keep track-less rows, and only this owner's tracks.
      .filter((a) =>
        a.track ? a.track.owner_id === OWNER_ID : a.owner_id === OWNER_ID,
      )
      .filter((a): a is CompletionSlim & { completed_at: string } =>
        Boolean(a.completed_at),
      )
      .map((a) => ({ completedAt: a.completed_at }));
  }

  if (!isMissingColumn(withOwner.error)) throw withOwner.error;

  console.warn(
    "[analytics] actions.owner_id is missing — counting track tasks only. " +
      "Apply supabase/migrations/0027_general_tasks.sql to include studio tasks.",
  );

  const legacy = await supabase
    .from("actions")
    .select("completed_at, tracks!inner(owner_id)")
    .eq("tracks.owner_id", OWNER_ID)
    .not("completed_at", "is", null);
  if (legacy.error) throw legacy.error;

  return (legacy.data ?? [])
    .filter((a): a is typeof a & { completed_at: string } =>
      Boolean(a.completed_at),
    )
    .map((a) => ({ completedAt: a.completed_at }));
}

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
  const [tracksRes, sessionsRes, taskCompletions] = await Promise.all([
    supabase.from("tracks").select("id, status").eq("owner_id", OWNER_ID),
    supabase
      .from("sessions")
      .select(
        "track_id, duration_seconds, started_at, status, track:tracks!sessions_track_id_fkey(owner_id)",
      ),
    fetchTaskCompletions(supabase),
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

  const analyticsTracks: AnalyticsTrack[] = tracks.map((t) => ({
    id: t.id,
    status: t.status,
  }));

  return { sessions, tracks: analyticsTracks, taskCompletions };
}
