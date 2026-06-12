import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { AudioLines, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRODUCTION_ACTIVITIES } from "@/lib/production-activities";
import type { TrackSessionWithActivities } from "@/lib/data/sessions";
import { formatDuration } from "@/lib/utils";

const ACTIVITY_LABELS = new Map(
  PRODUCTION_ACTIVITIES.map((a) => [a.key as string, a.label]),
);

function sessionSeconds(s: TrackSessionWithActivities): number {
  if (s.duration_seconds != null) return s.duration_seconds;
  if (s.started_at && s.ended_at) {
    const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
    return Math.max(0, Math.round(ms / 1000));
  }
  return 0;
}

// Where this track's time actually went: every logged session with its
// activity breakdown, ratings, and notes — the data the log flow captures,
// finally shown back to the user.
export function TrackSessionHistory({
  sessions,
}: {
  sessions: TrackSessionWithActivities[];
}) {
  // Aggregate minutes per activity across the listed sessions.
  const byActivity = new Map<string, number>();
  sessions.forEach((s) =>
    s.activities.forEach((a) => {
      if (a.minutes > 0) {
        byActivity.set(a.activity_key, (byActivity.get(a.activity_key) ?? 0) + a.minutes);
      }
    }),
  );
  const activityTotals = [...byActivity.entries()].sort((a, b) => b[1] - a[1]);
  const maxActivityMinutes = activityTotals[0]?.[1] ?? 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Session History
          </h3>
          <span className="text-xs text-muted-foreground">
            {sessions.length === 0
              ? "No sessions yet"
              : `Last ${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}
          </span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Start a focus session on this track and its history will show up
            here — time by activity, ratings, and notes.
          </p>
        ) : (
          <>
            {activityTotals.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Time by activity
                </div>
                {activityTotals.map(([key, minutes]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-32 shrink-0 truncate text-muted-foreground">
                      {ACTIVITY_LABELS.get(key) ?? key}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.round((minutes / maxActivityMinutes) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-medium tabular-nums">
                      {formatDuration(minutes * 60)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <ul className="flex flex-col gap-3">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-border bg-surface-2 p-3"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {s.started_at
                        ? format(new Date(s.started_at), "MMM d, yyyy · HH:mm")
                        : "Unknown date"}
                    </span>
                    <span className="flex items-center gap-1">
                      <AudioLines className="h-3.5 w-3.5" />
                      {formatDuration(sessionSeconds(s))}
                    </span>
                    {s.progress_impact_rating != null && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Impact {s.progress_impact_rating}/5
                      </span>
                    )}
                    {s.enjoyment_rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        Enjoyed {s.enjoyment_rating}/5
                      </span>
                    )}
                  </div>

                  {s.activities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.activities.map((a) => (
                        <Badge key={a.id} variant="default">
                          {ACTIVITY_LABELS.get(a.activity_key) ?? a.activity_key}
                          {a.minutes > 0 && ` · ${a.minutes}m`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {s.notes_md && (
                    <div className="prose prose-sm mt-2 max-w-none text-sm text-muted-foreground [&_p]:my-0.5 [&_strong]:text-foreground">
                      <ReactMarkdown>{s.notes_md}</ReactMarkdown>
                    </div>
                  )}

                  {s.activities.some((a) => a.note) && (
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                      {s.activities
                        .filter((a) => a.note)
                        .map((a) => (
                          <li key={`${a.id}-note`}>
                            <span className="font-medium text-foreground">
                              {ACTIVITY_LABELS.get(a.activity_key) ?? a.activity_key}
                              :
                            </span>{" "}
                            {a.note}
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
