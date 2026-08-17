/**
 * Library domain types and the pure logic behind browsing it.
 *
 * The Library is a sound reuse surface, not an inventory: everything here is
 * shaped around "hear it, recognise it, move to the next candidate". It holds
 * three concepts and nothing else —
 *
 *   Loop Stack   a reusable musical section captured from a project
 *   Preset       a saved instrument/sound worth reaching for again
 *   Collection   a curated group referencing both of the above
 *
 * No `server-only` here on purpose: the browsing UI is a client component and
 * imports these types and helpers directly. Database access lives next door in
 * `library-db.ts`.
 */

export const PRESET_CATEGORIES = [
  "Bass",
  "Chords",
  "Keys",
  "Lead",
  "Pad",
  "Drums",
  "Texture",
  "FX",
  "Other",
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

/** Plural label for the category chips ("Pad" reads better as "Pads"). */
export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  Bass: "Bass",
  Chords: "Chords",
  Keys: "Keys",
  Lead: "Lead",
  Pad: "Pads",
  Drums: "Drums",
  Texture: "Texture",
  FX: "FX",
  Other: "Other",
};

export function isPresetCategory(value: string): value is PresetCategory {
  return (PRESET_CATEGORIES as readonly string[]).includes(value);
}

/** Coerce an arbitrary DB string into a category, defaulting to "Other". */
export function toPresetCategory(value: string | null | undefined) {
  return value && isPresetCategory(value) ? value : "Other";
}

export type LoopStackComponent = {
  /** "track" | "stem" | "clip" | "device" — free-form for now. */
  kind: string;
  name: string;
};

export type LoopStack = {
  id: string;
  name: string;
  /** Signed URL for playback. Absent when there is no preview audio. */
  previewUrl?: string;
  /** Storage object key — kept for re-signing and deletion. */
  previewPath?: string;
  artworkUrl?: string;
  key?: string;
  bpm?: number;
  bars?: number;
  sourceProject?: string;
  sourcePath?: string;
  favorite: boolean;
  notes: string;
  /** Reserved for deeper Ableton integration; not surfaced as a Library type. */
  components: LoopStackComponent[];
  createdAt: string;
  updatedAt: string;
};

