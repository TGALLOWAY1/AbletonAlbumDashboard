import Link from "next/link";
import { Plus } from "lucide-react";
import { TrackFilterPanel } from "@/components/track-filter-panel";
import { TrackGalleryView } from "@/components/track-gallery-view";
import { TrackListView } from "@/components/track-list-view";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllTracks } from "@/lib/data/tracks";
import { getSessionStatsByTrack } from "@/lib/data/sessions";
import {
  collectFilterOptions,
  filterTracks,
  parseTrackFilters,
  serializeTrackFilters,
  STATUS_LABELS,
  type TrackFilterSearchParams,
} from "@/lib/track-filters";
import {
  DEFAULT_TRACK_VIEW,
  parseViewPreference,
  serializeViewPreference,
  type ViewSearchParams,
} from "@/lib/view-mode";
import {
  isTrackStale,
  TRACK_STATUSES,
  type TrackWithDetails,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AllTracksPage({
  searchParams,
}: {
  searchParams: Promise<TrackFilterSearchParams & ViewSearchParams>;
}) {
  const now = new Date();
  const [params, tracks, sessionStats] = await Promise.all([
    searchParams,
    getAllTracks(),
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

  const grouped = new Map<string, TrackWithDetails[]>();
  filtered.forEach((t) => {
    const list = grouped.get(t.status) ?? [];
    list.push(t);
    grouped.set(t.status, list);
  });

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
          and hand the other's through, so neither drops the other. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <TrackFilterPanel
            filters={filters}
            options={options}
            resultCount={filtered.length}
            preserveQuery={serializeViewPreference(view, DEFAULT_TRACK_VIEW)}
          />
        </div>
        <ViewModeToggle
          basePath="/tracks"
          value={view}
          defaults={DEFAULT_TRACK_VIEW}
          preserveQuery={serializeTrackFilters(filters)}
          className="md:shrink-0"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            No tracks match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {TRACK_STATUSES.filter((s) => grouped.has(s)).map((s) => (
            <section key={s}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABELS[s]}
                <Badge variant="default">{grouped.get(s)?.length ?? 0}</Badge>
              </h2>
              {view.layout === "gallery" ? (
                <TrackGalleryView
                  tracks={grouped.get(s) ?? []}
                  size={view.size}
                  sessionStats={sessionStats}
                  staleTrackIds={staleTrackIds}
                />
              ) : (
                <TrackListView
                  tracks={grouped.get(s) ?? []}
                  size={view.size}
                  sessionStats={sessionStats}
                  staleTrackIds={staleTrackIds}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
