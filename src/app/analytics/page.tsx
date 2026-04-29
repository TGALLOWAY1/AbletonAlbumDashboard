import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { BOTTLENECK_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

type SessionSlim = {
  track_id: string;
  duration_seconds: number | null;
  started_at: string;
};

type BottleneckSlim = { category: string };

async function fetchAnalytics() {
  const supabase = getServerSupabase();
  const [tracksRes, sessionsRes, bottlenecksRes] = await Promise.all([
    supabase.from("tracks").select("id, status").eq("owner_id", OWNER_ID),
    supabase
      .from("sessions")
      .select(
        "track_id, duration_seconds, started_at, tracks!inner(owner_id)",
      )
      .eq("tracks.owner_id", OWNER_ID),
    supabase
      .from("bottlenecks")
      .select("category, tracks!inner(owner_id)")
      .eq("tracks.owner_id", OWNER_ID),
  ]);

  const tracks = (tracksRes.data ?? []) as { id: string; status: string }[];
  const sessions = (sessionsRes.data ?? []) as unknown as SessionSlim[];
  const bottlenecks = (bottlenecksRes.data ?? []) as unknown as BottleneckSlim[];

  const totalSeconds = sessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0,
  );

  const trackedTrackIds = new Set(sessions.map((s) => s.track_id));
  const avgSecondsPerTrack =
    trackedTrackIds.size === 0 ? 0 : totalSeconds / trackedTrackIds.size;

  const completionRate =
    tracks.length === 0
      ? 0
      : tracks.filter((t) => t.status === "completed").length / tracks.length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sessionsLast7 = sessions.filter(
    (s) => new Date(s.started_at) >= sevenDaysAgo,
  );

  const counts = new Map<string, number>();
  bottlenecks.forEach((b) => {
    counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  });
  const sortedCategories = Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const topBottleneck = sortedCategories[0]?.[0] ?? null;

  return {
    avgSecondsPerTrack,
    completionRate,
    sessionsPerWeek: sessionsLast7.length,
    totalSessions: sessions.length,
    topBottleneck,
    categoryCounts: sortedCategories,
  };
}

function formatHours(seconds: number) {
  if (seconds === 0) return "0h";
  const h = seconds / 3600;
  return `${h.toFixed(1)}h`;
}

export default async function AnalyticsPage() {
  const a = await fetchAnalytics();

  const tiles = [
    {
      label: "Avg time per track",
      value: formatHours(a.avgSecondsPerTrack),
      caption: "Total session time / tracks worked on",
    },
    {
      label: "Completion rate",
      value: `${Math.round(a.completionRate * 100)}%`,
      caption: "Tracks marked completed",
    },
    {
      label: "Sessions / week",
      value: a.sessionsPerWeek.toString(),
      caption: "Sessions in the last 7 days",
    },
    {
      label: "Top bottleneck",
      value: a.topBottleneck
        ? (BOTTLENECK_LABELS[
            a.topBottleneck as keyof typeof BOTTLENECK_LABELS
          ] ?? a.topBottleneck)
        : "—",
      caption: "Most-recurring category",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          The patterns underneath the work.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.label}
              </div>
              <div className="text-2xl font-semibold">{t.value}</div>
              <p className="text-xs text-muted-foreground">{t.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bottleneck categories
          </h2>
          {a.categoryCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bottlenecks logged yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {a.categoryCounts.map(([cat, count]) => {
                const max = a.categoryCounts[0][1];
                const pct = (count / max) * 100;
                return (
                  <li key={cat} className="flex items-center gap-3 text-sm">
                    <Badge variant="warning" className="w-32 justify-center">
                      {BOTTLENECK_LABELS[
                        cat as keyof typeof BOTTLENECK_LABELS
                      ] ?? cat}
                    </Badge>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-warning"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Total sessions logged: {a.totalSessions}
      </p>
    </div>
  );
}
