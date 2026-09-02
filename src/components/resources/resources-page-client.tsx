"use client";

import type { ResourceItem } from "@/lib/data/resources";
import { ResourceCategoryNav } from "./resource-category-nav";
import { ResourceGalleryView } from "./resource-gallery-view";
import { AddResourceDialog } from "./add-resource-dialog";

/**
 * The "All" view of the resources library: the shared category nav with All
 * selected, then every topic as one ordered gallery. Picking a category tab
 * navigates to that category's own page — the tabs are links, not filters, so
 * the landing page and the category pages are the same surface at different
 * scopes.
 *
 * Search, the tag filter and the gallery itself are `ResourceGalleryView`, the
 * same component the category pages mount, so the two surfaces cannot drift.
 */
export function ResourcesPageClient({
  topics,
  selectedTags,
}: {
  topics: ResourceItem[];
  selectedTags: string[];
}) {
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
        selectedTags={selectedTags}
        emptyMessage="No resources yet. Add your first one to start the library."
      />
    </div>
  );
}
