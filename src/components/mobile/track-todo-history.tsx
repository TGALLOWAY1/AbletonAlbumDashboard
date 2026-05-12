"use client";

import { useOptimistic, useState, useTransition } from "react";
import { format } from "date-fns";
import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import {
  deleteTrackTodo,
  toggleTrackTodo,
} from "@/app/actions/track-todos";
import type { ActionRow } from "@/lib/types";

type Action =
  | { kind: "restore"; id: string }
  | { kind: "delete"; id: string };

function reducer(state: ActionRow[], action: Action): ActionRow[] {
  switch (action.kind) {
    case "restore":
    case "delete":
      return state.filter((t) => t.id !== action.id);
  }
}

export function TrackTodoHistory({
  trackId,
  initial,
  variant = "collapsible",
}: {
  trackId: string;
  initial: ActionRow[];
  variant?: "collapsible" | "panel";
}) {
  const [optimistic, applyOptimistic] = useOptimistic<ActionRow[], Action>(
    initial,
    reducer,
  );
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(variant === "panel");

  const onRestore = (item: ActionRow) => {
    startTransition(async () => {
      applyOptimistic({ kind: "restore", id: item.id });
      try {
        await toggleTrackTodo(item.id, false, trackId);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  const onDelete = (item: ActionRow) => {
    if (!confirm("Permanently delete this task from history?")) return;
    startTransition(async () => {
      applyOptimistic({ kind: "delete", id: item.id });
      try {
        await deleteTrackTodo(item.id, trackId);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  const count = optimistic.length;

  return (
    <div className="flex flex-col gap-2">
      {variant === "collapsible" && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between gap-2 rounded-md py-2 text-left"
          aria-expanded={open}
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Completed history
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {count} done
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </span>
        </button>
      )}

      {open &&
        (count === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nothing completed yet. Check off a task above to start your
            history.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {optimistic.map((item) => (
              <li
                key={item.id}
                className="flex min-h-[56px] items-center gap-3 border-b border-border/60 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-muted-foreground line-through">
                    {item.description}
                  </p>
                  {item.completed_at && (
                    <p className="text-xs text-muted-foreground/80">
                      {format(new Date(item.completed_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(item)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Restore task"
                  title="Restore"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Delete task from history"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
