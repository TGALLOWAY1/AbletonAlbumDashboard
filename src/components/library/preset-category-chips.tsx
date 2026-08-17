"use client";

import { cn } from "@/lib/utils";
import {
  PRESET_CATEGORIES,
  PRESET_CATEGORY_LABELS,
  type Preset,
  type PresetCategory,
} from "@/lib/data/library";

/**
 * "Show me my bass presets" in one tap.
 *
 * Rendered only inside the focused preset view — never on the landing screen,
 * where it would spend permanent vertical space on a control most visits don't
 * need. Categories with nothing in them are hidden rather than dead-ending.
 */
export function PresetCategoryChips({
  presets,
  value,
  onChange,
}: {
  presets: Preset[];
  value: PresetCategory | "All";
  onChange: (next: PresetCategory | "All") => void;
}) {
  const counts = new Map<PresetCategory, number>();
  for (const preset of presets) {
    counts.set(preset.category, (counts.get(preset.category) ?? 0) + 1);
  }
  // Keep the selected category visible even if a search has emptied it, so the
  // chip you just tapped doesn't vanish from under your finger.
  const visible = PRESET_CATEGORIES.filter(
    (category) => counts.has(category) || value === category,
  );

  return (
    <div
      role="group"
      aria-label="Filter presets by category"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:-mx-8 md:px-8 [&::-webkit-scrollbar]:hidden"
    >
      <Chip
        label="All"
        count={presets.length}
        selected={value === "All"}
        onClick={() => onChange("All")}
      />
      {visible.map((category) => (
        <Chip
          key={category}
          label={PRESET_CATEGORY_LABELS[category]}
          count={counts.get(category) ?? 0}
          selected={value === category}
          onClick={() => onChange(category)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "tabular-nums text-xs",
          selected ? "text-primary-foreground/80" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}
