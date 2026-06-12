"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { Pencil, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateNotes } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";

export function NotesEditor({
  trackId,
  initial,
}: {
  trackId: string;
  initial: string;
}) {
  const [editing, setEditing] = useState(initial.trim() === "");
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const save = () => {
    start(async () => {
      try {
        await updateNotes(trackId, value);
        setEditing(false);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h3>
          {!editing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <Button size="sm" onClick={save} disabled={pending}>
              <Check className="h-3.5 w-3.5" />
              Save
            </Button>
          )}
        </div>

        {editing ? (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Markdown supported. References, ideas, anything."
            rows={10}
            className="font-mono text-sm"
          />
        ) : value.trim() === "" ? (
          <p className="text-sm text-muted-foreground">
            No notes yet. Click Edit to add some.
          </p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-foreground [&_a]:text-primary [&_code]:text-accent [&_h1,&_h2,&_h3]:text-foreground [&_li]:text-foreground [&_p]:text-foreground [&_strong]:text-foreground">
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
