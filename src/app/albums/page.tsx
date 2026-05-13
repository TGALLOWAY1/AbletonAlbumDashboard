import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Disc3, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAlbums } from "@/lib/data/album";
import { setActiveAlbum } from "@/app/actions/album";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AlbumsPage() {
  const albums = await listAlbums();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Albums
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Group tracks into albums. One album is your current focus; the rest
            sit on the dashboard&apos;s upcoming shelf.
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => {
            const title = album.title?.trim() || "Untitled album";
            const startLabel = album.start_date
              ? format(parseISO(album.start_date), "MMM d, yyyy")
              : null;
            return (
              <Card
                key={album.id}
                className={cn(
                  "overflow-hidden",
                  album.is_active && "ring-1 ring-primary/40",
                )}
              >
                <Link
                  href={`/albums/${album.id}`}
                  className="block"
                  aria-label={`Open ${title}`}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
                    {album.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={album.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-foreground/25">
                        <Disc3 className="h-10 w-10" />
                      </div>
                    )}
                    {album.is_active && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                        <Star className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold leading-tight">
                      {title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {album.trackCount}{" "}
                      {album.trackCount === 1 ? "track" : "tracks"}
                      {startLabel ? ` · starts ${startLabel}` : ""}
                    </p>
                  </div>
                  {!album.is_active && (
                    <form
                      action={async () => {
                        "use server";
                        await setActiveAlbum(album.id);
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        Set active
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
