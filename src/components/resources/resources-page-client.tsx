"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  RESOURCE_CATEGORIES,
  type ResourceItem,
} from "@/lib/data/resources";
import { ResourceCategoryNav } from "./resource-category-nav";
import {
  numberTopics,
  ResourceTopicGallery,
} from "./resource-topic-gallery";
import { AddResourceDialog } from "./add-resource-dialog";

const CATEGORY_TITLES = new Map(
  RESOURCE_CATEGORIES.map((c) => [c.id, c.title.toLowerCase()]),
);

/**
 * The "All" view of the resources library: the shared category nav with All
 * selected, then every topic as one ordered gallery. Picking a category tab
 * navigates to that category's own page — the tabs are links, not filters, so
 * the landing page and the category pages are the same surface at different
 * scopes. Client-side only for the search box.
 */
export function ResourcesPageClient({ topics }: { topics: ResourceItem[] }) {
  const [query, setQuery] = React.useState("");

  // Number first, filter second: a card keeps its place in the recommended
  // order while a search narrows what's on screen.
  const numbered = React.useMemo(() => numberTopics(topics), [topics]);
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return numbered;
    return numbered.filter(({ resource }) => {
      const categoryTitle = CATEGORY_TITLES.get(resource.categoryId) ?? "";
      return (
        resource.title.toLowerCase().includes(q) ||
        resource.description.toLowerCase().includes(q) ||
        categoryTitle.includes(q)
      );
    });
  }, [numbered, query]);

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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources..."
              aria-label="Search resources"
              className="pl-9"
            />
          </div>
          <AddResourceDialog />
        </div>
      </header>

      <ResourceCategoryNav activeCategoryId={null} />

      <p className="text-sm font-medium text-muted-foreground">
        {visible.length} topic{visible.length === 1 ? "" : "s"}
      </p>

      <ResourceTopicGallery
        topics={visible}
        emptyMessage={
          query.trim()
            ? "No resources match your search."
            : "No resources yet. Add your first one to start the library."
        }
      />
    </div>
  );
}
