import Link from "next/link";
import { format } from "date-fns";
import { Play, Plus, Sun } from "lucide-react";
import { TrackCard } from "@/components/track-card";
import { SunoWorkStrip } from "@/components/suno/suno-work-strip";
import { ManualSessionEntry } from "@/components/manual-session-dialog";
import {
  PinnedTracks,
  PinnedTracksEmpty,
  type PinnedTrackItem,
} from "@/components/home/pinned-tracks";
import { PinPicker } from "@/components/home/pin-picker";
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
import { isPinnableStatus, isTrackStale, progressFromStages } from "@/lib/types";

export const dynamic = "force-dynamic";

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
 * 0026) — up to five tracks in an order you set — rather than by intersecting
 * album membership, track status and a hard cap, which is what it used to do.
 * Pinning is reversible in one click, so the page can stay honest without
 * anybody having to archive a song to change their mind.
 *
 * The three things you do here — start working, write something down, record
 * time — are all reachable without scrolling: focus from any pinned row,
 * studio tasks in the middle, and "Log session" in the header. Logging used to
 * be at the bottom of the page behind a tab, which is a strange place to put
 * the one control that keeps every number on the page true.
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

  const pinnedIds = new Set(pinnedTracks.map((t) => t.id));
  // Same predicate the server action enforces, so the picker never offers a
  // pin that `setTrackPinned` would refuse.
  const pinnable = trackOptions.filter(
    (t) => !pinnedIds.has(t.id) && isPinnableStatus(t.status),
  );

  const greeting = greetingForHour(now.getHours());
  const dateLabel = format(now, "MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {greeting}, producer.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Focus on finishing, not starting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground lg:inline-flex">
            <Sun className="h-3.5 w-3.5 text-warning" />
            {dateLabel}
          </span>
          {/* The two ways time gets recorded, side by side and above the fold:
              run the timer now, or backfill the session you already did. */}
          <Button asChild variant="outline" size="sm">
            <Link href="/focus/new">
              <Play className="h-4 w-4" />
              Start session
            </Link>
          </Button>
          <ManualSessionEntry
            tracks={trackOptions}
            sessionTypes={sessionTypes}
          />
          <Button asChild size="sm">
            <Link href="/tracks/new">
              <Plus className="h-4 w-4" />
              Add Track
            </Link>
          </Button>
        </div>
      </header>

      {pinnedItems.length > 0 ? (
        <PinnedTracks items={pinnedItems} />
      ) : (
        <PinnedTracksEmpty hasTracks={trackOptions.length > 0} />
      )}

      <PinPicker tracks={pinnable} pinnedCount={pinnedItems.length} />

      <SunoWorkStrip summary={sunoSummary} />

      <StudioTasks tasks={generalTasks} />

      <ProgressPanel tab={progressTab} />
    </div>
  );
}
