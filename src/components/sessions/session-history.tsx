import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Headphones } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { ManualSessionEntry } from "@/components/manual-session-dialog";
import { SessionActions } from "@/components/sessions/session-actions";
import { listTrackOptions } from "@/lib/data/tracks";
import { getSessionTypes } from "@/lib/data/session-types";

type SessionRow = {
  id: string;
  track_id: string | null;
  session_type_id: string | null;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  notes_md: string | null;
  progress_impact_rating: number | null;
  enjoyment_rating: number | null;
  improved: string | null;
  still_broken: string | null;
  track: { name: string; owner_id: string } | null;
  session_type: { name: string; color: string } | null;
};

async function fetchSessions(): Promise<SessionRow[]> {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("sessions")
    .select(
      // The extra columns are what the edit dialog prefills from; the row is
      // already being read, so there is no second query for them.
      "id, track_id, session_type_id, duration_seconds, started_at, ended_at, notes_md, progress_impact_rating, enjoyment_rating, improved, still_broken, track:tracks!sessions_track_id_fkey(name, owner_id), session_type:session_types(name, color)",
    )
    .not("started_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(100);
  // Left join: keep track-less rows, and (single-user) only the owner's tracks.
  return ((data ?? []) as unknown as SessionRow[]).filter(
    (s) => !s.track || s.track.owner_id === OWNER_ID,
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

// Server component: the focus-session history log, rendered as the "History"
// tab of the dashboard's Progress section.
export async function SessionHistory() {
  const [sessions, tracks, sessionTypes] = await Promise.all([
    fetchSessions(),
    // Only the picker needs tracks here, and it draws a name and a status —
    // no reason to run the full per-track detail fan-out for that.
    listTrackOptions(),
    getSessionTypes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Focus Sessions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your most recent {sessions.length} session
            {sessions.length === 1 ? "" : "s"}.
          </p>
        </div>
        <ManualSessionEntry
          tracks={tracks}
          sessionTypes={sessionTypes}
          variant="desktop"
        />
      </header>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
              <Headphones className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold">No sessions yet</h3>
            <p className="text-sm text-muted-foreground">
              Start a focus session from the home page or any track to log
              your first one — or use “Log past session” to backfill one you
              already did.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {s.track && s.track_id ? (
                    <Link
                      href={`/tracks/${s.track_id}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {s.track.name}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {s.session_type?.name ?? "Session"}
                      <Badge variant="default" className="font-normal">
                        No track
                      </Badge>
                    </span>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(s.duration_seconds)}</span>
                    <span>·</span>
                    <span title={format(new Date(s.started_at), "PPp")}>
                      {formatDistanceToNow(new Date(s.started_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {/* A mislogged session used to be permanent, and every
                        figure in the Overview tab is measured off these rows.
                        This list is the one place that shows all of them, so
                        it is where the track picker is offered too — a session
                        logged against the wrong song can be moved from here. */}
                    <SessionActions
                      session={{
                        id: s.id,
                        trackId: s.track_id,
                        sessionTypeId: s.session_type_id,
                        startedAt: s.started_at,
                        endedAt: s.ended_at,
                        notesMd: s.notes_md,
                        progressImpactRating: s.progress_impact_rating,
                        enjoymentRating: s.enjoyment_rating,
                      }}
                      durationSeconds={s.duration_seconds ?? 0}
                      tracks={tracks}
                      sessionTypes={sessionTypes}
                    />
                  </div>
                </div>
                {(s.improved || s.still_broken) && (
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
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
