import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { SessionActivityRow, SessionRow } from "@/lib/types";

export type SessionStats = { seconds: number; count: number };

export type TrackSessionWithActivities = SessionRow & {
  activities: SessionActivityRow[];
};

// Recent completed sessions for one track, newest first, with their
// per-activity time breakdown. Powers the track-page session history.
export async function getSessionsForTrack(
  trackId: string,
  limit = 20,
): Promise<TrackSessionWithActivities[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, session_activities(*)")
    .eq("track_id", trackId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { session_activities, ...session } = row;
    return {
      ...(session as SessionRow),
      activities: (session_activities ?? []) as SessionActivityRow[],
    };
  });
}

// Per-track aggregate of all-time logged session time and session count.
export async function getSessionStatsByTrack(): Promise<
  Map<string, SessionStats>
> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("track_id, duration_seconds, tracks!inner(owner_id)")
    .eq("tracks.owner_id", OWNER_ID);
  // Like every other read here: a failure is thrown, not read as "no
  // sessions". An empty map here would print "Never" on every track card.
  if (error) throw error;

  const map = new Map<string, SessionStats>();
  (data ?? []).forEach((row) => {
    if (!row.track_id) return;
    const prev = map.get(row.track_id) ?? { seconds: 0, count: 0 };
    map.set(row.track_id, {
      seconds: prev.seconds + (row.duration_seconds ?? 0),
      count: prev.count + 1,
    });
  });
  return map;
}

// Per-track count of completed sessions started within the last `days` days.
// Feeds the momentum signal in `recommendTrack`.
export async function getSessionCountsByTrackSince(
  days: number,
): Promise<Map<string, number>> {
  const supabase = getServerSupabase();
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("track_id, tracks!inner(owner_id)")
    .eq("tracks.owner_id", OWNER_ID)
    .eq("status", "completed")
    .gte("started_at", sinceIso);
  // Thrown rather than swallowed: an empty map would let the sidebar
  // recommend a track as if nothing had been worked on all week, with no
  // log and no fallback. `SidebarFocusPanel` catches this and degrades.
  if (error) throw error;

  const map = new Map<string, number>();
  (data ?? []).forEach((row) => {
    if (!row.track_id) return;
    map.set(row.track_id, (map.get(row.track_id) ?? 0) + 1);
  });
  return map;
}

/** One row of the dashboard's Recent Sessions list. */
export type RecentSession = {
  id: string;
  /** Null for a session logged against no track (practice, admin, a jam). */
  trackId: string | null;
  trackName: string | null;
  /** Null when the session has no type, or its type has since been deleted. */
  sessionTypeName: string | null;
  sessionTypeColor: string | null;
  startedAt: string;
  durationSeconds: number;
};

type RecentSessionRow = {
  id: string;
  track_id: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  track: { name: string; owner_id: string } | null;
  session_type: { name: string; color: string } | null;
};

// The most recent completed sessions, newest first, with the names a list
// needs to say what each one was: the track's and the session type's.
//
// Owner-scoped the way the History tab's read is: a LEFT join to the track, so
// a session with no track is kept, and a row is dropped only when it has a
// track that belongs to someone else. That filter runs after the limit, which
// in this single-owner app removes nothing; with more than one owner a page
// could come back short rather than leak a row.
export async function getRecentSessions(limit = 5): Promise<RecentSession[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, track_id, duration_seconds, started_at, track:tracks!sessions_track_id_fkey(name, owner_id), session_type:session_types(name, color)",
    )
    .eq("status", "completed")
    .not("started_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);
  // Thrown, like the other reads here: "No sessions yet" over a real history
  // would be a lie, and the widget's error boundary is what should answer.
  if (error) throw error;

  return ((data ?? []) as unknown as RecentSessionRow[])
    .filter((s) => !s.track || s.track.owner_id === OWNER_ID)
    .filter((s): s is RecentSessionRow & { started_at: string } =>
      Boolean(s.started_at),
    )
    .map((s) => ({
      id: s.id,
      trackId: s.track ? s.track_id : null,
      trackName: s.track?.name ?? null,
      sessionTypeName: s.session_type?.name ?? null,
      sessionTypeColor: s.session_type?.color ?? null,
      startedAt: s.started_at,
      durationSeconds: s.duration_seconds ?? 0,
    }));
}
