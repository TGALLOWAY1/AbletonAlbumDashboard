export type LibraryCategory = "drums" | "instruments_presets" | "fx_racks";

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
  notes?: string;
}

export const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "li_001",
    name: "Heavy Drop Kick",
    category: "drums",
    source: "Ableton",
    notes: "Punchy kick, works well for mid-tempo drops.",
  },
  {
    id: "li_002",
    name: "Glass Lead Stack",
    category: "instruments_presets",
    source: "Serum 2",
    notes: "Bright and wide lead. Needs EQ to tame highs.",
  },
  {
    id: "li_003",
    name: "Wash Out Reverb",
    category: "fx_racks",
    source: "Ableton",
    notes: "Automate dry/wet for transitions.",
  },
  {
    id: "li_004",
    name: "Sub Donk",
    category: "instruments_presets",
    source: "Phase Plant",
    notes: "Deep FM sub. Macro 1 controls FM amount.",
  },
  {
    id: "li_005",
    name: "Glitch Percs",
    category: "drums",
    source: "Razor",
    notes: "Metallic glitches. Good for top loops.",
  },
  {
    id: "li_006",
    name: "Warped Space",
    category: "fx_racks",
    source: "Massive X",
    notes: "Long evolving textures. Reverb into granular delay.",
  },
];

