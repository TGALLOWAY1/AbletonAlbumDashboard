import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { AnalyticsSession, AnalyticsTrack } from "@/lib/analytics";

type SessionSlim = {
  track_id: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  status: string;
  track: { owner_id: string } | null;
};

type TrackSlim = { id: string; status: string };

export async function fetchAnalyticsData() {
  const supabase = getServerSupabase();
  const [tracksRes, sessionsRes] = await Promise.all([
    supabase.from("tracks").select("id, status").eq("owner_id", OWNER_ID),
    supabase
      .from("sessions")
      .select(
        "track_id, duration_seconds, started_at, status, track:tracks!sessions_track_id_fkey(owner_id)",
      ),
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

  return { sessions, tracks: analyticsTracks };
}
