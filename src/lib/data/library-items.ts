export const LIBRARY_CATEGORIES = [
  "drums",
  "instruments_presets",
  "fx_racks",
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  drums: "Drums",
  instruments_presets: "Instrument / Preset",
  fx_racks: "FX Rack",
};

export const CATEGORY_BADGE_VARIANT: Record<
  LibraryCategory,
  "default" | "primary" | "accent"
> = {
  drums: "primary",
  instruments_presets: "accent",
  fx_racks: "default",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as LibraryCategory] ?? category;
}

export function categoryBadgeVariant(
  category: string,
): "default" | "primary" | "accent" {
  return CATEGORY_BADGE_VARIANT[category as LibraryCategory] ?? "default";
}

export const INSTRUMENT_SOURCES = [
  "Ableton",
  "Serum 2",
  "Phase Plant",
  "Massive X",
  "Razor",
  "Other",
] as const;

export type InstrumentSource = (typeof INSTRUMENT_SOURCES)[number];

export interface LibraryItem {
  id: string;
  name: string;
  category: LibraryCategory;
  source: InstrumentSource | string;
  notes: string;
}
