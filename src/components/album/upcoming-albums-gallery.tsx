import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpcomingAlbumCard } from "@/components/album/upcoming-album-card";
import type { AlbumWithTrackCount } from "@/lib/types";

export function UpcomingAlbumsGallery({
  albums,
}: {
  albums: AlbumWithTrackCount[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming albums
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/albums">Manage</Link>
        </Button>
      </div>

      {albums.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-2 p-6">
            <p className="text-sm text-muted-foreground">
              No upcoming albums yet. Plan the next one so it&apos;s ready when
              this album lands.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/albums/new">
                <Plus className="h-4 w-4" />
                New album
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {albums.map((album) => (
            <UpcomingAlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </section>
  );
}
