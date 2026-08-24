"use client";

import { useOptimistic, useTransition } from "react";
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { setTrackPinned } from "@/app/actions/tracks";
import { MAX_PINNED_TRACKS } from "@/lib/types";

/**
 * Put this track on the dashboard shortlist, or take it off.
 *
 * Lives in the shared track header, so it works identically on `/tracks/[id]`
 * and `/m/[trackId]` (see CLAUDE.md's parity rule). Deciding a song matters
 * right now most often happens while you are looking at the song, so the pin
 * has to be here and not only on the dashboard.
 *
 * The cap is enforced server-side, in `setTrackPinned`, which returns a
 * message naming the way out ("unpin one, or finish it"). The button does not
 * try to pre-empt it: it would need the current pin count on every track page
 * to do so, and would still be stale by the time anyone clicked.
 */
export function PinTrackButton({
  trackId,
  trackName,
  pinned,
  variant = "desktop",
}: {
  trackId: string;
  trackName: string;
  pinned: boolean;
  variant?: "desktop" | "mobile";
}) {
  const [optimisticPinned, setOptimisticPinned] = useOptimistic(pinned);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const mobile = variant === "mobile";

  const toggle = () => {
    const next = !optimisticPinned;
    startTransition(async () => {
      setOptimisticPinned(next);
      const { error } = await setTrackPinned(trackId, next);
      if (error) toast(error);
    });
  };

  const label = optimisticPinned
    ? `Unpin ${trackName} from the dashboard`
    : `Pin ${trackName} to the dashboard (up to ${MAX_PINNED_TRACKS})`;

  return (
    <Button
      variant={optimisticPinned ? "default" : "outline"}
      size={mobile ? "icon" : "md"}
      // Sized to sit level with the mobile header's other 44px control, and
      // `shrink-0` so a long album title next to it can never squeeze the
      // square into a sliver.
      className={mobile ? "h-11 w-11 shrink-0" : undefined}
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimisticPinned}
      aria-label={label}
      title={label}
    >
      {optimisticPinned ? (
        <PinOff className="h-4 w-4" />
      ) : (
        <Pin className="h-4 w-4" />
      )}
      {!mobile && (optimisticPinned ? "Pinned" : "Pin")}
    </Button>
  );
}
