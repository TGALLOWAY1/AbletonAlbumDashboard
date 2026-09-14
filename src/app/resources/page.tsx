import { AddResourceDialog } from "@/components/resources/add-resource-dialog";
import { ResourceCategoryNav } from "@/components/resources/resource-category-nav";
import { ResourceGalleryView } from "@/components/resources/resource-gallery-view";
import { ResourcesRestingView } from "@/components/resources/resources-resting-view";
import { getResourcesLandingData } from "@/lib/data/resources-db";
import { parseTagParam } from "@/lib/resource-tags";

export const dynamic = "force-dynamic";

/**
 * The Resources landing page.
 *
 * It used to be the "All" gallery: every resource the user owned, numbered
 * 1..n. That was the least useful view in the section — the category tabs
 * below the title reach the same material organised, and searching reaches it
 * faster — so what it actually did was make the first thing you saw on opening
 * Resources a long list you had to scroll past.
 *
 * What it shows instead is what the library is *doing*: the activity map of
 * resources learned (see ResourceActivityCard), then the poster shelves —
 * pinned first, learned below it. The gallery is still one keystroke away and
 * now searches every category at once; see `resting` in ResourceGalleryView.
 *
 * A plain server component, like the category pages it sits above. The three
 * sections below are rendered here and handed down as a prop, which is what
 * keeps the poster shelves out of the browser bundle while the search box that
 * replaces them stays client state — the same arrangement `PinnedTracks` uses
 * on the dashboard.
 */
export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const { tag } = await searchParams;
  const { topics, pinned, learned } = await getResourcesLandingData();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Resources</h1>
          <p className="mt-1 text-muted-foreground">
            Curated guides, tools, and learning materials to help you create
            better music.
          </p>
        </div>
        <AddResourceDialog />
      </header>

      <ResourceCategoryNav activeCategoryId={null} />

      <ResourceGalleryView
        topics={topics}
        basePath="/resources"
        selectedTags={parseTagParam(tag)}
        searchPlaceholder="Search every category..."
        resting={<ResourcesRestingView pinned={pinned} learned={learned} />}
        emptyMessage="No resources yet. Add your first one to start the library."
      />
    </div>
  );
}
