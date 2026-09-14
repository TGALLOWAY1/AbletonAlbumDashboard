"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { RESOURCE_RATING_VALUES } from "@/lib/resource-shelf";
import { setResourceRating } from "@/app/actions/resources";

/**
 * The interactive five stars, on a resource's own page.
 *
 * Tapping the star you already chose clears the rating, the way
 * `RatingPicker` does for sessions — unrated has to be reachable, or a
 * misclick is permanent. It is not that picker, though: this writes straight
 * to the row on every tap (there is no form to submit around it), and it draws
 * stars rather than numbered pills, which is what the rest of the resources
 * surfaces show.
 *
 * `useOptimistic` so the stars move under the finger and fall back on their
 * own if the write fails; the message then comes through the toast, the way
 * every other client-side failure in this app does.
 */
export function ResourceRatingControl({
  resourceId,
  rating,
  className,
}: {
  resourceId: string;
  rating: number | null | undefined;
  className?: string;
}) {
  const { toast } = useToast();
  const saved = rating ?? null;
  const [optimistic, setOptimistic] = React.useOptimistic(saved);
  const [, startTransition] = React.useTransition();
  const [hovered, setHovered] = React.useState<number | null>(null);

  // The hover preview only ever *adds* fill, so letting go shows the rating
  // again rather than whatever the pointer last passed over.
  const shown = hovered ?? optimistic ?? 0;

  function handlePick(next: number) {
    const value = optimistic === next ? null : next;
    startTransition(async () => {
      setOptimistic(value);
      const result = await setResourceRating(resourceId, value);
      if (result?.error) toast(result.error);
    });
  }

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onPointerLeave={() => setHovered(null)}
    >
      <span className="sr-only" aria-live="polite">
        {optimistic === null ? "Not rated" : `Rated ${optimistic} out of 5`}
      </span>
      {RESOURCE_RATING_VALUES.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={
            optimistic === n ? `Clear rating (${n} stars)` : `Rate ${n} stars`
          }
          aria-pressed={optimistic !== null && n <= optimistic}
          onPointerEnter={() => setHovered(n)}
          onFocus={() => setHovered(n)}
          onBlur={() => setHovered(null)}
          onClick={() => handlePick(n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star
            aria-hidden
            className={cn(
              "h-5 w-5 transition-colors",
              n <= shown
                ? "fill-warning text-warning"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
