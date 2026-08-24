import { Card } from "@/components/ui/card";
import { TrackTodoList } from "@/components/mobile/track-todo-list";
import type { ActionRow } from "@/lib/types";

/**
 * Production work that belongs to the studio rather than to a song.
 *
 * Everything on this dashboard used to hang off a track, so "back up the
 * project drive", "sort the sample folder" or "finish the FM course" had
 * nowhere to go — they stayed in the user's head, which is the one place a
 * task list is meant to empty. These are `actions` rows with no `track_id`
 * (migration 0028) and behave exactly like a track's tasks: same add, tick,
 * edit, delete, and the same drag-to-order, because it is the same component.
 *
 * They also count toward the dashboard's tasks-done figure, since that reads
 * `completed_at` off both kinds.
 */
export function StudioTasks({ tasks }: { tasks: ActionRow[] }) {
  const open = tasks.filter((t) => t.completed_at == null);
  const recentlyDone = tasks
    .filter((t) => t.completed_at != null)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Studio tasks
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Production work that isn&apos;t about one song — gear, admin,
          learning, housekeeping.
        </p>
      </div>

      <Card className="p-4">
        {/* Completed rows stay out of the working list — they are shown as a
            short "done recently" line underneath instead, so the list is
            always the work that is left. */}
        <TrackTodoList
          trackId={null}
          initial={open}
          variant="desktop"
          heading="To do"
        />

        {recentlyDone.length > 0 && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Done recently:</span>{" "}
            {recentlyDone.map((t) => t.description).join(" · ")}
          </p>
        )}
      </Card>
    </section>
  );
}
