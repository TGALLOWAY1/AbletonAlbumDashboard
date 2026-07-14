import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { SessionHistory } from "@/components/sessions/session-history";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type {
  AnalyticsSession,
  AnalyticsTrack,
  AnalyticsBottleneck,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

type SessionSlim = {
  track_id: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  status: string;
  track: { owner_id: string } | null;
};

type TrackSlim = { id: string; status: string };
type BottleneckSlim = { category: string; created_at: string };

async function fetchAnalyticsData() {
  const supabase = getServerSupabase();
  const [tracksRes, sessionsRes, bottlenecksRes] = await Promise.all([
    supabase.from("tracks").select("id, status").eq("owner_id", OWNER_ID),
    supabase
      .from("sessions")
      .select(
        "track_id, duration_seconds, started_at, status, track:tracks!sessions_track_id_fkey(owner_id)",
      ),
    supabase
      .from("bottlenecks")
      .select("category, created_at, tracks!inner(owner_id)")
      .eq("tracks.owner_id", OWNER_ID),
  ]);

  const tracks = (tracksRes.data ?? []) as TrackSlim[];
  const sessionRows = (sessionsRes.data ?? []) as unknown as SessionSlim[];
  const bottleneckRows = (bottlenecksRes.data ??
    []) as unknown as BottleneckSlim[];

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

  const analyticsBottlenecks: AnalyticsBottleneck[] = bottleneckRows.map(
    (b) => ({ category: b.category, createdAt: b.created_at }),
  );

  return { sessions, tracks: analyticsTracks, bottlenecks: analyticsBottlenecks };
}

export default async function AnalyticsPage() {
  const { sessions, tracks, bottlenecks } = await fetchAnalyticsData();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Progress</h1>
        <p className="mt-1 text-muted-foreground">
          The patterns underneath the work.
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AnalyticsDashboard
            sessions={sessions}
            tracks={tracks}
            bottlenecks={bottlenecks}
          />
        </TabsContent>

        <TabsContent value="history">
          <SessionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
