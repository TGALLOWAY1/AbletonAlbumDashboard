"use client";

import * as React from "react";
import {
  Bookmark,
  FileText,
  Link as LinkIcon,
  PlaySquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RESOURCE_CATEGORIES,
  type ResourceCategoryId,
  type ResourceItem,
} from "@/lib/data/resources";
import { LibraryPagination } from "@/components/library/library-pagination";
import { ResourcesSectionHeader } from "./resources-section-header";
import { ResourceTypeBadge } from "./resource-type-badge";

const PAGE_SIZE = 5;

const CATEGORY_TITLES: Record<ResourceCategoryId, string> = Object.fromEntries(
  RESOURCE_CATEGORIES.map((c) => [c.id, c.title]),
) as Record<ResourceCategoryId, string>;

function formatAddedDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function iconForResource(resource: ResourceItem) {
  if (resource.type === "video") return PlaySquare;
  if (resource.sourceKind === "url") return LinkIcon;
  return FileText;
}

export function RecentResourcesTable({
  resources,
  page,
  onPageChange,
  onToggleBookmark,
  onSelect,
  onViewAll,
  bookmarkPending,
}: {
  resources: ResourceItem[];
  page: number;
  onPageChange: (next: number) => void;
  onToggleBookmark?: (id: string) => void;
  onSelect?: (resource: ResourceItem) => void;
  onViewAll?: () => void;
  bookmarkPending?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(resources.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = resources.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section className="flex flex-col gap-3">
      <ResourcesSectionHeader
        title="Recently Added"
        action={
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            View all resources
          </button>
        }
      />
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Read Time</th>
                <th className="px-4 py-3 text-left">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No resources match your search.
                  </td>
                </tr>
              ) : (
                visible.map((item) => {
                  const Icon = iconForResource(item);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelect?.(item)}
                      className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface-2/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="font-medium text-foreground">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ResourceTypeBadge type={item.type} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {CATEGORY_TITLES[item.categoryId]}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.readMinutes} min
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAddedDate(item.addedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={
                              item.bookmarked ? "Remove bookmark" : "Bookmark"
                            }
                            aria-pressed={item.bookmarked ?? false}
                            disabled={bookmarkPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleBookmark?.(item.id);
                            }}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 disabled:opacity-50",
                              item.bookmarked && "text-primary",
                            )}
                          >
                            <Bookmark
                              className={cn(
                                "h-4 w-4",
                                item.bookmarked && "fill-current",
                              )}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <LibraryPagination
        page={safePage}
        totalPages={totalPages}
        totalItems={resources.length}
        pageSize={PAGE_SIZE}
        onPageChange={onPageChange}
        unit="resources"
      />
    </section>
  );
}
