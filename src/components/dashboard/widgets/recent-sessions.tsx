import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { RecentSessionWhen } from "@/components/dashboard/widgets/recent-sessions-when";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { Button } from "@/components/ui/button";
import { getRecentSessions, type RecentSession } from "@/lib/data/sessions";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";
import { progressTabHref } from "@/lib/progress-tab";
import { formatDuration } from "@/lib/utils";

/**
 * Recent Sessions — the last few sessions logged: what, how long, when.
 *
 * A short tail of the History tab on the Analytics page, which is where
 * "View history" goes and where a session is edited or deleted; this list
 * only reads.
 *
 * Each row leads with a dot in the session type's colour, not the play
 * button of the design reference: nothing here plays, and a control that
 * looks pressable and does nothing is worse than no control. The row itself
 * is a link to the track when the session had one.
 *
 * Narrow boxes put the duration and date on a second line so the names keep
 * their width; from 20rem it is one line, and from 28rem the date is joined
 * by how long ago that was.
 */
export async function RecentSessionsWidget({ config }: WidgetProps<"recent-sessions">) {
  const sessions = await getRecentSessions(config.limit);

  return (
    <>
      <WidgetHeader
        title={WIDGETS["recent-sessions"].name}
        action={
          <Link
            href={progressTabHref("history")}
            aria-label="View session history"
            className="-mr-1.5 flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-primary hover:bg-primary/10 pointer-coarse:h-9 pointer-coarse:px-2.5"
          >
            <span className="hidden @xs/widget:inline">View history</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <WidgetBody>
        {sessions.length === 0 ? (
          <WidgetEmpty
            icon={History}
            title="No sessions yet"
            hint="Run a focus session, or log one you already did, and it shows up here."
            action={
              <Button asChild size="sm" variant="outline" className="dash-stack:h-9">
                <Link href="/focus/new">Start a session</Link>
              </Button>
            }
          />
        ) : (
          <ul className="-mt-1 flex flex-col divide-y divide-border">
            {sessions.map((session) => (
              <li key={session.id}>
                <SessionRow session={session} />
              </li>
            ))}
          </ul>
        )}
      </WidgetBody>
    </>
  );
}

const ROW_CLASS =
  "-mx-2 flex min-h-10 items-center gap-2.5 rounded-md px-2 py-1.5 dash-stack:min-h-11";

function SessionRow({ session }: { session: RecentSession }) {
  const type = session.sessionTypeName ?? "Session";

  const content = (
    <>
      {/* Decorative: the type is named in words right beside it. */}
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40"
        style={
          session.sessionTypeColor
            ? { backgroundColor: session.sessionTypeColor }
            : undefined
        }
      />
      <span className="flex min-w-0 flex-1 flex-col @xs/widget:flex-row @xs/widget:items-center @xs/widget:gap-3">
        <span className="min-w-0 truncate text-sm @xs/widget:flex-1">
          <span className="font-medium">{type}</span>
          {session.trackName ? (
            <> — {session.trackName}</>
          ) : (
            <span className="text-muted-foreground"> · no track</span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDuration(session.durationSeconds)}
          {" · "}
          <RecentSessionWhen iso={session.startedAt} />
        </span>
      </span>
    </>
  );

  return session.trackId ? (
    <Link
      href={`/tracks/${session.trackId}`}
      className={`${ROW_CLASS} hover:bg-surface-2`}
    >
      {content}
    </Link>
  ) : (
    <div className={ROW_CLASS}>{content}</div>
  );
}
