import Link from "next/link";
import { Disc3, Plus } from "lucide-react";
import { setActiveAlbum } from "@/app/actions/album";
import { ReorderableTrackList } from "@/components/reorderable-track-list";
import { TrackAlbumGroup } from "@/components/track-album-group";
import { TrackFilterPanel } from "@/components/track-filter-panel";
import { TrackGalleryItem } from "@/components/track-gallery-view";
import { ReorderableTrackListItem } from "@/components/track-list-view";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllTracks } from "@/lib/data/tracks";
import { listAlbums } from "@/lib/data/album";
import { getSessionStatsByTrack } from "@/lib/data/sessions";
import {
  activeFilterCount,
  collectFilterOptions,
  filterTracks,
  parseTrackFilters,
  serializeTrackFilters,
  type TrackFilterSearchParams,
} from "@/lib/track-filters";
import { groupTracksByAlbum } from "@/lib/track-grouping";
import {
  DEFAULT_TRACK_VIEW,
  parseViewPreference,
  serializeViewPreference,
  type ViewSearchParams,
} from "@/lib/view-mode";
import { isTrackStale } from "@/lib/types";

export const dynamic = "force-dynamic";

// `setActiveAlbum` takes an id rather than FormData, so each album binds its
// own tiny server action — same pattern the album detail page uses.
function SetActiveButton({ albumId }: { albumId: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await setActiveAlbum(albumId);
      }}
    >
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="h-auto px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Set active
      </Button>
    </form>
  );
}

/**
 * An album that exists but has nothing on it yet. Without this the album would
 * have no heading at all here, and since the library replaced the albums page
 * that would leave a newly created record unreachable outside the home page's
 * upcoming shelf.
 */
function EmptyAlbumShelf({ href }: { href: string }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          No tracks on this album yet.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={href}>Add tracks</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function AllTracksPage({
  searchParams,
}: {
  searchParams: Promise<TrackFilterSearchParams & ViewSearchParams>;
}) {
  const now = new Date();
  const [params, tracks, albums, sessionStats] = await Promise.all([
    searchParams,
    getAllTracks(),
    listAlbums(),
    getSessionStatsByTrack(),
  ]);
  // Staleness is decided here so the cards stay pure renderers.
  const staleTrackIds = new Set(
    tracks.filter((t) => isTrackStale(t, now.getTime())).map((t) => t.id),
  );

  const filters = parseTrackFilters(params);
  const view = parseViewPreference(params, DEFAULT_TRACK_VIEW);
  const options = collectFilterOptions(tracks);
  const filtered = filterTracks(tracks, filters);
  const filtering = activeFilterCount(filters) > 0;

  // This page is the app's album shelf as well as its track library, so an
  // unfiltered view lists every album — including the ones with no tracks yet.
  // Under a filter, an album that matched nothing is noise rather than an
  // entry point, so those drop out.
  const groups = groupTracksByAlbum(filtered, albums, {
    includeEmptyAlbums: !filtering,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tracks</h1>
          <p className="mt-1 text-muted-foreground">
            Your whole library, shelved by album and ordered by priority.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/albums/new">
              <Disc3 className="h-4 w-4" />
              New album
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tracks/new">
              <Plus className="h-4 w-4" />
              Add Track
            </Link>
          </Button>
        </div>
      </header>

      {/* The filter panel and the view toggle each own their own query params
          and hand the other's through, so neither drops the other. The toggle
          is passed in as the panel's trailing control so both sit on one row,
          with the filter chips wrapping underneath. */}
      <TrackFilterPanel
        filters={filters}
        options={options}
        resultCount={filtered.length}
        preserveQuery={serializeViewPreference(view, DEFAULT_TRACK_VIEW)}
        trailing={
          <ViewModeToggle
            basePath="/tracks"
            value={view}
            defaults={DEFAULT_TRACK_VIEW}
            preserveQuery={serializeTrackFilters(filters)}
          />
        }
      />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            {filtering
              ? "No tracks match these filters."
              : "Nothing here yet. Add a track, or create an album to group them under."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            // Each album shelf collapses from its heading, so a long library
            // can be narrowed to the record you're working on.
            <TrackAlbumGroup
              key={group.id}
              groupId={group.id}
              label={group.label}
              href={group.href}
              genre={group.genre}
              coverImageUrl={group.coverImageUrl}
              isActive={group.isActive}
              count={group.tracks.length}
              trailing={
                // Backlog has no album to promote, and the active one is
                // already there.
                group.href && !group.isActive ? (
                  <SetActiveButton albumId={group.id} />
                ) : null
              }
            >
              {group.tracks.length === 0 && group.href ? (
                <EmptyAlbumShelf href={group.href} />
              ) : (
                <ReorderableTrackList
                  key={group.tracks.map((track) => track.id).join(":")}
                  tracks={group.tracks.map((track) => ({
                      id: track.id,
                      name: track.name,
                      card:
                        view.layout === "gallery" ? (
                          <TrackGalleryItem
                            track={track}
                            size={view.size}
                            stats={sessionStats.get(track.id)}
                            stale={staleTrackIds.has(track.id)}
                          />
                        ) : (
                          <ReorderableTrackListItem
                            track={track}
                            size={view.size}
                            sessionStats={sessionStats.get(track.id)}
                            stale={staleTrackIds.has(track.id)}
                          />
                        ),
                  }))}
                  layout={view.layout}
                  size={view.size}
                />
              )}
            </TrackAlbumGroup>
          ))}
        </div>
      )}
    </div>
  );
}
