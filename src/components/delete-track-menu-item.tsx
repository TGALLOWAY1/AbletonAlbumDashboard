"use client";

import { useTransition } from "react";
import { deleteTrack } from "@/app/actions/tracks";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/toast";

export function DeleteTrackMenuItem({
  trackId,
  trackName,
}: {
  trackId: string;
  trackName: string;
}) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

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
            toast((err as Error).message);
          }
        });
      }}
      className="text-danger focus:text-danger"
    >
      Delete track
    </DropdownMenuItem>
  );
}
