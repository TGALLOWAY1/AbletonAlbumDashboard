"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SessionFormDialog,
  type EditableSession,
} from "@/components/sessions/session-form-dialog";
import { type PickableTrack } from "@/components/track-picker";
import { deleteSession } from "@/app/actions/sessions";
import { useToast } from "@/components/toast";
import { cn, formatDuration } from "@/lib/utils";
import { type SessionTypeRow } from "@/lib/types";

/**
 * Edit and delete for one logged session.
 *
 * Mounted by every surface that lists sessions — the dashboard's History tab
 * and the track log on both track surfaces — so the two operations are defined
 * once. `variant` only sizes the buttons (44px tap targets on a phone,
 * compact on desktop); the dialogs and the server actions behind them are the
 * same everywhere.
 */
export function SessionActions({
  session,
  durationSeconds,
  tracks,
  sessionTypes,
  variant = "desktop",
  className,
}: {
  session: EditableSession;
  durationSeconds: number;
  /** Omit to keep the session on its current track — see `SessionFormDialog`. */
  tracks?: PickableTrack[];
  sessionTypes: SessionTypeRow[];
  variant?: "desktop" | "mobile";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const buttonClass = cn(
    "shrink-0",
    variant === "mobile" ? "h-11 w-11" : "h-7 w-7",
  );
  const when = session.startedAt ? new Date(session.startedAt) : null;

  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => setEditing(true)}
        aria-label="Edit this session"
        title="Edit this session"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        onClick={() => setConfirmingDelete(true)}
        aria-label="Delete this session"
        title="Delete this session"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      {/* Mounted only while open so the form reseeds from the row each time
          rather than holding the state it was first mounted with. */}
      {editing && (
        <SessionFormDialog
          open
          onOpenChange={setEditing}
          session={session}
          tracks={tracks}
          sessionTypes={sessionTypes}
        />
      )}
      {confirmingDelete && (
        <DeleteSessionDialog
          sessionId={session.id}
          when={when}
          durationSeconds={durationSeconds}
          onOpenChange={setConfirmingDelete}
        />
      )}
    </div>
  );
}

/**
 * Deleting a session moves numbers the user cannot see from here — the
 * heatmap, the streak, the track's last-worked date — so the confirmation
 * names the session it is about to remove rather than asking "are you sure?".
 * A Radix dialog, not `window.confirm`: the same reason the rest of the app
 * uses one.
 */
function DeleteSessionDialog({
  sessionId,
  when,
  durationSeconds,
  onOpenChange,
}: {
  sessionId: string;
  when: Date | null;
  durationSeconds: number;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTx] = useTransition();
  const { toast } = useToast();

  const label = [
    when && !Number.isNaN(when.getTime())
      ? format(when, "MMM d, yyyy 'at' HH:mm")
      : "an undated session",
    durationSeconds > 0 ? formatDuration(durationSeconds) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const confirm = () => {
    startTx(async () => {
      try {
        await deleteSession({ id: sessionId });
        onOpenChange(false);
        toast("Session deleted.");
        router.refresh();
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this session?</DialogTitle>
          <DialogDescription>
            {label} will be removed. The time it logged comes off the heatmap,
            the range figures and the track’s last-worked date. This can’t be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Keep it
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
