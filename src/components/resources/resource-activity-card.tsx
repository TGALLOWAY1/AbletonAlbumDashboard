"use client";

import * as React from "react";
import { format } from "date-fns";
import { FolderOpen, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_RANGE,
  RANGE_LONG_LABELS,
  RANGE_OPTIONS,
  type RangeKey,
} from "@/lib/analytics";
import {
  RESOURCE_CATEGORIES,
  type ResourceCategoryId,
  type ResourceItem,
} from "@/lib/data/resources";
import {
  buildRangeStrip,
  learningStreaks,
  type ActivityStrip,
} from "@/lib/learning-activity";
import {
  learningDayMap,
  learningsByCategory,
  learnedInRange,
} from "@/lib/resource-shelf";
import {
  LearningActivityLegend,
  LearningActivityMap,
} from "./learning-activity-map";

const CATEGORY_TITLES = new Map<ResourceCategoryId, string>(
  RESOURCE_CATEGORIES.map((c) => [c.id, c.title]),
);

type View = "overall" | "category";

/**
 * The Activity card — what /resources opens with.
 *
 * This replaced the "All" gallery, which was every resource the user owned
 * numbered 1..n: a list they already had two better ways to reach (a category
 * tab, or search) and which said nothing about how the library was actually
 * being used. What is worth seeing on opening Resources is whether the reading
 * is turning into anything, so the landing view is the learning log: a day
 * shaded for every resource archived on it.
 *
 * One range control, one window — the rule the Progress panel was rebuilt
 * around. The dropdown governs the map *and* every figure printed beside it,
 * both views included, because they are all read off the same strip.
 *
 * All of it is computed on the client from the whole archive, the way the
 * dashboard's stats are: the server has no idea which window is selected, so
 * switching it costs nothing.
 */
export function ResourceActivityCard({
  resources,
  className,
}: {
  /** The full archive — every resource carrying an `archivedAt`. */
  resources: ResourceItem[];
  className?: string;
}) {
  const [range, setRange] = React.useState<RangeKey>(DEFAULT_RANGE);
  const [view, setView] = React.useState<View>("overall");

  const strip = React.useMemo(
    () => buildRangeStrip({ dailyMap: learningDayMap(resources), range }),
    [resources, range],
  );

  const byCategory = React.useMemo(() => {
    // Scope to the window first, so a category with nothing in it this month
    // drops out of the list instead of showing an empty row.
    const inWindow = learnedInRange(resources, strip.start, strip.end);
    return learningsByCategory(inWindow).map((entry) => ({
      ...entry,
      strip: buildRangeStrip({ dailyMap: entry.dailyMap, range }),
    }));
  }, [resources, range, strip.start, strip.end]);

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Activity</h2>
            <Select
              value={range}
              onValueChange={(value) => setRange(value as RangeKey)}
            >
              <SelectTrigger
                aria-label="Activity window"
                className="h-8 w-auto gap-2 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {RANGE_LONG_LABELS[option.key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LearningActivityLegend />
        </div>

        <ViewTabs view={view} onChange={setView} />

        {view === "overall" ? (
          <>
            <LearningActivityMap strip={strip} />
            <LearningHeadline strip={strip} archive={resources} />
          </>
        ) : (
          <CategoryBreakdown entries={byCategory} total={strip.total} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Overall against By Category. An underlined strip rather than the app's
 * pill-shaped `Tabs`, because these two are *lenses on one card*, not
 * navigation — the same distinction the resources category nav draws.
 */
function ViewTabs({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  const tabs: { key: View; label: string; icon: typeof Globe }[] = [
    { key: "overall", label: "Overall", icon: Globe },
    { key: "category", label: "By Category", icon: FolderOpen },
  ];

  return (
    <div role="tablist" aria-label="Activity view" className="flex border-b border-border">
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = key === view;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              // -mb-px lets the active underline sit on top of the divider.
              "-mb-px flex items-center gap-2 border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** "d MMM – d MMM yyyy": the two dates the strip actually runs between. */
function rangeLabel(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

/**
 * The learning counter, and the three figures that give it context.
 *
 * "Learned" is a count of archived resources, in the window — not a stored
 * tally. All-time sits beside it as a caption rather than as its own tile,
 * because the window is what the card is about and an all-time number left on
 * its own would quietly become the headline.
 */
function LearningHeadline({
  strip,
  archive,
}: {
  strip: ActivityStrip;
  archive: ResourceItem[];
}) {
  const { longest, current } = learningStreaks(strip);
  const days = strip.days.length;

  const figures = [
    {
      label: "Learned",
      value: strip.total.toString(),
      caption: `${archive.length} all-time`,
    },
    {
      label: "Days active",
      value: strip.activeDays.toString(),
      caption: `of ${days}`,
    },
    {
      label: "Best streak",
      value: longest.toString(),
      caption: longest === 1 ? "day" : "days",
    },
    {
      label: "On a run",
      value: current.toString(),
      caption: current > 0 ? "day streak, live" : "start one today",
    },
  ];

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {figure.label}
            </span>
            <span className="text-xl font-semibold leading-none tabular-nums">
              {figure.value}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {figure.caption}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {rangeLabel(strip.start, strip.end)} · a square per day, shaded by how
        many resources you archived on it.
      </p>
    </div>
  );
}

/**
 * The same window, split by shelf: one strip per category that has any
 * learning in it, heaviest first.
 *
 * Categories with nothing in the window are left out. Seven rows of empty
 * squares would say only that the user has seven categories, which the nav
 * above the card already says.
 */
function CategoryBreakdown({
  entries,
  total,
}: {
  entries: {
    categoryId: ResourceCategoryId;
    count: number;
    strip: ActivityStrip;
  }[];
  total: number;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        Nothing learned in this window yet. Archive a resource once you&apos;ve
        read it and used it, and the category it came from shows up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) => (
        <div key={entry.categoryId} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium">
              {CATEGORY_TITLES.get(entry.categoryId) ?? entry.categoryId}
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {entry.count} of {total}
            </span>
          </div>
          <LearningActivityMap strip={entry.strip} showReadout={false} />
        </div>
      ))}
    </div>
  );
}
