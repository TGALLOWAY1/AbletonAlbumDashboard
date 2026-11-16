"use client";

import { useState } from "react";
import { TrackTodoList } from "@/components/mobile/track-todo-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActionRow } from "@/lib/types";

/** On a phone the Done tab stops here — the card is as tall as its rows. */
const DONE_ROWS_STACKED = 8;

const TAB_CONTENT_CLASS = "dash-scroll mt-0 min-h-0 flex-1 px-3 pb-3";

/**
 * The Tasks widget below its header: the To do / Done tabs and the list each
 * one shows.
 *
 * Both tabs are `TrackTodoList` — the working list as it is everywhere, and
 * the same component in its `list="done"` shape for finished tasks (un-tick,
 * edit, delete; nothing to add or reorder). Ticking a task in To do, or
 * un-ticking one in Done, goes through `toggleTrackTodo` like any other
 * tick; the revalidated props then move the row to the other tab and update
 * both counts.
 *
 * The tab strip sits under the header in a narrow box. From 28rem it is
 * lifted into the header row instead (absolutely, against the widget's
 * `relative` wrapper — one strip, placed by CSS), which gives a wide, short
 * box a whole extra row of tasks.
 */
export function TasksPanel({
  trackId,
  open,
  done,
  doneTotal,
}: {
  /** `null` is the studio list. */
  trackId: string | null;
  open: ActionRow[];
  /** Finished tasks, newest first — the recent end of them. */
  done: ActionRow[];
  /** How many are finished in all; `done` may be cut short of it. */
  doneTotal: number;
}) {
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const stackedShown = Math.min(done.length, DONE_ROWS_STACKED);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value === "done" ? "done" : "todo")}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList
        aria-label="Which tasks to show"
        className="mx-3 mb-2 shrink-0 self-start p-0.5 @md/widget:absolute @md/widget:right-4 @md/widget:top-1.5 @md/widget:m-0"
      >
        <TasksTab value="todo" label="To do" count={open.length} />
        <TasksTab value="done" label="Done" count={doneTotal} />
      </TabsList>

      <TabsContent value="todo" className={TAB_CONTENT_CLASS}>
        <TrackTodoList trackId={trackId} initial={open} variant="widget" bare />
      </TabsContent>

      <TabsContent value="done" className={TAB_CONTENT_CLASS}>
        {/* Stacked, a widget cannot scroll inside itself, so the list is cut
            by CSS to its most recent rows rather than running 30 deep down
            the page. Gridded, all of `done` is there to scroll through. */}
        <div className="dash-stack:[&_li:nth-child(n+9)]:hidden">
          <TrackTodoList
            trackId={trackId}
            initial={done}
            variant="widget"
            bare
            list="done"
          />
        </div>
        {doneTotal > done.length && (
          <p className="mt-2 text-xs tabular-nums text-muted-foreground dash-stack:hidden">
            The latest {done.length} of {doneTotal}.
          </p>
        )}
        {doneTotal > stackedShown && (
          <p className="mt-2 hidden text-xs tabular-nums text-muted-foreground dash-stack:block">
            The latest {stackedShown} of {doneTotal}.
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}

function TasksTab({
  value,
  label,
  count,
}: {
  value: "todo" | "done";
  label: string;
  count: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-7 gap-1.5 px-2.5 py-0 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring dash-stack:h-9 dash-stack:px-3"
    >
      {label}
      <span className="rounded-full bg-foreground/8 px-1.5 text-[11px] font-medium tabular-nums leading-[18px]">
        {count}
      </span>
    </TabsTrigger>
  );
}
