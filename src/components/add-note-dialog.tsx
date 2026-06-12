"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateNotes } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";

export function AddNoteDialog({
  trackId,
  trackName,
  currentNotes,
  children,
}: {
  trackId: string;
  trackName: string;
  currentNotes: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentNotes);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const handleOpenChange = (next: boolean) => {
    if (next) setValue(currentNotes);
    setOpen(next);
  };

  const save = () => {
    start(async () => {
      try {
        await updateNotes(trackId, value);
        setOpen(false);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notes — {trackName}</DialogTitle>
          <DialogDescription>
            Markdown supported. References, ideas, anything.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a note for this track…"
          rows={10}
          className="font-mono text-sm"
          autoFocus
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
