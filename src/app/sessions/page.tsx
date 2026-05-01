import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Headphones } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  track_id: string;
  duration_seconds: number | null;
  started_at: string;
  improved: string | null;
  still_broken: string | null;
  new_bottleneck: string | null;
  tracks: { name: string; owner_id: string };
};

async function fetchSessions(): Promise<SessionRow[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, track_id, duration_seconds, started_at, improved, still_broken, new_bottleneck, tracks!inner(name, owner_id)",
    )
    .eq("tracks.owner_id", OWNER_ID)
    .order("started_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as SessionRow[];
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export default async function SessionsPage() {
  const sessions = await fetchSessions();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Focus Sessions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your most recent {sessions.length} session
          {sessions.length === 1 ? "" : "s"}.
        </p>
      </header>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
              <Headphones className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold">No sessions yet</h2>
            <p className="text-sm text-muted-foreground">
              Start a focus session from the dashboard or any track to log
              your first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/tracks/${s.track_id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {s.tracks.name}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(s.duration_seconds)}</span>
                    <span>·</span>
                    <span title={format(new Date(s.started_at), "PPp")}>
                      {formatDistanceToNow(new Date(s.started_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {(s.improved || s.still_broken || s.new_bottleneck) && (
                  <div className="grid gap-2 text-xs sm:grid-cols-3">
                    {s.improved && (
                      <Reflection label="Improved" tone="primary">
                        {s.improved}
                      </Reflection>
                    )}
                    {s.still_broken && (
                      <Reflection label="Still broken" tone="warning">
                        {s.still_broken}
                      </Reflection>
                    )}
                    {s.new_bottleneck && (
                      <Reflection label="New bottleneck" tone="danger">
                        {s.new_bottleneck}
                      </Reflection>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Reflection({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "primary" | "warning" | "danger";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 p-2.5">
      <Badge variant={tone} className="mb-1">
        {label}
      </Badge>
      <p className="text-foreground">{children}</p>
    </div>
  );
}
