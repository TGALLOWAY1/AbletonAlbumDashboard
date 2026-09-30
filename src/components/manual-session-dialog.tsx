"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionFormDialog } from "@/components/sessions/session-form-dialog";
import { type PickableTrack } from "@/components/track-picker";
import { type SessionTypeRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Log past session" — the trigger for the backfill half of session logging.
 *
 * The form itself is `SessionFormDialog`, shared with the edit path so
 * backfilling a session and correcting one can never disagree about what a
 * session needs.
 *
 * `compact` is the dashboard header's: the same small size as the buttons it
 * sits between, so the three fit one row on a phone, which is also where its
 * label shortens.
 */
export function ManualSessionEntry({
  tracks,
  sessionTypes,
  trackId: fixedTrackId = null,
  variant = "desktop",
  className,
}: {
  tracks: PickableTrack[];
  sessionTypes: SessionTypeRow[];
  trackId?: string | null;
  variant?: "desktop" | "mobile" | "compact";
  /** Merged onto the trigger, for a row of buttons that must match. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size={variant === "mobile" ? "lg" : variant === "compact" ? "sm" : "md"}
        // The mobile trigger shares a row with the album picker and the pin,
        // so it keeps the 44px tap height but not the full width it used to
        // claim — stretched edge to edge it squeezed both of its neighbours
        // to nothing. The label shortens for the same reason; the dialog it
        // opens is titled "Log past session" in full.
        className={cn(variant === "mobile" && "shrink-0 px-4", className)}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {variant === "mobile" ? (
          "Log session"
        ) : variant === "compact" ? (
          <>
            <span className="sm:hidden">Log session</span>
            <span className="hidden sm:inline">Log past session</span>
          </>
        ) : (
          "Log past session"
        )}
      </Button>
      <SessionFormDialog
        open={open}
        onOpenChange={setOpen}
        tracks={tracks}
        sessionTypes={sessionTypes}
        fixedTrackId={fixedTrackId}
      />
    </>
  );
}
