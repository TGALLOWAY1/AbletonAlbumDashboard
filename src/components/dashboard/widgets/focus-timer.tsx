import {
  FocusTimerPanel,
  type TimerSessionType,
  type TimerTrack,
} from "@/components/dashboard/widgets/focus-timer-panel";
import { FOCUS_PRESET_MINUTES, type WidgetProps } from "@/lib/dashboard/widgets";
import {
  getPinnedTracksCached,
  getSessionTypesCached,
  listTrackOptionsCached,
} from "@/lib/data/dashboard";
import { getNextTaskDescriptions } from "@/lib/data/focus-timer";
import { timerPresets } from "@/lib/focus-timer";

/**
 * The Focus Timer widget: start, watch and stop a focus session without
 * leaving the dashboard.
 *
 * It is a second face on the one global session `FocusSessionProvider` holds,
 * not a second timer. Starting here calls the same `start` the focus runner
 * does, with the same goal (the track's top open task); stopping hands off to
 * `/focus/log`, where `SessionLogPage` records it through `completeSession`.
 * Nothing in this widget writes a session.
 *
 * This file only gathers what the picker needs and hands plain props to the
 * client panel, which owns everything that moves:
 *
 *   tracks         every non-archived track (`listTrackOptions`), so a session
 *                  can start on any of them, not just the shortlist.
 *   goals          pinned tracks already carry `nextTask` — the dashboard
 *                  loads them for the shortlist and the read is shared per
 *                  request — so only the rest cost a query, and it is one
 *                  query for all of them (`getNextTaskDescriptions`).
 *   default track  the top of the pinned shortlist, the same track the
 *                  Current Track widget calls current. With nothing pinned
 *                  the picker opens on "No specific track".
 *
 * A failed read throws, for the widget's error boundary to report.
 */
export async function FocusTimerWidget({ config }: WidgetProps<"focus-timer">) {
  const [options, sessionTypes, pinned] = await Promise.all([
    listTrackOptionsCached(),
    getSessionTypesCached(),
    getPinnedTracksCached(),
  ]);

  const nextTask = new Map<string, string>();
  const pinnedIds = new Set<string>();
  for (const track of pinned) {
    pinnedIds.add(track.id);
    if (track.nextTask) nextTask.set(track.id, track.nextTask.description);
  }
  const unpinned = await getNextTaskDescriptions(
    options.filter((t) => !pinnedIds.has(t.id)).map((t) => t.id),
  );
  for (const [trackId, description] of unpinned) nextTask.set(trackId, description);

  const tracks: TimerTrack[] = options.map((t) => ({
    id: t.id,
    name: t.name,
    coverImageUrl: t.coverImageUrl,
    nextTask: nextTask.get(t.id) ?? null,
  }));

  const types: TimerSessionType[] = sessionTypes.map((t) => ({
    id: t.id,
    name: t.name,
    requires_track: t.requires_track,
  }));

  // An archived track can still hold a pin on a database that predates the
  // unpin-on-archive rule; only offer a default the picker actually lists.
  const defaultTrackId =
    pinned.find((p) => options.some((t) => t.id === p.id))?.id ?? null;

  return (
    <FocusTimerPanel
      defaultMinutes={config.minutes}
      presets={timerPresets(config.minutes, FOCUS_PRESET_MINUTES)}
      tracks={tracks}
      sessionTypes={types}
      defaultTrackId={defaultTrackId}
    />
  );
}
