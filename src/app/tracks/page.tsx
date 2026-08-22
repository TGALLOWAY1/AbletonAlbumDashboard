import Link from "next/link";
import { Plus } from "lucide-react";
import { TrackAlbumGroup } from "@/components/track-album-group";
import { TrackFilterPanel } from "@/components/track-filter-panel";
import { TrackGalleryView } from "@/components/track-gallery-view";
import { TrackListView } from "@/components/track-list-view";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllTracks } from "@/lib/data/tracks";
import { listAlbums } from "@/lib/data/album";
import { getSessionStatsByTrack } from "@/lib/data/sessions";
import {
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

  // Albums shelf order, so /tracks and /albums list records the same way.
  const groups = groupTracksByAlbum(
    filtered,
    albums.map((a) => a.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tracks</h1>
          <p className="mt-1 text-muted-foreground">
            Library view — beyond the active five.
          </p>
        </div>
        <Button asChild>
          <Link href="/tracks/new">
            <Plus className="h-4 w-4" />
            Add Track
          </Link>
        </Button>
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

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            No tracks match these filters.
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
              count={group.tracks.length}
            >
              {view.layout === "gallery" ? (
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
