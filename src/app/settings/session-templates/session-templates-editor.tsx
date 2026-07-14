"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
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
import {
  SessionTodoChecklist,
  type ChecklistItem,
} from "@/components/calendar/session-todo-checklist";
import {
  createSessionTemplate,
  deleteSessionTemplate,
  updateSessionTemplate,
} from "@/app/actions/session-templates";
import type { SessionTypeRow } from "@/lib/types";
import type { TemplateWithTodos } from "@/lib/data/session-templates";

export function SessionTemplatesEditor({
  templates,
  sessionTypes,
}: {
  templates: TemplateWithTodos[];
  sessionTypes: SessionTypeRow[];
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {templates.map((t) => (
        <TemplateRow key={t.id} template={t} sessionTypes={sessionTypes} />
      ))}
      {adding ? (
        <NewTemplateForm
          sessionTypes={sessionTypes}
          onClose={() => setAdding(false)}
        />
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      )}
    </div>
  );
}

function NewTemplateForm({
  sessionTypes,
  onClose,
}: {
  sessionTypes: SessionTypeRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();
  const [name, setName] = useState("");
  const [sessionTypeId, setSessionTypeId] = useState<string>("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [todos, setTodos] = useState<ChecklistItem[]>([]);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="tplName">Name</Label>
          <Input
            id="tplName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sound Design Sprint"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Session type</Label>
          <Select
            value={sessionTypeId}
            onValueChange={setSessionTypeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {sessionTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tplDuration">Default duration (minutes)</Label>
        <Input
          id="tplDuration"
          inputMode="numeric"
          value={duration}
          onChange={(e) =>
            setDuration(e.target.value.replace(/[^0-9]/g, ""))
          }
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Default tasks</Label>
        <SessionTodoChecklist
          items={todos}
          onChange={setTodos}
          showDone={false}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tplNotes">Default notes</Label>
        <Textarea
          id="tplNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={pending || !name.trim() || !duration}
          onClick={() =>
            startTx(async () => {
              await createSessionTemplate({
                name: name.trim(),
                sessionTypeId: sessionTypeId || null,
                defaultDurationMinutes: parseInt(duration, 10),
                defaultNotesMd: notes || null,
                todos: todos.map((t) => t.description),
              });
              onClose();
              router.refresh();
            })
          }
        >
          Save template
        </Button>
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  sessionTypes,
}: {
  template: TemplateWithTodos;
  sessionTypes: SessionTypeRow[];
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();
  const [name, setName] = useState(template.name);
  const [sessionTypeId, setSessionTypeId] = useState(
    template.session_type_id ?? "",
  );
  const [duration, setDuration] = useState(
    String(template.default_duration_minutes),
  );
  const [notes, setNotes] = useState(template.default_notes_md ?? "");
  const [todos, setTodos] = useState<ChecklistItem[]>(
    template.todos.map((t) => ({
      id: t.id,
      description: t.description,
      done: false,
    })),
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Session type</Label>
          <Select value={sessionTypeId} onValueChange={setSessionTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {sessionTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Default duration (minutes)</Label>
        <Input
          inputMode="numeric"
          value={duration}
          onChange={(e) =>
            setDuration(e.target.value.replace(/[^0-9]/g, ""))
          }
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Default tasks</Label>
        <SessionTodoChecklist
          items={todos}
          onChange={setTodos}
          showDone={false}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Default notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this template?")) return;
            startTx(async () => {
              await deleteSessionTemplate(template.id);
              router.refresh();
            });
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTx(async () => {
              await updateSessionTemplate({
                id: template.id,
                name: name.trim(),
                sessionTypeId: sessionTypeId || null,
                defaultDurationMinutes: parseInt(duration, 10),
                defaultNotesMd: notes || null,
                todos: todos.map((t) => t.description),
              });
              router.refresh();
            })
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}
