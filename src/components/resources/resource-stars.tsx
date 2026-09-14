import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RESOURCE_RATING_VALUES, readRating } from "@/lib/resource-shelf";

const SIZES = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

/**
 * A resource's rating, read-only: five stars, the first `rating` of them
 * filled.
 *
 * Unrated renders nothing at all rather than five empty outlines. A row of
 * hollow stars on every card reads as "rated zero", which is exactly the
 * judgement `null` means the user has *not* made — and on a gallery where most
 * things are unrated it would be the loudest thing on the page.
 */
export function ResourceStars({
  rating,
  size = "sm",
  className,
}: {
  rating: number | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const value = readRating(rating);
  if (value === null) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`Rated ${value} out of 5`}
    >
      {RESOURCE_RATING_VALUES.map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn(
            SIZES[size],
            n <= value
              ? "fill-warning text-warning"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}
