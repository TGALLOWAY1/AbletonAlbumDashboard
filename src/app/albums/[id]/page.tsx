import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlbumHeader } from "@/components/album/album-header";
import { AlbumTrackGallery } from "@/components/album/album-track-gallery";
import { AssignTracksDialog } from "@/components/album/assign-tracks-dialog";
import { AlbumDangerZone } from "@/components/album/album-danger-zone";
import { getAlbum } from "@/lib/data/album";
import { getAssignableTracks, getTracksByAlbum } from "@/lib/data/tracks";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  const [tracks, assignable] = await Promise.all([
    getTracksByAlbum(album.id),
    getAssignableTracks(album.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AlbumHeader album={album} trackCount={tracks.length} />

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tracks
          </h2>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/tracks/new">New track</Link>
            </Button>
            <AssignTracksDialog
              album={{ id: album.id, title: album.title }}
              candidates={assignable}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Add tracks
                </Button>
              }
            />
          </div>
        </div>
        {tracks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <p className="text-sm text-muted-foreground">
                No tracks in this album yet. Add existing tracks from your
                library, or{" "}
                <Link
                  href="/tracks/new"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  create a new one
                </Link>
                .
              </p>
              <AssignTracksDialog
                album={{ id: album.id, title: album.title }}
                candidates={assignable}
                trigger={
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                    Add tracks
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <AlbumTrackGallery tracks={tracks} albumId={album.id} />
        )}
      </section>

      <AlbumDangerZone albumId={album.id} albumTitle={album.title} />
    </div>
  );
}
