"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, ListPlus, Play, Plus, type LucideIcon } from "lucide-react";
import { addTrackTodo } from "@/app/actions/track-todos";
import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { useToast } from "@/components/toast";
import type { PickableTrack } from "@/components/track-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUICK_ACTION_LABELS, type QuickActionKey } from "@/lib/dashboard/widgets";
import type { SessionTypeRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** `addTrackTodo` refuses anything longer (its schema's `max(300)`). */
const TASK_MAX_LENGTH = 300;

const ICONS: Record<QuickActionKey, LucideIcon> = {
  "start-session": Play,
  "log-session": CalendarPlus,
  "add-track": Plus,
  "add-task": ListPlus,
};

/*
 * Full class strings, not built from the count: Tailwind only emits classes
 * it can read whole in the source.
 *
 * Two columns in a narrow box (an odd last tile spans both), one row from
 * 28rem, and always one row when stacked on a phone.
 */
const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 @md/widget:grid-cols-3 dash-stack:grid-cols-3",
  4: "grid-cols-2 @md/widget:grid-cols-4 dash-stack:grid-cols-4",
};

/**
 * An outlined tile, icon above label. Sized by the grid it sits in: the
 * tiles share the box's height, so a taller box gives taller tiles rather
 * than empty space under short ones.
 */
const TILE_CLASS =
  "flex min-h-0 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-1 text-center text-xs font-medium leading-tight text-foreground outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring last:odd:col-span-2 @md/widget:last:odd:col-span-1 widget-h3:gap-2 widget-h3:text-sm dash-stack:min-h-14 dash-stack:py-2 dash-stack:text-[11px] dash-stack:last:odd:col-span-1 [&_svg]:size-4 widget-h3:[&_svg]:size-5";

/** Adding a track was the old header's one filled button; it keeps the emphasis. */
const TILE_PRIMARY_CLASS =
  "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15";

export function QuickActionsTiles({
  actions,
  tracks,
  sessionTypes,
}: {
  /** The shortcuts to show, already in display order. */
  actions: QuickActionKey[];
  /** For the Log session dialog; empty when that shortcut is off. */
  tracks: PickableTrack[];
  sessionTypes: SessionTypeRow[];
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "grid h-full auto-rows-fr gap-2 dash-stack:gap-1.5",
          COLUMNS[actions.length] ?? COLUMNS[4],
        )}
      >
        {actions.map((key) => {
          const Icon = ICONS[key];
          const content = (
            <>
              <Icon aria-hidden />
              {QUICK_ACTION_LABELS[key]}
            </>
          );
          switch (key) {
            case "start-session":
              return (
                <Link key={key} href="/focus/new" className={TILE_CLASS}>
                  {content}
                </Link>
              );
            case "add-track":
              return (
                <Link
                  key={key}
                  href="/tracks/new"
                  className={cn(TILE_CLASS, TILE_PRIMARY_CLASS)}
                >
                  {content}
                </Link>
              );
            case "log-session":
              return (
                <button
                  key={key}
                  type="button"
                  className={TILE_CLASS}
                  onClick={() => setLogOpen(true)}
                >
                  {content}
                </button>
              );
            case "add-task":
              return (
                <button
                  key={key}
                  type="button"
                  className={TILE_CLASS}
                  onClick={() => setTaskOpen(true)}
                >
                  {content}
                </button>
              );
          }
        })}
      </div>

      {actions.includes("log-session") && (
        <SessionFormDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          tracks={tracks}
          sessionTypes={sessionTypes}
        />
      )}
      {actions.includes("add-task") && (
        <AddStudioTaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
      )}
    </>
  );
}

/**
 * One field: a studio task (no track — migration 0028), added through the
 * same `addTrackTodo` every task list uses, so it lands at the bottom of the
 * studio list exactly as if it had been typed there.
 *
 * It closes on success and stays open on failure with what was typed still
 * in the field — a jotted thought is the one thing this must not lose.
 */
function AddStudioTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const fieldId = useId();
  const description = draft.trim();

  const submit = () => {
    if (!description || pending) return;
    startTransition(async () => {
      try {
        await addTrackTodo({ trackId: null, description });
      } catch {
        toast("Could not add the task — nothing was saved. Try again.");
        return;
      }
      setDraft("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pr-10">
          <DialogTitle>Add a studio task</DialogTitle>
          <DialogDescription>
            Something for the studio rather than one song. It joins the bottom
            of your studio task list.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor={fieldId}>Task</Label>
            <Input
              id={fieldId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Back up the project drive"
              maxLength={TASK_MAX_LENGTH}
              autoComplete="off"
              enterKeyHint="done"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!description || pending}>
              {pending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
