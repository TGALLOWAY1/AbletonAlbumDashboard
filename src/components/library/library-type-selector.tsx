"use client";

import { cn } from "@/lib/utils";

export type LibraryTypeFocus = null | "loopStacks" | "presets";

/**
 * The Library's one conceptual division. Selecting a side focuses the browse
 * view on that asset type; selecting it again returns to the landing shelves.
 *
 * Two buttons rather than Radix Tabs, because Tabs always keeps exactly one
 * trigger selected and this control has a genuine third state — neither.
 */
export function LibraryTypeSelector({
  value,
  onChange,
}: {
  value: LibraryTypeFocus;
  onChange: (next: LibraryTypeFocus) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Browse by type"
      className="flex h-11 items-center gap-1 rounded-lg border border-border bg-surface-2 p-1"
    >
      <Segment
        label="Loop Stacks"
        selected={value === "loopStacks"}
        onClick={() => onChange(value === "loopStacks" ? null : "loopStacks")}
      />
      <Segment
        label="Presets"
        selected={value === "presets"}
        onClick={() => onChange(value === "presets" ? null : "presets")}
      />
    </div>
  );
}

function Segment({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "h-full flex-1 rounded-md px-3 text-sm font-medium transition-colors",
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-surface hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
