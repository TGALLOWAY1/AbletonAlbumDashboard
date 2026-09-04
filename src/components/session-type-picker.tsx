"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionTypeRow } from "@/lib/types";

export function SessionTypePicker({
  types,
  value,
  onChange,
  /**
   * A type this returns true for can't be *selected* — but a type already
   * selected stays clickable so the user can always back out of it, even if
   * it would no longer be a legal choice (e.g. the track it needed was just
   * removed).
   */
  isDisabled,
  /** Shown as a title tooltip on a disabled option, and read by screen readers. */
  disabledHint,
  /**
   * "sm" (default) keeps the compact pill used in dialogs. "lg" bumps each
   * pill to a 44px minimum tap height — see the focus runner's use of it.
   */
  size = "sm",
  className,
}: {
  types: SessionTypeRow[];
  value: string | null;
  onChange: (id: string | null) => void;
  isDisabled?: (type: SessionTypeRow) => boolean;
  disabledHint?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {types.map((t) => {
        const selected = value === t.id;
        // Never disable the currently-selected option — it must stay
        // reachable to deselect, even once it's no longer pickable.
        const blocked = !selected && (isDisabled?.(t) ?? false);
        return (
          <button
            key={t.id}
            type="button"
            disabled={blocked}
            title={blocked ? disabledHint : undefined}
            aria-disabled={blocked}
            onClick={() => onChange(selected ? null : t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
              size === "lg" ? "min-h-11 px-4 py-2 text-sm" : "px-3 py-1 text-xs",
              blocked
                ? "cursor-not-allowed border-border bg-surface text-muted-foreground/50"
                : selected
                  ? "border-transparent text-white"
                  : "border-border bg-surface text-foreground hover:bg-surface-2",
            )}
            style={
              selected && !blocked
                ? { backgroundColor: t.color, borderColor: t.color }
                : undefined
            }
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color, opacity: blocked ? 0.5 : 1 }}
            />
            {t.name}
            {selected && <Check className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
}
