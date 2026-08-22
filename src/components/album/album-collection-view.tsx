import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronRight, Disc3, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setActiveAlbum } from "@/app/actions/album";
import type { AlbumWithTrackCount } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GALLERY_GRID_CLASSES, type ViewPreference } from "@/lib/view-mode";

type AlbumSummary = {
  title: string;
  /** Album-level genre — the record's one genre, not a per-track tag. */
  genre: string | null;
  trackLabel: string;
  startLabel: string | null;
};

function summarize(album: AlbumWithTrackCount): AlbumSummary {
  return {
    title: album.title?.trim() || "Untitled album",
    genre: album.genre?.trim() || null,
    trackLabel: `${album.trackCount} ${album.trackCount === 1 ? "track" : "tracks"}`,
    startLabel: album.start_date
      ? format(parseISO(album.start_date), "MMM d, yyyy")
      : null,
  };
}

/** "Dubstep · 6 tracks · starts Aug 21, 2026" — whichever parts are set. */
function subtitle({ genre, trackLabel, startLabel }: AlbumSummary): string {
  return [genre, trackLabel, startLabel ? `starts ${startLabel}` : null]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The album shelf in either layout at three densities. Gallery leads with
 * artwork (one across, four across, or a wall of snapshots); list trades the
 * covers down to thumbnails so more albums fit on screen.
 */
export function AlbumCollectionView({
  albums,
  view,
}: {
  albums: AlbumWithTrackCount[];
  view: ViewPreference;
}) {
  // Read off the object first: narrowing a property doesn't survive into the
  // map callbacks below.
  const size = view.size;

  if (view.layout === "list") {
    if (size === "small") {
      return (
        <Card className="divide-y divide-border overflow-hidden">
          {albums.map((album) => (
            <CompactRow key={album.id} album={album} />
          ))}
        </Card>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {albums.map((album) => (
          <AlbumRow key={album.id} album={album} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", GALLERY_GRID_CLASSES[size])}>
      {albums.map((album) =>
        size === "large" ? (
          <LargeTile key={album.id} album={album} />
        ) : size === "medium" ? (
          <MediumTile key={album.id} album={album} />
        ) : (
          <SnapshotTile key={album.id} album={album} />
        ),
      )}
    </div>
  );
}

function AlbumCover({
  album,
  className,
  iconClassName,
  children,
}: {
  album: AlbumWithTrackCount;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15",
        className,
      )}
    >
      {album.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={album.cover_image_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-foreground/25">
          <Disc3 className={cn("h-10 w-10", iconClassName)} />
        </div>
      )}
      {children}
    </div>
  );
}

function ActiveFlag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground",
        className,
      )}
    >
      <Star className="h-3 w-3" /> Active
    </span>
  );
}

// `setActiveAlbum` takes an id rather than FormData, so each album binds its
// own tiny server action — same pattern as the album detail page.
function SetActiveButton({ albumId }: { albumId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await setActiveAlbum(albumId);
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        Set active
      </Button>
    </form>
  );
}

function LargeTile({ album }: { album: AlbumWithTrackCount }) {
  const summary = summarize(album);
  const { title } = summary;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        album.is_active && "ring-1 ring-primary/40",
      )}
    >
      {/* An album carries far less detail than a track, so "large" is a
          cover banner with the title over it rather than a wide card with an
          empty right-hand column. */}
      <Link
        href={`/albums/${album.id}`}
        aria-label={`Open ${title}`}
        className="relative block"
      >
        <AlbumCover
          album={album}
          className="h-56 w-full sm:h-72"
          iconClassName="h-16 w-16"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold leading-tight text-white">
                {title}
              </h3>
              {album.is_active && <ActiveFlag />}
            </div>
            <p className="text-sm text-white/80">{subtitle(summary)}</p>
          </div>
        </AlbumCover>
      </Link>
      <div className="flex flex-wrap gap-2 p-4">
        <Button asChild size="sm">
          <Link href={`/albums/${album.id}`}>Open album</Link>
        </Button>
        {!album.is_active && <SetActiveButton albumId={album.id} />}
      </div>
    </Card>
  );
}

function MediumTile({ album }: { album: AlbumWithTrackCount }) {
  const summary = summarize(album);
  const { title } = summary;

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden",
        album.is_active && "ring-1 ring-primary/40",
      )}
    >
      <Link
        href={`/albums/${album.id}`}
        className="block"
        aria-label={`Open ${title}`}
      >
        <AlbumCover album={album} className="aspect-square w-full">
          {album.is_active && <ActiveFlag className="absolute right-2 top-2" />}
        </AlbumCover>
      </Link>
      <div className="flex flex-1 items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-tight">
            {title}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {subtitle(summary)}
          </p>
        </div>
        {!album.is_active && <SetActiveButton albumId={album.id} />}
      </div>
    </Card>
  );
}

function SnapshotTile({ album }: { album: AlbumWithTrackCount }) {
  const { title, trackLabel } = summarize(album);

  return (
    <Link
      href={`/albums/${album.id}`}
      title={`${title} — ${trackLabel}`}
      className="group flex flex-col gap-1.5"
    >
      <AlbumCover
        album={album}
        className={cn(
          "aspect-square w-full rounded-md border border-border transition-colors group-hover:border-primary/50",
          album.is_active && "border-primary/50",
        )}
        iconClassName="h-6 w-6"
      >
        {album.is_active && (
          <span
            className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground"
            aria-label="Active album"
          >
            <Star className="h-2.5 w-2.5" />
          </span>
        )}
      </AlbumCover>
      <span className="truncate text-xs font-medium leading-tight">
        {title}
      </span>
    </Link>
  );
}

function AlbumRow({
  album,
  size,
}: {
  album: AlbumWithTrackCount;
  size: "large" | "medium";
}) {
  const summary = summarize(album);
  const { title } = summary;
  const large = size === "large";

  return (
    <Card
      className={cn(
        "flex items-center gap-3 p-3",
        album.is_active && "ring-1 ring-primary/40",
      )}
    >
      <Link
        href={`/albums/${album.id}`}
        aria-label={`Open ${title}`}
        className={cn("shrink-0", large ? "h-20 w-20" : "h-12 w-12")}
      >
        <AlbumCover
          album={album}
          className="h-full w-full rounded-md"
          iconClassName={large ? "h-8 w-8" : "h-5 w-5"}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/albums/${album.id}`}
            className={cn(
              "truncate font-semibold leading-tight hover:underline",
              large ? "text-base" : "text-sm",
            )}
          >
            {title}
          </Link>
          {album.is_active && <ActiveFlag />}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {subtitle(summary)}
        </p>
      </div>
      {!album.is_active && <SetActiveButton albumId={album.id} />}
    </Card>
  );
}

// Whole row is a single link — no nested interactive elements at this density.
function CompactRow({ album }: { album: AlbumWithTrackCount }) {
  const { title, trackLabel } = summarize(album);

  return (
    <Link
      href={`/albums/${album.id}`}
      className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2"
    >
      <AlbumCover
        album={album}
        className="h-8 w-8 shrink-0 rounded"
        iconClassName="h-4 w-4"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {title}
      </span>
      {album.is_active && <ActiveFlag />}
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {trackLabel}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
