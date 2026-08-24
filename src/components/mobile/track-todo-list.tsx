"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addTrackTodo,
  deleteTrackTodo,
  reorderTrackTodos,
  toggleTrackTodo,
  updateTrackTodo,
} from "@/app/actions/track-todos";
import { useToast } from "@/components/toast";
import { applyOrder, moveItemTo } from "@/lib/task-order";
import type { ActionRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type TodoItem = ActionRow & { _temp?: boolean };

type Action =
  | { kind: "add"; item: TodoItem }
  | { kind: "toggle"; id: string; done: boolean }
  | { kind: "edit"; id: string; description: string }
  | { kind: "delete"; id: string }
  | { kind: "reorder"; ids: string[] };

function reducer(state: TodoItem[], action: Action): TodoItem[] {
  switch (action.kind) {
    case "add":
      return [...state, action.item];
    case "toggle":
      return state.map((t) =>
        t.id === action.id
          ? {
              ...t,
              completed_at: action.done ? new Date().toISOString() : null,
            }
          : t,
      );
    case "edit":
      return state.map((t) =>
        t.id === action.id ? { ...t, description: action.description } : t,
      );
    case "delete":
      return state.filter((t) => t.id !== action.id);
    case "reorder":
      return applyOrder(state, action.ids);
  }
}

type Variant = "desktop" | "mobile";

type Sizing = {
  input: string;
  addBtn: string;
  addIcon: string;
  row: string;
  checkCell: string;
  checkbox: string;
  label: string;
  editInput: string;
  deleteBtn: string;
  deleteIcon: string;
  handle: string;
  handleIcon: string;
};

const SIZING: Record<Variant, Sizing> = {
  mobile: {
    input:
      "h-11 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0",
    addBtn: "h-11 px-4",
    addIcon: "ml-1 h-5 w-5 shrink-0 text-primary",
    row: "flex min-h-[56px] items-center gap-2 border-b border-border/60 py-2",
    checkCell: "flex h-11 w-11 shrink-0 items-center justify-center",
    checkbox: "h-6 w-6",
    label:
      "min-w-0 flex-1 rounded-md px-1 py-2 text-left text-base leading-snug break-words",
    editInput:
      "min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary",
    deleteBtn: "h-11 w-11 shrink-0",
    deleteIcon: "h-5 w-5",
    handle: "h-11 w-9",
    handleIcon: "h-5 w-5",
  },
  desktop: {
    input:
      "h-9 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0",
    addBtn: "h-9 px-3",
    addIcon: "ml-1 h-4 w-4 shrink-0 text-primary",
    row: "flex min-h-[40px] items-center gap-2 border-b border-border/60 py-1.5",
    checkCell: "flex h-8 w-8 shrink-0 items-center justify-center",
    checkbox: "h-4 w-4",
    label:
      "min-w-0 flex-1 rounded-md px-1 py-1 text-left text-sm leading-snug break-words",
    editInput:
      "min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary",
    deleteBtn: "h-8 w-8 shrink-0",
    deleteIcon: "h-4 w-4",
    handle: "h-8 w-6",
    handleIcon: "h-4 w-4",
  },
};

/**
 * A task list, for a track or for the studio.
 *
 * `trackId` is nullable in the same way the server actions are: a string is a
 * song's task list, `null` is the studio list that belongs to no track
 * (migration 0028). The component does not branch on it beyond the heading and
 * the reorder hint — both lists add, tick, edit, delete and reorder
 * identically, which is the point of them being one component.
 */
export function TrackTodoList({
  trackId,
  initial,
  variant = "mobile",
  heading = "Tasks",
}: {
  trackId: string | null;
  initial: ActionRow[];
  variant?: Variant;
  /** Overridden by the studio list, which is not "Tasks" on a track. */
  heading?: string;
}) {
  const sizing = SIZING[variant];
  const [optimistic, applyOptimistic] = useOptimistic<TodoItem[], Action>(
    initial,
    reducer,
  );
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // Reorder state. `dragId` is the row being moved, `overId` the row whose
  // slot it takes on release. The list deliberately does NOT reshuffle live —
  // the dragged row dims and the target draws an insertion edge — because
  // reordering under the pointer makes hit-testing oscillate between two rows.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const commitOrder = (ordered: TodoItem[]) => {
    // Temp rows carry client-side ids the server has never seen.
    const ids = ordered.filter((t) => !t._temp).map((t) => t.id);
    if (ids.length === 0) return;
    startTransition(async () => {
      applyOptimistic({ kind: "reorder", ids: ordered.map((t) => t.id) });
      try {
        await reorderTrackTodos({ trackId, orderedIds: ids });
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const rowIdAtPoint = (clientY: number): string | null => {
    for (const [id, el] of rowRefs.current) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return id;
    }
    return null;
  };

  const startDrag = (
    e: React.PointerEvent<HTMLButtonElement>,
    item: TodoItem,
  ) => {
    if (item._temp) return;
    // Capture so moves keep arriving once the pointer leaves the handle.
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragId(item.id);
    setOverId(item.id);
  };

  const trackDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    const id = rowIdAtPoint(e.clientY);
    if (id) setOverId(id);
  };

  const endDrag = () => {
    if (dragId && overId && dragId !== overId) {
      commitOrder(moveItemTo(optimistic, dragId, overId));
    }
    setDragId(null);
    setOverId(null);
  };

  /** Keyboard equivalent: the handle is focusable and moves the row by one. */
  const nudge = (item: TodoItem, delta: -1 | 1) => {
    const from = optimistic.findIndex((t) => t.id === item.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= optimistic.length) return;
    commitOrder(moveItemTo(optimistic, item.id, optimistic[to].id));
  };

  const submitDraft = () => {
    const description = draft.trim();
    if (!description) return;
    setDraft("");
    const tempId = `temp-${crypto.randomUUID()}`;
    startTransition(async () => {
      applyOptimistic({
        kind: "add",
        item: {
          id: tempId,
          track_id: trackId,
          owner_id: null,
          description,
          category: null,
          estimated_minutes: null,
          sort_order: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          _temp: true,
        },
      });
      try {
        await addTrackTodo({ trackId, description });
      } catch (e) {
        toast((e as Error).message);
      }
    });
    inputRef.current?.focus();
  };

  const onToggle = (item: TodoItem, next: boolean) => {
    if (item._temp) return;
    startTransition(async () => {
      applyOptimistic({ kind: "toggle", id: item.id, done: next });
      try {
        await toggleTrackTodo(item.id, next, trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const onEdit = (item: TodoItem, description: string) => {
    const trimmed = description.trim();
    if (!trimmed || trimmed === item.description || item._temp) return;
    startTransition(async () => {
      applyOptimistic({ kind: "edit", id: item.id, description: trimmed });
      try {
        await updateTrackTodo(item.id, trimmed, trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const onDelete = (item: TodoItem) => {
    if (item._temp) return;
    startTransition(async () => {
      applyOptimistic({ kind: "delete", id: item.id });
      try {
        await deleteTrackTodo(item.id, trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const openCount = optimistic.filter((t) => t.completed_at == null).length;
  const dragIndex = dragId ? optimistic.findIndex((t) => t.id === dragId) : -1;
  const overIndex = overId ? optimistic.findIndex((t) => t.id === overId) : -1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {heading}
        </h2>
        <span className="text-xs text-muted-foreground">{openCount} open</span>
      </div>

      <form
        className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <Plus className={sizing.addIcon} aria-hidden />
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task…"
          className={sizing.input}
          enterKeyHint="done"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="sm"
          className={sizing.addBtn}
          disabled={!draft.trim()}
        >
          Add
        </Button>
      </form>

      {optimistic.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No tasks yet. Type one above and tap Add.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1">
            {optimistic.map((item, index) => (
              <TodoRow
                key={item.id}
                item={item}
                index={index}
                total={optimistic.length}
                sizing={sizing}
                dragging={dragId === item.id}
                // The edge sits on the side the row arrives from, so the gap
                // you see is the gap it lands in.
                dropEdge={
                  dragId && overId === item.id && dragId !== item.id
                    ? dragIndex < overIndex
                      ? "bottom"
                      : "top"
                    : null
                }
                registerRef={(el) => {
                  if (el) rowRefs.current.set(item.id, el);
                  else rowRefs.current.delete(item.id);
                }}
                onDragStart={(e) => startDrag(e, item)}
                onDragMove={trackDrag}
                onDragEnd={endDrag}
                onNudge={(delta) => nudge(item, delta)}
                onToggle={(next) => onToggle(item, next)}
                onEdit={(desc) => onEdit(item, desc)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </ul>
          {optimistic.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {trackId
                ? "Drag the handle to reorder — the top task is the one a focus session starts on."
                : "Drag the handle to reorder."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TodoRow({
  item,
  index,
  total,
  sizing,
  dragging,
  dropEdge,
  registerRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  onNudge,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: TodoItem;
  index: number;
  total: number;
  sizing: Sizing;
  dragging: boolean;
  dropEdge: "top" | "bottom" | null;
  registerRef: (el: HTMLLIElement | null) => void;
  onDragStart: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onNudge: (delta: -1 | 1) => void;
  onToggle: (done: boolean) => void;
  onEdit: (description: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.description);
  const done = item.completed_at != null;

  const commit = () => {
    setEditing(false);
    onEdit(draft);
  };

  const cancel = () => {
    setDraft(item.description);
    setEditing(false);
  };

  return (
    <li
      ref={registerRef}
      className={cn(
        sizing.row,
        dragging && "opacity-40",
        dropEdge === "top" && "border-t-2 border-t-primary",
        dropEdge === "bottom" && "border-b-2 border-b-primary",
      )}
    >
      <button
        type="button"
        disabled={item._temp}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onNudge(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onNudge(1);
          }
        }}
        aria-label={`Reorder "${item.description}", position ${index + 1} of ${total}. Use the up and down arrow keys to move it.`}
        title="Drag to reorder"
        // `touch-action: none` is what stops the drag from scrolling the page
        // on a phone — without it the browser claims the gesture first.
        className={cn(
          sizing.handle,
          "flex shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-muted-foreground/50 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:pointer-events-none disabled:opacity-30",
        )}
      >
        <GripVertical className={sizing.handleIcon} aria-hidden />
      </button>

      <label className={sizing.checkCell}>
        <Checkbox
          checked={done}
          onCheckedChange={(v) => onToggle(v === true)}
          className={sizing.checkbox}
          aria-label={done ? "Mark not done" : "Mark done"}
        />
      </label>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              cancel();
            }
          }}
          className={sizing.editInput}
          enterKeyHint="done"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${sizing.label} ${done ? "text-muted-foreground line-through" : ""}`}
        >
          {item.description}
          {item._temp && (
            <Check
              className="ml-2 inline h-3 w-3 animate-pulse text-muted-foreground"
              aria-hidden
            />
          )}
        </button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={sizing.deleteBtn}
        onClick={onDelete}
        aria-label="Delete task"
      >
        <Trash2 className={sizing.deleteIcon} />
      </Button>
    </li>
  );
}
