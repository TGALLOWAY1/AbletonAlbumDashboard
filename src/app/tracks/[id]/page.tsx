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
import { NotesEditor } from "@/components/notes-editor";
import { SunoPanel } from "@/components/suno/suno-panel";
import { SunoStatusToggle } from "@/components/suno-status-toggle";
import { trackSunoStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The track workspace: three surfaces side by side in one viewport.
 *
 * Tasks, Notes and the track log are peers you work across, so none of them
 * hides behind a tab and none of them scrolls the others away — the page
 * itself does not scroll, each pane does. Identity and the production stages
 * ride in the header bar because they are status, not work.
 */
export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (await isMobileUserAgent()) {
    redirect(`/m/${id}`);
  }
  const [
    track,
    versions,
    completedTodos,
    openTodos,
    sessionTypes,
    sessions,
    sunoExperiment,
    albums,
  ] = await Promise.all([
    getTrack(id),
    getVersionsForTrack(id),
    getCompletedActionsForTrack(id),
    getOpenActionsForTrack(id),
    getSessionTypes(),
    getSessionsForTrack(id),
    getOpenExperimentWithCandidates(id),
    listAlbums(),
  ]);
  if (!track) notFound();

  const sunoMeta = {
    trackId: track.id,
    trackName: track.name,
    // Genre is an album-level fact (migration 0021).
    genre: track.album?.genre?.trim() || null,
    bpm: track.bpm,
    songKey: track.song_key,
  };

  return (
    // Cancelling `main`'s desktop gutters (APP_CHROME.mainPadding — md:px-8,
    // md:py-7) lets the workspace run to the viewport edges, and a fixed
    // `h-screen` is what makes the three panes scroll independently instead of
    // the page scrolling as one. Desktop has no fixed top chrome, so once the
    // vertical padding is cancelled the column starts at the viewport top.
    <div className="-mx-8 -my-7 flex h-screen min-h-[36rem] flex-col">
      <TrackHeaderBar
        track={track}
        albums={albums}
        sessionTypes={sessionTypes}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[24.5rem_minmax(0,1fr)_23.5rem]">
        {/* Tasks */}
        <section className="flex min-h-0 flex-col overflow-y-auto border-b border-border bg-surface p-5 lg:border-b-0 lg:border-r">
          <TrackTodoList
            trackId={track.id}
            initial={openTodos}
            variant="desktop"
          />
        </section>

        {/* Notes */}
        <section className="flex min-h-0 flex-col overflow-y-auto border-b border-border bg-surface p-5 lg:border-b-0 xl:border-r">
          <NotesEditor trackId={track.id} initial={track.notes} />
        </section>

        {/* Sound & log — spans both columns at lg, its own rail at xl */}
        <section className="flex min-h-0 flex-col bg-background lg:col-span-2 xl:col-span-1">
          <div className="shrink-0 border-b border-border px-5 py-3">
            <SunoStatusToggle
              trackId={track.id}
              status={trackSunoStatus(track)}
              variant="field"
            />
            <div className="mt-3">
              <SunoPanel
                meta={sunoMeta}
                variant="desktop"
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
            suno={{ meta: sunoMeta, open: sunoExperiment !== null }}
          />
        </section>
      </div>
    </div>
  );
}
