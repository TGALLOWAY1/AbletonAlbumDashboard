import Link from "next/link";
import { ArrowUpRight, ListTodo } from "lucide-react";
import { TasksPanel } from "@/components/dashboard/widgets/tasks-panel";
import { WidgetBody, WidgetEmpty, WidgetHeader } from "@/components/dashboard/widget-parts";
import { WIDGETS, type WidgetProps } from "@/lib/dashboard/widgets";
import { getGeneralTasksCached, listTrackOptionsCached } from "@/lib/data/dashboard";
import { getCompletedActionsForTrack, getOpenActionsForTrack } from "@/lib/data/tracks";
import type { ActionRow } from "@/lib/types";

/**
 * How many finished tasks the Done tab draws. The tab's count is the real
 * total; the list is the recent end of it, because a list that only ever
 * grows would otherwise put every task ever finished into the page.
 */
const DONE_LIMIT = 30;

/**
 * At 28rem and up the tabs move out of the body and into the header row (see
 * `TasksPanel`), so the header keeps that much of its right edge clear. The
 * open-track link, when there is one, ends up just left of them.
 */
const HEADER_ROOM_FOR_TABS = "@md/widget:pr-[12.5rem]";

/**
 * A task list on the dashboard: the studio's (no track — migration 0028) or
 * one track's remaining work, chosen in the widget's settings.
 *
 * It is the same `TrackTodoList` and the same server actions as the track
 * pages and the focus runner, so add, tick, edit, estimate, delete and
 * drag-to-order behave identically here — the widget only decides which rows
 * each tab hands it. There are two tabs because a task has two states: open
 * and completed. Nothing is "in progress"; the next thing to do is the top
 * of the open list.
 */
export async function TasksWidget({ config }: WidgetProps<"tasks">) {
  if (config.trackId == null) {
    const tasks = await getGeneralTasksCached();
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <WidgetHeader title="Studio Tasks" className={HEADER_ROOM_FOR_TABS} />
        <TasksPanel
          trackId={null}
          open={tasks.filter((t) => t.completed_at == null)}
          {...recentDone(
            tasks
              .filter((t) => t.completed_at != null)
              .sort((a, b) =>
                (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
              ),
          )}
        />
      </div>
    );
  }

  // The pickers' lean list (every non-archived track) rather than `getTrack`:
  // all this needs is a name, the page has already asked for the list, and
  // `getTrack` would run the whole details fan-out to produce one string.
  const track = (await listTrackOptionsCached()).find((t) => t.id === config.trackId);
  if (!track) {
    return (
      <>
        <WidgetHeader title={WIDGETS.tasks.name} />
        <WidgetBody>
          <WidgetEmpty
            icon={ListTodo}
            title="This track is not available"
            hint="The track this list was set to was deleted or archived. Choose another list in this widget's settings: Customize, then its menu, then Settings."
          />
        </WidgetBody>
      </>
    );
  }

  const [open, completed] = await Promise.all([
    getOpenActionsForTrack(track.id),
    // Already newest first.
    getCompletedActionsForTrack(track.id),
  ]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <WidgetHeader
        title={track.name}
        meta="tasks"
        className={HEADER_ROOM_FOR_TABS}
        action={
          <Link
            href={`/tracks/${track.id}`}
            aria-label={`Open ${track.name}`}
            title="Open track"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring dash-stack:h-9 dash-stack:w-9"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <TasksPanel trackId={track.id} open={open} {...recentDone(completed)} />
    </div>
  );
}

/** The Done tab's rows and the total they were cut from. */
function recentDone(completedNewestFirst: ActionRow[]) {
  return {
    done: completedNewestFirst.slice(0, DONE_LIMIT),
    doneTotal: completedNewestFirst.length,
  };
}