export type Preset = {
  id: string;
  name: string;
  plugin?: string;
  category: PresetCategory;
  previewUrl?: string;
  previewPath?: string;
  artworkUrl?: string;
  presetPath?: string;
  sourceProject?: string;
  favorite: boolean;
  core: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CollectionItemRef = {
  /** Row id of the join record — what remove/reorder operate on. */
  itemId: string;
  type: "preset" | "loopStack";
  id: string;
  position: number;
};

export type LibraryCollection = {
  id: string;
  name: string;
  description?: string;
  artworkUrl?: string;
  items: CollectionItemRef[];
  position: number;
  createdAt: string;
  updatedAt: string;
};

/** What the player needs to play something and label it. */
export type PlayableAsset = {
  id: string;
  kind: "loopStack" | "preset";
  name: string;
  subtitle: string;
  artworkUrl?: string;
  previewUrl?: string;
  previewPath?: string;
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(" · ");
}

/** "C minor · 95 BPM · 8 bars", skipping whatever is missing. */
export function loopStackSubtitle(stack: {
  key?: string;
  bpm?: number;
  bars?: number;
}): string {
  return joinMeta([
    stack.key,
    stack.bpm != null ? `${stack.bpm} BPM` : null,
    stack.bars != null ? `${stack.bars} bars` : null,
  ]);
}

/** "Serum 2 · Bass", skipping a missing plugin. */
export function presetSubtitle(preset: {
  plugin?: string;
  category: PresetCategory;
}): string {
  return joinMeta([preset.plugin, preset.category]);
}

export function toPlayableLoopStack(stack: LoopStack): PlayableAsset {
  return {
    id: stack.id,
    kind: "loopStack",
    name: stack.name,
    subtitle: loopStackSubtitle(stack),
    artworkUrl: stack.artworkUrl,
    previewUrl: stack.previewUrl,
    previewPath: stack.previewPath,
  };
}

export function toPlayablePreset(preset: Preset): PlayableAsset {
  return {
    id: preset.id,
    kind: "preset",
    name: preset.name,
    subtitle: presetSubtitle(preset),
    artworkUrl: preset.artworkUrl,
    previewUrl: preset.previewUrl,
    previewPath: preset.previewPath,
  };
}

// ---------------------------------------------------------------------------
// Search + filtering
// ---------------------------------------------------------------------------

/**
 * Collection names keyed by asset id, so search can match on collection
 * membership ("heavy bass" finds everything filed under Heavy Bass).
 */
export type CollectionMembership = Map<string, string[]>;

export function buildCollectionMembership(
  collections: LibraryCollection[],
): CollectionMembership {
  const membership: CollectionMembership = new Map();
  for (const collection of collections) {
    for (const item of collection.items) {
      const existing = membership.get(item.id);
      if (existing) existing.push(collection.name);
      else membership.set(item.id, [collection.name]);
    }
  }
  return membership;
}

function haystack(fields: Array<string | number | null | undefined>): string {
  return fields
    .filter((f) => f != null && f !== "")
    .join(" ")
    .toLowerCase();
}

export function loopStackMatches(
  stack: LoopStack,
  query: string,
  membership?: CollectionMembership,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack([
    stack.name,
    stack.key,
    stack.sourceProject,
    stack.bpm,
    ...(membership?.get(stack.id) ?? []),
  ]).includes(q);
}

export function presetMatches(
  preset: Preset,
  query: string,
  membership?: CollectionMembership,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack([
    preset.name,
    preset.plugin,
    preset.category,
    preset.sourceProject,
    ...(membership?.get(preset.id) ?? []),
  ]).includes(q);
}

export type LibrarySort = "recent" | "name";

export type LibraryFilters = {
  query: string;
  favoritesOnly: boolean;
  coreOnly: boolean;
  sort: LibrarySort;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  query: "",
  favoritesOnly: false,
  coreOnly: false,
  sort: "recent",
};

/**
 * Favorites float to the top within either sort, because a curated favorite is
 * almost always a better first candidate than a merely recent capture.
 */
function bySort<
  T extends { name: string; createdAt: string; favorite: boolean },
>(sort: LibrarySort) {
  return (a: T, b: T) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    if (sort === "name") return a.name.localeCompare(b.name);
    return b.createdAt.localeCompare(a.createdAt);
  };
}

export function filterLoopStacks(
  stacks: LoopStack[],
  filters: LibraryFilters,
  membership?: CollectionMembership,
): LoopStack[] {
  return stacks
    .filter((s) => (filters.favoritesOnly ? s.favorite : true))
    .filter((s) => loopStackMatches(s, filters.query, membership))
    .sort(bySort(filters.sort));
}

export function filterPresets(
  presets: Preset[],
  filters: LibraryFilters & { category?: PresetCategory | "All" },
  membership?: CollectionMembership,
): Preset[] {
  const category = filters.category ?? "All";
  return presets
    .filter((p) => (category === "All" ? true : p.category === category))
    .filter((p) => (filters.favoritesOnly ? p.favorite : true))
    .filter((p) => (filters.coreOnly ? p.core : true))
    .filter((p) => presetMatches(p, filters.query, membership))
    .sort(bySort(filters.sort));
}

/** Categories that actually have presets, for chips that never dead-end. */
export function usedPresetCategories(presets: Preset[]): PresetCategory[] {
  const used = new Set(presets.map((p) => p.category));
  return PRESET_CATEGORIES.filter((c) => used.has(c));
}

// ---------------------------------------------------------------------------
// Player queue
// ---------------------------------------------------------------------------

/**
 * Step through the visible result set.
 *
 * Assets with no preview are skipped rather than landing the player on
 * something it cannot play, and the ends clamp (returning null) so the
 * transport buttons can disable instead of silently wrapping around.
 */
