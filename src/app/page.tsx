import Link from "next/link";
import { format } from "date-fns";
import { Play, Plus, Sun } from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { SunoWorkStrip } from "@/components/suno/suno-work-strip";
import { ManualSessionEntry } from "@/components/manual-session-dialog";
import {
  PinnedTracks,
  type PinnedTrackItem,
} from "@/components/home/pinned-tracks";
import { StudioTasks } from "@/components/home/studio-tasks";
import { ProgressPanel } from "@/components/home/progress-panel";
import { Button } from "@/components/ui/button";
import { getPinnedTracks, listTrackOptions } from "@/lib/data/tracks";
import { getGeneralTasks } from "@/lib/data/general-tasks";
import { getSessionStatsByTrack } from "@/lib/data/sessions";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSunoWorkSummary } from "@/lib/data/suno";
import {
  parseProgressTab,
  type ProgressSearchParams,
} from "@/lib/progress-tab";
import { isTrackStale, progressFromStages } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The header's three buttons, a notch tighter than `size="sm"`, icons
 * included: at stock padding they needed 361px and wrapped onto a second row
 * on a 390px phone.
 * One string so they cannot drift apart — it is the matching sizes that make
 * the row read as one control strip.
 */
const HEADER_BUTTON_CLASS = "gap-1.5 px-2.5 [&_svg]:size-3.5";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The dashboard.
 *
 * One question, asked once: what am I working on right now, and what has
 * actually been happening. It answers it with the pinned shortlist (migration
 * 0027) — up to five tracks in an order you set — rather than by intersecting
 * album membership, track status and a hard cap, which is what it used to do.
 * Pinning is reversible in one click, so the page can stay honest without
 * anybody having to archive a song to change their mind.
 *
 * The three things you do here — start working, write something down, record
 * time — are all reachable without scrolling: focus from any pinned row,
 * studio tasks straight after the shortlist, and "Log session" in the header.
 * Logging used to be at the bottom of the page behind a tab, which is a
 * strange place to put the one control that keeps every number on the page
 * true.
 *
 * Space above the shortlist is spent carefully, because on a phone it is what
 * decides whether the tasks make the first screen. The header is one row of
 * equal-sized buttons; the greeting shows only on desktop, where it shares
 * that row; and adding to the shortlist is a "+" that opens a dialog rather
 * than a picker section between the tracks and the tasks.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<ProgressSearchParams>;
}) {
  const progressTab = parseProgressTab(await searchParams);
  const now = new Date();
  const nowMs = now.getTime();

  const [pinnedTracks, trackOptions, generalTasks, sessionStats, sessionTypes, sunoSummary] =
    await Promise.all([
      getPinnedTracks(),
      listTrackOptions(),
      getGeneralTasks(),
      getSessionStatsByTrack(),
      getSessionTypes(),
      getSunoWorkSummary(),
    ]);

  // Rows are collapsed by default, so the summary is what the page actually
  // draws; the full card is passed down already rendered and only mounts when
  // a row is expanded.
  const pinnedItems: PinnedTrackItem[] = pinnedTracks.map((track) => ({
    id: track.id,
    summary: {
      id: track.id,
      name: track.name,
      coverImageUrl: track.cover_image_url,
      progress: progressFromStages(track.stages),
      openTaskCount: track.openTaskCount,
      nextTask: track.nextTask?.description ?? null,
      lastWorkedLabel: track.last_worked_at
        ? format(new Date(track.last_worked_at), "MMM d")
        : "Never worked",
      // Computed here, on the server — the card must stay pure of Date.now().
      stale: isTrackStale(track, nowMs),
    },
    card: (
      <TrackCard
        track={track}
        sessionStats={sessionStats.get(track.id)}
        stale={isTrackStale(track, nowMs)}
      />
    ),
  }));

  const greeting = greetingForHour(now.getHours());
  const dateLabel = format(now, "MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Screen-reader-only on a phone, where a heading line would push the
            shortlist down for nothing the app bar does not already say. */}
        <h1 className="sr-only text-2xl font-semibold tracking-tight md:not-sr-only">
          {greeting}, producer.
        </h1>
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground lg:inline-flex">
            <Sun className="h-3.5 w-3.5 text-warning" />
            {dateLabel}
          </span>
          {/* The two ways time gets recorded, side by side and above the fold:
              run the timer now, or backfill the session you already did. */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className={HEADER_BUTTON_CLASS}
          >
            <Link href="/focus/new">
              <Play className="h-4 w-4" />
              Start session
            </Link>
          </Button>
          <ManualSessionEntry
            tracks={trackOptions}
            sessionTypes={sessionTypes}
            variant="compact"
            className={HEADER_BUTTON_CLASS}
          />
          <Button asChild size="sm" className={HEADER_BUTTON_CLASS}>
            <Link href="/tracks/new">
              <Plus className="h-4 w-4" />
              Add Track
            </Link>
          </Button>
        </div>
      </header>

      <PinnedTracks items={pinnedItems} options={trackOptions} />

      <SunoWorkStrip summary={sunoSummary} />

      <StudioTasks tasks={generalTasks} />

      <ProgressPanel tab={progressTab} />
    </div>
  );
}
