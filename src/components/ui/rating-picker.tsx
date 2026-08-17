"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Compact 1–5 rating control. Tapping the selected value again clears it
 * (back to null). Used by the session-completion flows.
 */
export function RatingPicker({
  label,
  value,
  onChange,
  hint,
  size = "sm",
  className,
}: {
  label?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const btn = size === "lg" ? "h-10 w-10 text-base" : "h-8 w-8 text-sm";
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${n}`}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "flex items-center justify-center rounded-full border font-medium transition-colors",
              btn,
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:bg-surface-2",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
