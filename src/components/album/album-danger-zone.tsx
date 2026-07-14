"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAlbum } from "@/app/actions/album";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AlbumDangerZone({
  albumId,
  albumTitle,
}: {
  albumId: string;
  albumTitle: string | null;
}) {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const displayTitle = albumTitle?.trim() || "Untitled album";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Delete this album. Tracks in it stay in your library but become
          unassigned.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                `Delete "${displayTitle}"? Its tracks will be kept and become unassigned.`,
              )
            ) {
              return;
            }
            start(async () => {
              try {
                await deleteAlbum(albumId);
              } catch (e) {
                toast((e as Error).message);
                return;
              }
              // The server action doesn't redirect (redirect() would throw
              // NEXT_REDIRECT through our catch) — navigate client-side on
              // success instead, matching the old form's redirect behavior.
              router.push("/albums");
            });
          }}
        >
          <Trash2 className="h-4 w-4" />
          {pending ? "Deleting…" : "Delete album"}
        </Button>
      </CardContent>
    </Card>
  );
}
