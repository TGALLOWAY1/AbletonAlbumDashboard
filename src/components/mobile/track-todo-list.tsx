"use client";

import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, GripVertical, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addTrackTodo,
  deleteTrackTodo,
  reorderTrackTodos,
  toggleTrackTodo,
  updateTrackTodo,
  updateTrackTodoDetails,
} from "@/app/actions/track-todos";
import { useToast } from "@/components/toast";
import { applyOrder, moveItemTo } from "@/lib/task-order";
import {
  MAX_ESTIMATE_MINUTES,
  formatEstimateSummary,
  formatMinutes,
  taskDetails,
} from "@/lib/task-details";
import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_SHORT_LABELS,
  type ActionRow,
  type StageKey,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TodoItem = ActionRow & { _temp?: boolean };

/** What the row editor and the add form both collect beyond a description. */
type DetailsDraft = { minutes: string; stage: StageKey | "" };

const EMPTY_DETAILS: DetailsDraft = { minutes: "", stage: "" };

type Action =
  | { kind: "add"; item: TodoItem }
  | { kind: "toggle"; id: string; done: boolean }
  // `undefined` on a field means "this one did not change" — the row editor
  // only sends what the user actually touched, so an untouched stage picker
  // cannot overwrite a category the list does not render (see
  // `updateTrackTodoDetails`).
  | {
      kind: "edit";
      id: string;
      description?: string;
      estimatedMinutes?: number | null;
      category?: StageKey | null;
    }
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
        t.id === action.id
          ? {
              ...t,
              description: action.description ?? t.description,
              estimated_minutes:
                action.estimatedMinutes === undefined
                  ? t.estimated_minutes
                  : action.estimatedMinutes,
              category:
                action.category === undefined ? t.category : action.category,
            }
          : t,
      );
    case "delete":
      return state.filter((t) => t.id !== action.id);
    case "reorder":
      return applyOrder(state, action.ids);
  }
}

/**
 * Read a minutes field. `null` is an empty field (no estimate) and `undefined`
 * is a value the server would reject, which the caller turns into a toast
 * rather than a silently dropped edit.
 */
function parseMinutesDraft(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > MAX_ESTIMATE_MINUTES) return undefined;
  return rounded;
}

const BAD_MINUTES_MESSAGE = `Estimate must be a whole number of minutes, 0–${MAX_ESTIMATE_MINUTES}.`;

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
  chip: string;
  detailToggle: string;
  detailIcon: string;
  minutesInput: string;
  stageSelect: string;
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
      "w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary",
    deleteBtn: "h-11 w-11 shrink-0",
    deleteIcon: "h-5 w-5",
    handle: "h-11 w-9",
    handleIcon: "h-5 w-5",
    chip: "text-[11px]",
    detailToggle: "h-11 w-11 shrink-0",
    detailIcon: "h-5 w-5",
    minutesInput:
      "h-10 w-24 rounded-md border border-border bg-surface px-2 text-base outline-none focus:ring-2 focus:ring-primary",
    stageSelect:
      "h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-base text-foreground outline-none focus:ring-2 focus:ring-primary",
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
      "w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary",
    deleteBtn: "h-8 w-8 shrink-0",
    deleteIcon: "h-4 w-4",
    handle: "h-8 w-6",
    handleIcon: "h-4 w-4",
    chip: "text-[10px]",
    detailToggle: "h-8 w-8 shrink-0",
    detailIcon: "h-4 w-4",
    minutesInput:
      "h-8 w-20 rounded-md border border-border bg-surface px-2 text-sm outline-none focus:ring-2 focus:ring-primary",
    stageSelect:
      "h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary",
  },
};

