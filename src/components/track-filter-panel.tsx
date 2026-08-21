"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  activeFilterCount,
  describeFilters,
  EMPTY_TRACK_FILTERS,
  removeFilterValue,
  serializeTrackFilters,
  type FilterOption,
  type TrackFilterOptions,
  type TrackFilters,
} from "@/lib/track-filters";
import { mergeQuery } from "@/lib/view-mode";
import { cn } from "@/lib/utils";

type FacetId = "status" | "album" | "key" | "tags";

const FACET_LABELS: Record<FacetId, string> = {
  status: "Status",
  album: "Album",
  key: "Key",
  tags: "Tags",
};

// One filter entry point for the whole library view: an icon button that opens
// a sheet with every facet collapsed into its own section. Selections inside
// the sheet are a draft — nothing hits the URL until "Apply", so a multi-facet
// change is a single navigation.
export function TrackFilterPanel({
  filters,
  options,
  resultCount,
  preserveQuery,
  trailing,
}: {
  filters: TrackFilters;
  options: TrackFilterOptions;
  resultCount: number;
  /** Query string owned by other controls (the view toggle) — carried through
   *  every filter navigation so applying a filter doesn't reset the view. */
  preserveQuery?: string;
  /** Controls rendered on the same row as the filter button (the view
   *  toggle), so the page's whole control bar reads as one line. */
  trailing?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<TrackFilters>(filters);
  const [tagQuery, setTagQuery] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  // `filters` only catches up once the server navigation commits, so removing
  // two chips in quick succession would otherwise have the second removal
  // derive from pre-first-removal state and put the first chip back. Every
  // read below goes through the optimistic copy, which React resets to
  // `filters` as each transition settles.
  const [live, setLive] = React.useOptimistic(filters);

  const applied = activeFilterCount(live);
  const chips = describeFilters(live, options);

  const navigate = React.useCallback(
    (next: TrackFilters) => {
      const qs = mergeQuery(preserveQuery, serializeTrackFilters(next));
      startTransition(() => {
        setLive(next);
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, preserveQuery, router, setLive],
  );

  // Opening the sheet always starts from what's actually applied, so an
  // abandoned draft never leaks into the next session.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(live);
      setTagQuery("");
    }
    setOpen(next);
  };

  const setFacet = (facet: "status" | "album" | "key", value: string) => {
    setDraft((d) => ({
      ...d,
      [facet]: d[facet] === value ? null : value,
    }));
  };

  const toggleTag = (tag: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag)
        ? d.tags.filter((t) => t !== tag)
        : [...d.tags, tag],
    }));
  };

  const draftCount = activeFilterCount(draft);
  const visibleTags = options.tags.filter((t) =>
    t.label.toLowerCase().includes(tagQuery.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              aria-label={
                applied > 0 ? `Filters, ${applied} active` : "Filter tracks"
              }
            >
              <ListFilter className="h-4 w-4" />
              Filter
              {applied > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {applied}
                </span>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="gap-0 p-0"
            aria-describedby="track-filter-description"
          >
            <div className="flex flex-col gap-1 border-b border-border p-5 pr-14">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription id="track-filter-description">
                Narrow the library by status, album, key, or tag.
              </SheetDescription>
            </div>

            <div className="flex-1 overflow-y-auto">
              <FacetSection
                facet="status"
                selectedLabel={
                  options.statuses.find((o) => o.value === draft.status)?.label
                }
                defaultOpen={draft.status != null}
              >
                <OptionChips
                  options={options.statuses}
                  isSelected={(v) => draft.status === v}
                  onToggle={(v) => setFacet("status", v)}
                />
              </FacetSection>

              <FacetSection
                facet="album"
                selectedLabel={
                  options.albums.find((o) => o.value === draft.album)?.label
                }
                defaultOpen={draft.album != null}
                emptyHint={
                  options.albums.length === 0
                    ? "No albums yet."
                    : undefined
                }
              >
                <OptionRows
                  options={options.albums}
                  isSelected={(v) => draft.album === v}
                  onToggle={(v) => setFacet("album", v)}
                />
              </FacetSection>

              <FacetSection
                facet="key"
                selectedLabel={draft.key ?? undefined}
                defaultOpen={draft.key != null}
                emptyHint={
                  options.keys.length === 0
                    ? "No tracks have a key set yet."
                    : undefined
                }
              >
                <OptionChips
                  options={options.keys}
                  isSelected={(v) => draft.key === v}
                  onToggle={(v) => setFacet("key", v)}
                />
              </FacetSection>

              <FacetSection
                facet="tags"
                selectedLabel={
                  draft.tags.length > 0
                    ? `${draft.tags.length} selected`
                    : undefined
                }
                defaultOpen={draft.tags.length > 0}
                emptyHint={
                  options.tags.length === 0 ? "No tags yet." : undefined
                }
              >
                {options.tags.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        placeholder="Search tags"
                        aria-label="Search tags"
                        className="pl-8"
                      />
                    </div>
                    {visibleTags.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">
                        No tags match “{tagQuery.trim()}”.
                      </p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto pr-1">
                        <OptionRows
                          options={visibleTags}
                          isSelected={(v) => draft.tags.includes(v)}
                          onToggle={toggleTag}
                          prefix="#"
                        />
                      </div>
                    )}
                  </div>
                )}
              </FacetSection>
            </div>

            <div className="flex items-center gap-2 border-t border-border p-4">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={draftCount === 0}
                onClick={() => {
                  setDraft(EMPTY_TRACK_FILTERS);
                  setTagQuery("");
                }}
              >
                Clear all
              </Button>
              <Button
                className="flex-1"
                disabled={pending}
                onClick={() => {
                  navigate(draft);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {trailing}
      </div>

      {applied > 0 && (
        // Chips get their own row so the control bar above stays a single
        // clean line however many filters are applied.
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.facet}:${chip.value}`}
              type="button"
              onClick={() =>
                navigate(removeFilterValue(live, chip.facet, chip.value))
              }
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 py-1 pl-3 pr-2 text-xs text-primary transition-colors hover:bg-primary/25"
              aria-label={`Remove ${FACET_LABELS[chip.facet as FacetId]} filter ${chip.label}`}
            >
              {chip.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}

          <button
            type="button"
            onClick={() => navigate(EMPTY_TRACK_FILTERS)}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {applied > 0 && (
        // The count comes from the server, so it trails the chips by one
        // navigation — dim it while that's in flight rather than showing a
        // stale number as if it were current.
        <p
          aria-busy={pending}
          className={cn(
            "text-xs text-muted-foreground transition-opacity",
            pending && "opacity-50",
          )}
        >
          {resultCount} {resultCount === 1 ? "track" : "tracks"} match
        </p>
      )}
    </div>
  );
}

function FacetSection({
  facet,
  selectedLabel,
  defaultOpen,
  emptyHint,
  children,
}: {
  facet: FacetId;
  selectedLabel?: string;
  defaultOpen?: boolean;
  emptyHint?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  const contentId = `filter-section-${facet}`;

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2"
      >
        <span className="text-sm font-medium text-foreground">
          {FACET_LABELS[facet]}
        </span>
        <span className="flex items-center gap-2">
          <span className="max-w-[10rem] truncate text-xs text-muted-foreground">
            {selectedLabel ?? "Any"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      {open && (
        <div id={contentId} className="px-5 pb-4">
          {emptyHint ? (
            <p className="text-sm text-muted-foreground">{emptyHint}</p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}

function OptionChips({
  options,
  isSelected,
  onToggle,
}: {
  options: FilterOption[];
  isSelected: (value: string) => boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = isSelected(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            <span className="ml-1.5 tabular-nums opacity-60">{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function OptionRows({
  options,
  isSelected,
  onToggle,
  prefix,
}: {
  options: FilterOption[];
  isSelected: (value: string) => boolean;
  onToggle: (value: string) => void;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col">
      {options.map((o) => {
        const active = isSelected(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            aria-pressed={active}
            className={cn(
              "flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-left text-sm transition-colors hover:bg-surface-2",
              active ? "text-primary" : "text-foreground",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="truncate">
                {prefix}
                {o.label}
              </span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
