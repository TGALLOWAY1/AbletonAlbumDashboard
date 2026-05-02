"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 14,
  className,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
  className?: string;
}) {
  const interactive = typeof onChange === "function";
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : undefined}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Icon = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              filled
                ? "fill-primary text-primary"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        );
        if (!interactive) {
          return (
            <span key={n} aria-hidden>
              {Icon}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(value === n ? 0 : n);
            }}
            aria-label={`${n} stars`}
            className="cursor-pointer"
          >
            {Icon}
          </button>
        );
      })}
    </div>
  );
}
