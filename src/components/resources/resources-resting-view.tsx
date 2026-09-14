import { ResourceActivityCard } from "./resource-activity-card";
import { ResourcePosterShelf } from "./resource-poster-shelf";
import { ResourcesSectionHeader } from "./resources-section-header";
import { MAX_PINNED_RESOURCES } from "@/lib/resource-shelf";
import type { ResourceItem } from "@/lib/data/resources";

/**
 * What /resources shows when nobody is searching: the activity map, then the
 * two poster shelves.
 *
 * Its own component rather than JSX inlined in the page for two reasons. It is
 * handed to `ResourceGalleryView` — a client component — as a single already-
 * rendered element, which is what keeps the shelves off the browser bundle
 * (the arrangement `PinnedTracks` uses on the dashboard). And React's
 * dev-mode key check treats a multi-child subtree crossing that boundary as a
 * dynamic list, so each section below carries a `key` even though the three of
 * them are static.
 */
export function ResourcesRestingView({
  pinned,
  learned,
}: {
  pinned: ResourceItem[];
  learned: ResourceItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <ResourceActivityCard key="activity" resources={learned} />

      <section key="pinned" className="flex flex-col gap-3">
        <ResourcesSectionHeader title={`Pinned · ${pinned.length}`} />
        <ResourcePosterShelf
          resources={pinned}
          caption="position"
          emptyMessage={`Nothing pinned yet. Open a resource and pin it to put its cover up here — room for ${MAX_PINNED_RESOURCES}.`}
        />
      </section>

      {learned.length > 0 && (
        <section key="learned" className="flex flex-col gap-3">
          <ResourcesSectionHeader title={`Learned · ${learned.length}`} />
          <ResourcePosterShelf resources={learned} caption="learned" />
        </section>
      )}
    </div>
  );
}
