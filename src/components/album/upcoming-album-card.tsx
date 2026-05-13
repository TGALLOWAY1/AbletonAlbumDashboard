import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Disc3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AlbumWithTrackCount } from "@/lib/types";

export function UpcomingAlbumCard({ album }: { album: AlbumWithTrackCount }) {
  const title = album.title?.trim() || "Untitled album";
  const trackLabel = `${album.trackCount} ${album.trackCount === 1 ? "track" : "tracks"}`;
  const startLabel = album.start_date
    ? format(parseISO(album.start_date), "MMM d, yyyy")
    : null;

  return (
    <Link href={`/albums/${album.id}`} aria-label={`Open ${title}`}>
      <Card className="group flex h-full flex-col overflow-hidden transition-colors hover:border-primary/40">
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15">
          {album.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.cover_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/25">
              <Disc3 className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <h3 className="truncate text-sm font-semibold leading-tight">
            {title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{trackLabel}</span>
            {startLabel && <span className="tabular-nums">{startLabel}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
