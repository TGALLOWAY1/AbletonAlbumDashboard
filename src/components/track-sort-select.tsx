"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowDownUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  serializeTrackSort,
  TRACK_SORT_OPTIONS,
  type TrackSortKey,
} from "@/lib/track-sort";
import { mergeQuery } from "@/lib/view-mode";

/**
 * Sort control for /tracks. A plain `<select>`-style Link toggle (like
 * `ViewModeToggle`) doesn't fit five options, so this is the one control on
 * the page that's a client component navigating imperatively — same
 * "own query params, merge the rest in" contract as the view toggle and the
 * filter panel.
 */
export function TrackSortSelect({
  value,
  preserveQuery,
}: {
  value: TrackSortKey;
  /** Query string owned by other controls (filters, view, search). */
  preserveQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (next: string) => {
    const qs = mergeQuery(preserveQuery, serializeTrackSort(next as TrackSortKey));
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        aria-label="Sort tracks"
        className="h-9 w-auto min-w-[9.5rem] gap-2"
      >
        <ArrowDownUp className="h-4 w-4 shrink-0 opacity-60" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TRACK_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
