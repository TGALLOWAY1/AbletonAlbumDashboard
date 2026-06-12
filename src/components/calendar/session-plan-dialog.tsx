"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SessionTypePicker } from "./session-type-picker";
import { TrackPicker } from "./track-picker";
import {
  SessionTodoChecklist,
  type ChecklistItem,
} from "./session-todo-checklist";
import {
  createPlannedSession,
  updatePlannedSession,
  deleteSession,
} from "@/app/actions/sessions";
import { replaceSessionTodos } from "@/app/actions/session-todos";
import { instantiateTemplate } from "@/app/actions/session-templates";
import { useToast } from "@/components/toast";
import type {
  CalendarSessionRow,
  SessionTypeRow,
  TrackRow,
} from "@/lib/types";
import type { TemplateWithTodos } from "@/lib/data/session-templates";

export type PlanDialogInitial = {
  plannedStart: Date;
  plannedEnd: Date;
  sessionTypeId?: string | null;
  trackId?: string | null;
  notesMd?: string | null;
  todos?: ChecklistItem[];
  existing?: CalendarSessionRow | null;
};

function toLocalInput(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function SessionPlanDialog({
  open,
  onOpenChange,
  initial,
  sessionTypes,
  tracks,
  templates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PlanDialogInitial | null;
  sessionTypes: SessionTypeRow[];
  tracks: TrackRow[];
  templates: TemplateWithTodos[];
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();
  const { toast } = useToast();
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [sessionTypeId, setSessionTypeId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [notesMd, setNotesMd] = useState<string>("");
  const [todos, setTodos] = useState<ChecklistItem[]>([]);
  const [templateChoice, setTemplateChoice] = useState<string>("");

  const sessionType = useMemo(
    () => sessionTypes.find((t) => t.id === sessionTypeId) ?? null,
    [sessionTypes, sessionTypeId],
  );

  const isEdit = !!initial?.existing;

  useEffect(() => {
    if (!open || !initial) return;
    // Reset form to the new initial values when the dialog opens.
    /* eslint-disable react-hooks/set-state-in-effect */
    setStart(toLocalInput(initial.plannedStart));
    setEnd(toLocalInput(initial.plannedEnd));
    setSessionTypeId(initial.sessionTypeId ?? null);
    setTrackId(initial.trackId ?? null);
    setNotesMd(initial.notesMd ?? "");
    setTodos(initial.todos ?? []);
    setTemplateChoice("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial]);

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setTemplateChoice(templateId);
    if (tpl.session_type_id) setSessionTypeId(tpl.session_type_id);
    if (tpl.default_notes_md) setNotesMd(tpl.default_notes_md);
    setTodos(
      tpl.todos.map((t) => ({
        id: `tpl-${t.id}`,
        description: t.description,
        done: false,
      })),
    );
    if (start) {
      const s = new Date(start);
      const e = new Date(s.getTime() + tpl.default_duration_minutes * 60_000);
      setEnd(toLocalInput(e));
    }
  };

  const submit = () => {
    if (!initial) return;
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    if (sessionType?.requires_track && !trackId) {
      toast(`${sessionType.name} sessions require a track.`);
      return;
    }
    startTx(async () => {
      try {
        if (isEdit && initial.existing) {
          await updatePlannedSession({
            id: initial.existing.id,
            trackId,
            sessionTypeId,
            plannedStart: startIso,
            plannedEnd: endIso,
            notesMd,
          });
          await replaceSessionTodos(
            initial.existing.id,
            todos.map((t) => t.description),
          );
        } else if (templateChoice) {
          // Use the template's instantiate path so template_id gets recorded.
          const { id } = await instantiateTemplate({
            templateId: templateChoice,
            plannedStart: startIso,
            trackId,
          });
          await updatePlannedSession({
            id,
            sessionTypeId,
            plannedEnd: endIso,
            notesMd,
          });
          if (todos.length > 0) {
            await replaceSessionTodos(
              id,
              todos.map((t) => t.description),
            );
          }
        } else {
          await createPlannedSession({
            trackId,
            sessionTypeId,
            plannedStart: startIso,
            plannedEnd: endIso,
            notesMd,
            todos: todos.map((t) => t.description),
          });
        }
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const remove = () => {
    if (!initial?.existing) return;
    if (!confirm("Delete this session?")) return;
    startTx(async () => {
      await deleteSession(initial.existing!.id);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit session" : "Plan a session"}</DialogTitle>
          <DialogDescription>
            Block off time, pick a type, sketch out your todos and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!isEdit && templates.length > 0 && (
            <div className="grid gap-2">
              <Label>Start from a template</Label>
              <Select
                value={templateChoice}
                onValueChange={(v) => applyTemplate(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.default_duration_minutes}m
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Session type</Label>
            <SessionTypePicker
              types={sessionTypes}
              value={sessionTypeId}
              onChange={setSessionTypeId}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              Track {sessionType?.requires_track ? "(required)" : "(optional)"}
            </Label>
            <TrackPicker
              tracks={tracks}
              value={trackId}
              onChange={setTrackId}
              required={sessionType?.requires_track}
            />
          </div>

          <div className="grid gap-2">
            <Label>Todos for this session</Label>
            <SessionTodoChecklist
              items={todos}
              onChange={setTodos}
              showDone={isEdit}
              placeholder="What's on the list?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notesMd}
              onChange={(e) => setNotesMd(e.target.value)}
              rows={3}
              placeholder="Anything you want to remember when this block opens…"
            />
          </div>
        </div>

        <DialogFooter className="justify-between">
          <div>
            {isEdit && (
              <Button variant="danger" onClick={remove} disabled={pending}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !start || !end}>
              {isEdit ? "Save" : "Add to calendar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
