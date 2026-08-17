import Link from "next/link";
import { Plus } from "lucide-react";
import { AlbumCollectionView } from "@/components/album/album-collection-view";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAlbums } from "@/lib/data/album";
import {
  DEFAULT_ALBUM_VIEW,
  parseViewPreference,
  type ViewSearchParams,
} from "@/lib/view-mode";

export const dynamic = "force-dynamic";

export default async function AlbumsPage({
  searchParams,
}: {
  searchParams: Promise<ViewSearchParams>;
}) {
  const [albums, params] = await Promise.all([listAlbums(), searchParams]);
  const view = parseViewPreference(params, DEFAULT_ALBUM_VIEW);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Albums
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group tracks into albums. One album is your current focus; the rest
            sit on the home page&apos;s upcoming shelf.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/albums/new">
            <Plus className="h-4 w-4" />
            New album
          </Link>
        </Button>
      </header>

      {albums.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-8">
            <h2 className="text-lg font-semibold">No albums yet</h2>
            <p className="text-sm text-muted-foreground">
              Create your first album to start grouping tracks.
            </p>
            <Button asChild>
              <Link href="/albums/new">
                <Plus className="h-4 w-4" />
                Create album
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <ViewModeToggle
              basePath="/albums"
              value={view}
              defaults={DEFAULT_ALBUM_VIEW}
            />
          </div>
          <AlbumCollectionView albums={albums} view={view} />
        </>
      )}
    </div>
  );
}
