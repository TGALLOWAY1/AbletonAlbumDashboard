import Link from "next/link";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrackCover } from "@/components/track-card-parts";
import { RemoveFromAlbumButton } from "@/components/album/remove-from-album-button";
import type { TrackWithDetails } from "@/lib/types";

/**
 * The album's primary view of its songs: artwork first, with only the two
 * facts that matter when you are sequencing a record (key and BPM) and a
 * detail affordance. Everything else about a track lives on `/tracks/[id]`.
 */
export function AlbumTrackGallery({
  tracks,
  albumId,
}: {
  tracks: TrackWithDetails[];
  albumId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tracks.map((track) => (
        <AlbumTrackTile key={track.id} track={track} albumId={albumId} />
      ))}
    </div>
  );
}

function AlbumTrackTile({
  track,
  albumId,
}: {
  track: TrackWithDetails;
  albumId: string;
}) {
  const meta = [
    track.song_key,
    track.bpm ? `${track.bpm} BPM` : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="relative flex flex-col overflow-hidden">
      <Link href={`/tracks/${track.id}`} aria-label={`Open ${track.name}`}>
        <TrackCover
          track={track}
          className="aspect-square w-full"
          textClassName="text-3xl"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />
      </Link>

      <div className="absolute right-1 top-1 rounded-full bg-surface/85 backdrop-blur-sm">
        <RemoveFromAlbumButton
          trackId={track.id}
          trackName={track.name}
          albumId={albumId}
        />
      </div>

      <div className="flex items-center gap-1 p-3">
        <div className="min-w-0 flex-1">
          <Link href={`/tracks/${track.id}`} className="block min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {track.name}
            </h3>
          </Link>
          <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
            {meta.length > 0 ? meta.join(" · ") : "Key / BPM not set"}
          </p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link
            href={`/tracks/${track.id}`}
            aria-label={`${track.name} details`}
            title="Track details"
          >
            <Info className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
