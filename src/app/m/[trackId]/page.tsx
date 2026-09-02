import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isMobileUserAgent } from "@/lib/user-agent";
import {
  getCompletedActionsForTrack,
  getOpenActionsForTrack,
  getTrack,
} from "@/lib/data/tracks";
import { getVersionsForTrack } from "@/lib/data/versions";
import { getSessionTypes } from "@/lib/data/session-types";
import { getSessionsForTrack } from "@/lib/data/sessions";
import { getOpenExperimentWithCandidates } from "@/lib/data/suno";
import { listAlbums } from "@/lib/data/album";
import { TrackHeaderBar } from "@/components/track/track-header-bar";
import { TrackLogPane } from "@/components/track/track-log-pane";
import { TrackTodoList } from "@/components/mobile/track-todo-list";
import { TrackFinishingSteps } from "@/components/track-finishing-steps";
import { NotesEditor } from "@/components/notes-editor";
import { SunoPanel } from "@/components/suno/suno-panel";
import { SunoStatusToggle } from "@/components/suno-status-toggle";
import { trackSunoStatus } from "@/lib/types";
import {
  TRACK_PANES,
  TRACK_PANE_LABELS,
  parseTrackPane,
  trackPaneHref,
  type TrackPaneSearchParams,
} from "@/lib/track-pane";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * The mobile track workspace.
 *
 * Same three surfaces as `/tracks/[id]` and the same header chrome — a phone
 * just can't show Tasks, Notes and the log at once, so they become tabs. The
 * selected pane lives in the URL so the page stays a server component and only
 * the visible surface renders (see `src/lib/track-pane.ts`).
 */
export default async function MobileTrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<TrackPaneSearchParams>;
}) {
  const [{ trackId }, paneParams] = await Promise.all([params, searchParams]);
  if (!(await isMobileUserAgent())) {
    redirect(`/tracks/${trackId}`);
  }
  const pane = parseTrackPane(paneParams);

  const [
    track,
    versions,
    todos,
    completedTodos,
    sessionTypes,
    sessions,
    sunoExperiment,
    albums,
  ] = await Promise.all([
    getTrack(trackId),
    getVersionsForTrack(trackId),
    getOpenActionsForTrack(trackId),
    getCompletedActionsForTrack(trackId),
    getSessionTypes(),
    getSessionsForTrack(trackId),
    getOpenExperimentWithCandidates(trackId),
    listAlbums(),
  ]);

  if (!track) notFound();

  const sunoMeta = {
    trackId: track.id,
    trackName: track.name,
    genre: track.album?.genre?.trim() || null,
    bpm: track.bpm,
    songKey: track.song_key,
  };

  return (
    // Cancels the mobile side gutters so the header bar and tab strip run edge
    // to edge like the app's other chrome. Only 1rem comes off the top:
    // `main`'s pt-16 is 4rem, of which 3rem is clearance for the fixed header
    // (APP_CHROME.mobileHeader, h-12) and 1rem is the gutter. The bottom
    // padding is left alone — it clears the fixed bottom nav.
    <div className="-mx-4 -mt-4 flex min-h-[calc(100vh-9rem)] flex-col">
      <TrackHeaderBar
        track={track}
        albums={albums}
        sessionTypes={sessionTypes}
        variant="mobile"
      />

      <div
        role="tablist"
        aria-label="Track surfaces"
        className="sticky top-12 z-10 flex gap-1 border-b border-border bg-surface px-4 py-2"
      >
        {TRACK_PANES.map((value) => {
          const active = value === pane;
          return (
            <Link
              key={value}
              href={trackPaneHref(track.id, value)}
              role="tab"
              aria-selected={active}
              scroll={false}
              className={cn(
                "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-surface-2 font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {TRACK_PANE_LABELS[value]}
              {value === "tasks" && todos.length > 0 && (
                <span className="tabular-nums text-muted-foreground">
                  {todos.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {pane === "tasks" && (
          // `#tasks` is where the large track card's bottom action lands; the
          // desktop route keeps the fragment across its redirect here.
          <div id="tasks" className="flex scroll-mt-24 flex-col gap-5 p-4">
            <TrackTodoList trackId={track.id} initial={todos} />
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Finishing
              </h3>
              <TrackFinishingSteps
                trackId={track.id}
                steps={track.finishingSteps}
                variations={track.variations}
              />
            </div>
          </div>
        )}

        {pane === "notes" && (
          <div className="p-4">
            <NotesEditor trackId={track.id} initial={track.notes} />
          </div>
        )}

        {pane === "log" && (
          <div id="history" className="flex min-h-0 flex-1 scroll-mt-24 flex-col">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <SunoStatusToggle
                trackId={track.id}
                status={trackSunoStatus(track)}
                variant="field"
              />
              <div className="mt-3">
                <SunoPanel
                  meta={sunoMeta}
                  variant="mobile"
                  experiment={sunoExperiment}
                  versions={versions}
                />
              </div>
            </div>
            <TrackLogPane
              trackId={track.id}
              versions={versions}
              sessions={sessions}
              completedTasks={completedTodos}
              sessionTypes={sessionTypes}
              suno={{ meta: sunoMeta, open: sunoExperiment !== null }}
              variant="mobile"
            />
          </div>
        )}
      </div>
    </div>
  );
}