export function advanceQueue(
  queue: PlayableAsset[],
  currentId: string | null,
  direction: "next" | "previous",
): PlayableAsset | null {
  const step = direction === "next" ? 1 : -1;
  const start = currentId ? queue.findIndex((a) => a.id === currentId) : -1;
  if (start === -1) {
    // Nothing playing (or it fell out of the set): take the first playable
    // item from whichever end we're heading in from.
    const ordered = direction === "next" ? queue : [...queue].reverse();
    return ordered.find((a) => Boolean(a.previewUrl)) ?? null;
  }
  for (let i = start + step; i >= 0 && i < queue.length; i += step) {
    if (queue[i].previewUrl) return queue[i];
  }
  return null;
}

export function hasPlayableNeighbour(
  queue: PlayableAsset[],
  currentId: string | null,
  direction: "next" | "previous",
): boolean {
  return advanceQueue(queue, currentId, direction) !== null;
}

/**
 * Fingerprint of everything the player reads off a queue, so a change to any
 * of it counts as a real change.
 *
 * Ids alone are not enough: editing an asset's preview leaves its id and
 * position untouched, and a queue compared by id would go on serving the
 * superseded URL and storage path. Signed URLs are re-minted on every page
 * load, so this does replace the queue after a refresh — which is correct,
 * since the old URLs have been superseded, and swapping the array doesn't
 * interrupt playback.
 *
 * The separators are control characters that cannot occur in an id, URL or
 * name, so distinct queues can never collide on the same signature.
 */
export function queueSignature(assets: PlayableAsset[]): string {
  return assets
    .map((a) =>
      [a.id, a.previewUrl ?? "", a.previewPath ?? "", a.name, a.subtitle].join(
        "\u0000",
      ),
    )
    .join("\u0001");
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export type ResolvedCollectionItem =
  | { itemId: string; type: "loopStack"; asset: LoopStack; position: number }
  | { itemId: string; type: "preset"; asset: Preset; position: number };

/**
 * Turn a collection's references into real assets, in stored order.
 *
 * References to deleted assets are dropped rather than rendered as holes. The
 * database cascades these away on delete, so this is belt-and-braces for a
 * page rendered from data fetched either side of a deletion.
 */
export function resolveCollectionItems(
  collection: Pick<LibraryCollection, "items">,
  loopStacks: LoopStack[],
  presets: Preset[],
): ResolvedCollectionItem[] {
  const stackById = new Map(loopStacks.map((s) => [s.id, s]));
  const presetById = new Map(presets.map((p) => [p.id, p]));

  return [...collection.items]
    .sort((a, b) => a.position - b.position)
    .flatMap<ResolvedCollectionItem>((ref) => {
      if (ref.type === "loopStack") {
        const asset = stackById.get(ref.id);
        return asset
          ? [
              {
                itemId: ref.itemId,
                type: "loopStack",
                asset,
                position: ref.position,
              },
            ]
          : [];
      }
      const asset = presetById.get(ref.id);
      return asset
        ? [
            {
              itemId: ref.itemId,
              type: "preset",
              asset,
              position: ref.position,
            },
          ]
        : [];
    });
}

/**
 * New positions after moving one item up or down by one slot.
 *
 * Returns the full list so the caller can persist every changed row, and
 * returns it unchanged when the move would run off either end.
 */
export function reorderPositions<T extends { itemId: string }>(
  items: T[],
  itemId: string,
  direction: "up" | "down",
): Array<{ itemId: string; position: number }> {
  const index = items.findIndex((i) => i.itemId === itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  const next = items.map((i, position) => ({ itemId: i.itemId, position }));
  if (index === -1 || target < 0 || target >= items.length) return next;

  next[index].position = target;
  next[target].position = index;
  return next.sort((a, b) => a.position - b.position);
}

/** Collections an asset currently belongs to. */
export function collectionsContaining(
  collections: LibraryCollection[],
  assetId: string,
): LibraryCollection[] {
  return collections.filter((c) => c.items.some((i) => i.id === assetId));
}
