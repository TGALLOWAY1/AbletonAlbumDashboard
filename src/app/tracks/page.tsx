import Link from "next/link";
import { Disc3, Plus } from "lucide-react";
import { setActiveAlbum } from "@/app/actions/album";
import { TrackAlbumGroup } from "@/components/track-album-group";
import { TrackFilterPanel } from "@/components/track-filter-panel";
import { TrackGalleryView } from "@/components/track-gallery-view";
import { TrackListView } from "@/components/track-list-view";
import { TrackSearchInput } from "@/components/track-search-input";
import { TrackSortSelect } from "@/components/track-sort-select";
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
  parseTrackQuery,
  searchTracks,
  serializeTrackQuery,
  type TrackSearchParams,
} from "@/lib/track-search";
import {
  parseTrackSort,
  serializeTrackSort,
  sortTracks,
  type TrackSortSearchParams,
} from "@/lib/track-sort";
import {
  DEFAULT_TRACK_VIEW,
  mergeQuery,
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
  searchParams: Promise<
    TrackFilterSearchParams & ViewSearchParams & TrackSearchParams & TrackSortSearchParams
  >;
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
  const query = parseTrackQuery(params);
  const sort = parseTrackSort(params.sort);
  const options = collectFilterOptions(tracks);
  const filtered = searchTracks(filterTracks(tracks, filters), query);
  // Search narrows the library the same way a filter does, so it gets the
  // same "no empty album shelves, this is a real result state" treatment.
  const filtering = activeFilterCount(filters) > 0 || query.trim().length > 0;

  // This page is the app's album shelf as well as its track library, so an
  // unfiltered view lists every album — including the ones with no tracks yet.
  // Under a filter, an album that matched nothing is noise rather than an
  // entry point, so those drop out.
  const groups = groupTracksByAlbum(filtered, albums, {
    includeEmptyAlbums: !filtering,
  }).map((group) => ({ ...group, tracks: sortTracks(group.tracks, sort) }));

  // Every control below owns one query param and hands the rest through, so
  // switching one never resets another.
  const filtersQuery = serializeTrackFilters(filters);
  const viewQuery = serializeViewPreference(view, DEFAULT_TRACK_VIEW);
  const queryQuery = serializeTrackQuery(query);
  const sortQuery = serializeTrackSort(sort);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tracks</h1>
          <p className="mt-1 text-muted-foreground">
            Your whole library, shelved by album.
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

      {/* Search gets its own row so it stays a full-width, easy target on a
          phone; the filter/sort/view controls share the row underneath. Every
          control owns one query param and hands the rest through, so none of
          them ever resets another. */}
      <div className="flex flex-col gap-3">
        <TrackSearchInput
          value={query}
          preserveQuery={mergeQuery(filtersQuery, viewQuery, sortQuery)}
          className="w-full sm:max-w-xs"
        />

        <TrackFilterPanel
          filters={filters}
          options={options}
          resultCount={filtered.length}
          preserveQuery={mergeQuery(viewQuery, sortQuery, queryQuery)}
          trailing={
            <>
              <TrackSortSelect
                value={sort}
                preserveQuery={mergeQuery(filtersQuery, viewQuery, queryQuery)}
              />
              <ViewModeToggle
                basePath="/tracks"
                value={view}
                defaults={DEFAULT_TRACK_VIEW}
                preserveQuery={mergeQuery(filtersQuery, sortQuery, queryQuery)}
              />
            </>
          }
        />
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            {filtering
              ? "No tracks match your filters or search."
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
              ) : view.layout === "gallery" ? (
                <TrackGalleryView
                  tracks={group.tracks}
                  size={view.size}
                  sessionStats={sessionStats}
                  staleTrackIds={staleTrackIds}
                />
              ) : (
                <TrackListView
                  tracks={group.tracks}
                  size={view.size}
                  sessionStats={sessionStats}
                  staleTrackIds={staleTrackIds}
                />
              )}
            </TrackAlbumGroup>
          ))}
        </div>
      )}
    </div>
  );
}
