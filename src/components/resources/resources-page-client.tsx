"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RESOURCE_CATEGORIES,
  type ResourceCategory,
  type ResourceCategoryId,
  type ResourceItem,
} from "@/lib/data/resources";
import { ResourceCategoryGrid } from "./resource-category-grid";
import { FeaturedResources } from "./featured-resources";
import { RecentResourcesTable } from "./recent-resources-table";
import { AddResourceDialog } from "./add-resource-dialog";
import { ResourceViewerDialog } from "./resource-viewer-dialog";
import { toggleResourceBookmark } from "@/app/actions/resources";

const CATEGORY_TITLES = new Map(
  RESOURCE_CATEGORIES.map((c) => [c.id, c.title.toLowerCase()]),
);

export function ResourcesPageClient({
  categories,
  featured,
  recent,
}: {
  categories: ResourceCategory[];
  featured: ResourceItem[];
  recent: ResourceItem[];
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [activeCategory, setActiveCategory] =
    React.useState<ResourceCategoryId | null>(null);
  const [selected, setSelected] = React.useState<ResourceItem | null>(null);
  const [pendingBookmark, startBookmark] = React.useTransition();

  const filteredRecent = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return recent.filter((item) => {
      if (activeCategory && item.categoryId !== activeCategory) return false;
      if (!q) return true;
      const categoryTitle = CATEGORY_TITLES.get(item.categoryId) ?? "";
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        categoryTitle.includes(q)
      );
    });
  }, [recent, query, activeCategory]);

  const handleSearchChange = (next: string) => {
    setQuery(next);
    setPage(1);
  };

  const handleCategorySelect = (category: ResourceCategory) => {
    setActiveCategory((prev) => (prev === category.id ? null : category.id));
    setPage(1);
  };

  const handleToggleBookmark = (id: string) => {
    if (id.startsWith("seed-")) return;
    startBookmark(async () => {
      try {
        await toggleResourceBookmark(id);
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Resources</h1>
          <p className="mt-1 text-muted-foreground">
            Curated guides, tools, and learning materials to help you create
            better music.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search resources..."
              aria-label="Search resources"
              className="pl-9"
            />
          </div>
          <AddResourceDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4" />
                Add Resource
              </Button>
            }
          />
        </div>
      </header>

      <ResourceCategoryGrid
        categories={categories}
        activeCategoryId={activeCategory}
        onSelect={handleCategorySelect}
        onViewAll={() => setActiveCategory(null)}
      />

      <FeaturedResources
        resources={featured}
        onSelect={(r) => setSelected(r)}
      />

      <RecentResourcesTable
        resources={filteredRecent}
        page={page}
        onPageChange={setPage}
        onToggleBookmark={handleToggleBookmark}
        onSelect={(r) => setSelected(r)}
        bookmarkPending={pendingBookmark}
      />

      <ResourceViewerDialog
        resource={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