/**
 * A task list, for a track or for the studio.
 *
 * `trackId` is nullable in the same way the server actions are: a string is a
 * song's task list, `null` is the studio list that belongs to no track
 * (migration 0028). The component does not branch on it beyond the heading,
 * the reorder hint and the stage picker — a studio task has no production
 * stage, because the five stages are a song's arc. Everything else is shared:
 * both lists add, tick, edit, estimate, delete and reorder identically, which
 * is the point of them being one component.
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
  // Studio tasks belong to no song, so they have no stage to be at.
  const showStage = trackId != null;
  const [optimistic, applyOptimistic] = useOptimistic<TodoItem[], Action>(
    initial,
    reducer,
  );
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [details, setDetails] = useState<DetailsDraft>(EMPTY_DETAILS);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsPanelId = useId();
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
    const estimatedMinutes = parseMinutesDraft(details.minutes);
    if (estimatedMinutes === undefined) {
      toast(BAD_MINUTES_MESSAGE);
      return;
    }
    const category = showStage && details.stage ? details.stage : null;
    setDraft("");
    // Cleared rather than carried over: a stage that stuck to the next task
    // without being asked for is a wrong stage nobody notices.
    setDetails(EMPTY_DETAILS);
    const tempId = `temp-${crypto.randomUUID()}`;
    startTransition(async () => {
      applyOptimistic({
        kind: "add",
        item: {
          id: tempId,
          track_id: trackId,
          owner_id: null,
          description,
          category,
          estimated_minutes: estimatedMinutes,
          sort_order: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          _temp: true,
        },
      });
      try {
        await addTrackTodo({ trackId, description, estimatedMinutes, category });
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

  /**
   * Commit a row edit — description, estimate, stage, or any combination.
   *
   * Each of the three is compared against what the row already holds and only
   * the changed ones are written, which is what keeps a stage the list cannot
   * render (a "suno" category, say) from being cleared by a save that never
   * touched the picker.
   */
  const onEdit = (
    item: TodoItem,
    next: { description: string; minutes: string; stage: StageKey | "" },
  ) => {
    if (item._temp) return;
    const current = taskDetails(item);
    const description = next.description.trim();
    if (!description) return;

    const minutes = parseMinutesDraft(next.minutes);
    if (minutes === undefined) {
      toast(BAD_MINUTES_MESSAGE);
      return;
    }
    const stage = showStage ? (next.stage || null) : current.category;

    const descriptionChanged = description !== item.description;
    const minutesChanged = minutes !== current.estimatedMinutes;
    const stageChanged = stage !== current.category;
    if (!descriptionChanged && !minutesChanged && !stageChanged) return;

    startTransition(async () => {
      applyOptimistic({
        kind: "edit",
        id: item.id,
        description: descriptionChanged ? description : undefined,
        estimatedMinutes: minutesChanged ? minutes : undefined,
        category: stageChanged ? stage : undefined,
      });
      try {
        if (descriptionChanged) {
          await updateTrackTodo(item.id, description, trackId);
        }
        if (minutesChanged || stageChanged) {
          await updateTrackTodoDetails({
            id: item.id,
            trackId,
            ...(minutesChanged ? { estimatedMinutes: minutes } : {}),
            ...(stageChanged ? { category: stage } : {}),
          });
        }
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
  // Null until something is actually estimated — an unestimated list says
  // nothing rather than announcing a confident zero.
  const estimateSummary = formatEstimateSummary(optimistic);
  const detailsSet = details.minutes.trim() !== "" || details.stage !== "";
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

      {/* Still one line to add a task: the estimate and the stage live behind a
          toggle so the fast path stays type-and-Enter. */}
      <form
        className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <div className="flex items-center gap-2">
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
            type="button"
            variant="ghost"
            size="icon"
            className={cn(sizing.detailToggle, detailsSet && "text-primary")}
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            aria-controls={detailsPanelId}
            aria-label={
              showStage ? "Estimate and stage" : "Estimate for this task"
            }
            title={showStage ? "Estimate and stage" : "Estimate"}
          >
            <SlidersHorizontal className={sizing.detailIcon} />
          </Button>
          <Button
            type="submit"
            size="sm"
            className={sizing.addBtn}
            disabled={!draft.trim()}
          >
            Add
          </Button>
        </div>

        {detailsOpen && (
          <div id={detailsPanelId}>
            <TaskDetailFields
              sizing={sizing}
              showStage={showStage}
              value={details}
              onChange={setDetails}
            />
          </div>
        )}
      </form>

      {estimateSummary && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {estimateSummary}
        </p>
      )}

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
                showStage={showStage}
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
                onEdit={(next) => onEdit(item, next)}
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

/**
 * The estimate and stage controls, shared by the add form and the row editor
 * so the two cannot offer different ranges or a different stage list.
 *
 * A native `<select>` rather than the Radix one: the value here is genuinely
 * nullable ("no stage"), which Radix models with an empty string it refuses to
 * accept as an item value, and the native control is the better picker on a
 * phone anyway.
 */
function TaskDetailFields({
  sizing,
  showStage,
  value,
  onChange,
}: {
  sizing: Sizing;
  showStage: boolean;
  value: DetailsDraft;
  onChange: (next: DetailsDraft) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_ESTIMATE_MINUTES}
        step={5}
        value={value.minutes}
        onChange={(e) => onChange({ ...value, minutes: e.target.value })}
        placeholder="min"
        aria-label="Estimated minutes"
        className={sizing.minutesInput}
      />
      {showStage && (
        <select
          value={value.stage}
          onChange={(e) =>
            onChange({ ...value, stage: e.target.value as StageKey | "" })
          }
          aria-label="Production stage"
          className={sizing.stageSelect}
        >
          <option value="">No stage</option>
          {STAGE_KEYS.map((key) => (
            <option key={key} value={key}>
              {STAGE_LABELS[key]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * The quiet chips a row carries when it has been estimated or staged.
 *
 * Rendered inside the description button so they sit on the same line as the
 * text and a tap anywhere on the row still opens the editor. `no-underline`
 * keeps them out of the strike-through a completed task's label carries.
 */
function TaskChips({ item, sizing }: { item: TodoItem; sizing: Sizing }) {
  const { estimatedMinutes, category } = taskDetails(item);
  if (estimatedMinutes == null && category == null) return null;
  const chip = cn(
    "ml-1.5 inline-flex items-center rounded-full border border-border bg-surface-2 px-1.5 py-0.5 align-middle font-medium leading-none text-muted-foreground no-underline",
    sizing.chip,
  );
  return (
    <>
      {estimatedMinutes != null && (
        <span className={cn(chip, "tabular-nums")}>
          {formatMinutes(estimatedMinutes)}
        </span>
      )}
      {category && (
        <span className={chip} title={STAGE_LABELS[category]}>
          {STAGE_SHORT_LABELS[category]}
        </span>
      )}
    </>
  );
}

function TodoRow({
  item,
  index,
  total,
  sizing,
  showStage,
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
  showStage: boolean;
  dragging: boolean;
  dropEdge: "top" | "bottom" | null;
  registerRef: (el: HTMLLIElement | null) => void;
  onDragStart: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onNudge: (delta: -1 | 1) => void;
  onToggle: (done: boolean) => void;
  onEdit: (next: {
    description: string;
    minutes: string;
    stage: StageKey | "";
  }) => void;
  onDelete: () => void;
}) {
  const stored = taskDetails(item);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.description);
  const [details, setDetails] = useState<DetailsDraft>({
    minutes: stored.estimatedMinutes == null ? "" : String(stored.estimatedMinutes),
    stage: stored.category ?? "",
  });
  const done = item.completed_at != null;

  const open = () => {
    // Re-seed from the row every time, so an edit abandoned earlier does not
    // come back the next time the row is opened.
    setDraft(item.description);
    setDetails({
      minutes:
        stored.estimatedMinutes == null ? "" : String(stored.estimatedMinutes),
      stage: stored.category ?? "",
    });
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    onEdit({ description: draft, minutes: details.minutes, stage: details.stage });
  };

  const cancel = () => {
    setDraft(item.description);
    setDetails({
      minutes:
        stored.estimatedMinutes == null ? "" : String(stored.estimatedMinutes),
      stage: stored.category ?? "",
    });
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
        // Multi-field, so committing on blur is gone: moving from the
        // description to the minutes field would have saved the row halfway
        // through the edit. Enter and Save commit, Escape and Cancel back out.
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                cancel();
              }
            }}
            aria-label="Task description"
            className={sizing.editInput}
            enterKeyHint="done"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TaskDetailFields
              sizing={sizing}
              showStage={showStage}
              value={details}
              onChange={setDetails}
            />
            <div className="ml-auto flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={commit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          className={`${sizing.label} ${done ? "text-muted-foreground line-through" : ""}`}
        >
          {item.description}
          <TaskChips item={item} sizing={sizing} />
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
