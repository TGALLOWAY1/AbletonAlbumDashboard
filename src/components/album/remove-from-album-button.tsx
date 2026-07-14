"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { assignTracksToAlbum } from "@/app/actions/tracks";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";

export function RemoveFromAlbumButton({
  trackId,
  trackName,
}: {
  trackId: string;
  trackName: string;
  albumId: string;
}) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label="Remove from album"
      title="Remove from album"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await assignTracksToAlbum(null, [trackId]);
            toast(`Removed "${trackName}" from album`);
          } catch (e) {
            toast((e as Error).message);
          }
        })
      }
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
