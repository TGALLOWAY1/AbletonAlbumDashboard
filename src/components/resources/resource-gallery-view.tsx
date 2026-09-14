"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, Rows3, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mergeQuery } from "@/lib/view-mode";
import {
  RESOURCE_CATEGORIES,
  type ResourceItem,
} from "@/lib/data/resources";
import {
  countResourceTags,
  filterResourcesByTags,
  formatTag,
  groupResourcesByTag,
  serializeTagParam,
} from "@/lib/resource-tags";
import { ResourceTagChips } from "./resource-tag-chips";
import {
  numberTopics,
  ResourceTopicGallery,
  type GalleryTopic,
} from "./resource-topic-gallery";

const CATEGORY_TITLES = new Map(
  RESOURCE_CATEGORIES.map((c) => [c.id, c.title.toLowerCase()]),
);

/**
 * Everything below a resources surface's header — search, the tag filter, the
 * optional group-by-tag toggle, and the gallery itself — shared by /resources
 * and every category page so the two are visibly one system.
 *
 * Search is client state (it is a scan, not a place), while the tag selection
 * and the grouping live in the URL so a filtered view is linkable. The page
 * above stays a server component either way: it reads the params, filters
 * nothing, and hands the whole list down.
 *
 * `resting` is what /resources shows when nobody is looking for anything: the
 * activity map and the poster shelves. The gallery is still here — it is the
 * only thing that searches every category at once — it just is not the default
 * any more. Type a word or tap a tag and the results take the page over; clear
 * it and the shelves come back. A category page passes no `resting`, because
 * there its gallery *is* the page.
 */
export function ResourceGalleryView({
  topics,
  basePath,
  selectedTags,
  groupByTag = false,
  showGroupToggle = false,
  emptyMessage,
  resting,
  searchPlaceholder = "Search resources...",
}: {
  topics: ResourceItem[];
  basePath: string;
  selectedTags: string[];
  groupByTag?: boolean;
  showGroupToggle?: boolean;
  emptyMessage: string;
  resting?: React.ReactNode;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = React.useState("");

  // Number first, filter second: a card keeps its place in the recommended
  // order while a search or a tag narrows what's on screen.
  const numbered = React.useMemo(() => numberTopics(topics), [topics]);
  const positions = React.useMemo(
    () => new Map(numbered.map((t) => [t.resource.id, t.position])),
    [numbered],
  );

  const visible = React.useMemo(() => {
    const byTag = filterResourcesByTags(topics, selectedTags);
    const q = query.trim().toLowerCase();
    if (!q) return byTag;
    return byTag.filter((resource) => {
      const categoryTitle = CATEGORY_TITLES.get(resource.categoryId) ?? "";
      return (
        resource.title.toLowerCase().includes(q) ||
        resource.description.toLowerCase().includes(q) ||
        categoryTitle.includes(q) ||
        // Tags are part of the haystack everywhere: typing "bass" should find
        // the article tagged bass even when the word is in neither the title
        // nor the summary.
        resource.tags.some((tag) => tag.includes(q))
      );
    });
  }, [topics, selectedTags, query]);

  const tagCounts = React.useMemo(() => countResourceTags(topics), [topics]);

  const toGalleryTopics = React.useCallback(
    (items: ResourceItem[]): GalleryTopic[] =>
      items.map((resource) => ({
        resource,
        position: positions.get(resource.id) ?? 0,
      })),
    [positions],
  );

  const groups = React.useMemo(
    () => (groupByTag ? groupResourcesByTag(visible) : []),
    [groupByTag, visible],
  );

  const searching = query.trim().length > 0;
  const emptyText = searching
    ? "No resources match your search."
    : selectedTags.length > 0
      ? "No resources carry every tag you picked."
      : emptyMessage;

  // A variable, not a nested component: a component declared inside a render
  // is a new type on every keystroke, which would remount the whole gallery
  // (and blow away its images) as the user types.
  const gallery = (
    <>
      <p className="text-sm font-medium text-muted-foreground">
        {visible.length} topic{visible.length === 1 ? "" : "s"}
        {selectedTags.length > 0 &&
          ` tagged ${selectedTags.map(formatTag).join(" + ")}`}
      </p>

      {groupByTag ? (
        groups.length === 0 ? (
          <ResourceTopicGallery topics={[]} emptyMessage={emptyText} />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <section
                key={group.tag ?? "__untagged"}
                className="flex flex-col gap-3"
              >
                <h2 className="flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                  <span className="text-xs font-normal tabular-nums text-muted-foreground/70">
                    {group.items.length}
                  </span>
                </h2>
                <ResourceTopicGallery
                  topics={toGalleryTopics(group.items)}
                  emptyMessage={emptyText}
                />
              </section>
            ))}
          </div>
        )
      ) : (
        <ResourceTopicGallery
          topics={toGalleryTopics(visible)}
          emptyMessage={emptyText}
        />
      )}
    </>
  );

  // Nothing typed and no tag picked, on a surface that has something else to
  // show: rest there instead of listing the whole library.
  const atRest =
    resting !== undefined && !searching && selectedTags.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search resources"
            className="pl-9"
          />
        </div>
        {showGroupToggle && (
          <GroupToggle
            basePath={basePath}
            selectedTags={selectedTags}
            groupByTag={groupByTag}
          />
        )}
      </div>

      <ResourceTagChips
        basePath={basePath}
        tags={tagCounts}
        selected={selectedTags}
        preserveQuery={groupByTag ? "group=tag" : ""}
      />

      {atRest ? resting : gallery}
    </div>
  );
}

/**
 * Flat gallery vs. one section per tag. A link, not a switch, for the same
 * reason the chips are: `?group=tag` keeps the page a server component and
 * makes the grouped view linkable.
 */
function GroupToggle({
  basePath,
  selectedTags,
  groupByTag,
}: {
  basePath: string;
  selectedTags: string[];
  groupByTag: boolean;
}) {
  function href(grouped: boolean): string {
    const qs = mergeQuery(
      serializeTagParam(selectedTags),
      grouped ? "group=tag" : "",
    );
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div
      role="group"
      aria-label="Gallery grouping"
      className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface-2 p-1"
    >
      <ToggleLink href={href(false)} active={!groupByTag} icon={LayoutGrid}>
        All
      </ToggleLink>
      <ToggleLink href={href(true)} active={groupByTag} icon={Rows3}>
        Group by tag
      </ToggleLink>
    </div>
  );
}

function ToggleLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-surface text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
