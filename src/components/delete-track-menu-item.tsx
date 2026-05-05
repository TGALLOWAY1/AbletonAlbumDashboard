"use client";

import { useTransition } from "react";
import { deleteTrack } from "@/app/actions/tracks";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function DeleteTrackMenuItem({
  trackId,
  trackName,
}: {
  trackId: string;
  trackName: string;
}) {
  const [pending, start] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pending}
      onSelect={(e) => {
        e.preventDefault();
        if (!confirm(`Delete "${trackName}"? This cannot be undone.`)) return;
        start(async () => {
          try {
            await deleteTrack(trackId);
          } catch (err) {
            alert((err as Error).message);
          }
        });
      }}
      className="text-danger focus:text-danger"
    >
      Delete track
    </DropdownMenuItem>
  );
}
