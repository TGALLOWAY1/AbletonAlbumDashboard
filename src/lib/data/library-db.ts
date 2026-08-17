import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  LIBRARY_PREVIEW_BUCKET,
  PREVIEW_SIGNED_URL_TTL_SECONDS,
} from "@/lib/library-storage";
import {
  resolveCollectionItems,
  toPresetCategory,
  type CollectionItemRef,
  type LibraryCollection,
  type LoopStack,
  type LoopStackComponent,
  type Preset,
  type ResolvedCollectionItem,
} from "@/lib/data/library";

type ServerSupabase = ReturnType<typeof getServerSupabase>;

export type LibrarySnapshot = {
  loopStacks: LoopStack[];
  presets: Preset[];
  collections: LibraryCollection[];
};

export type CollectionDetail = {
  collection: LibraryCollection;
  items: ResolvedCollectionItem[];
  /** Every asset in the library, for the "add existing" picker. */
  allLoopStacks: LoopStack[];
  allPresets: Preset[];
};

/** `null` and `''` both mean "not set" in the UI; collapse them to undefined. */
function opt(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function num(value: number | null | undefined): number | undefined {
  return value == null ? undefined : Number(value);
}

function toComponents(value: unknown): LoopStackComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : null;
    if (!name) return [];
    return [
      { kind: typeof record.kind === "string" ? record.kind : "track", name },
    ];
  });
}

/**
 * Sign every preview in one round trip.
 *
 * `createSignedUrls` takes the whole batch, so a page showing thirty cards
 * costs one request rather than thirty. Individual failures come back with an
 * `error` on the entry, which we simply drop — an asset without a usable URL
 * renders as "no preview" instead of a broken control.
 */
async function signPreviews(
  supabase: ServerSupabase,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(LIBRARY_PREVIEW_BUCKET)
    .createSignedUrls(unique, PREVIEW_SIGNED_URL_TTL_SECONDS);
  if (error) {
    // A signing outage should not blank the whole Library — the cards still
    // render, they just cannot be auditioned until it recovers.
    console.error("[library] preview signing failed", error);
    return new Map();
  }

  const signed = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) signed.set(entry.path, entry.signedUrl);
  }
  return signed;
}

type LoopStackRow = {
  id: string;
  name: string;
  preview_path: string | null;
  artwork_url: string | null;
  music_key: string | null;
  bpm: number | null;
  bars: number | null;
  source_project: string | null;
  source_path: string | null;
  favorite: boolean;
  notes: string;
  components: unknown;
  created_at: string;
  updated_at: string;
};

type PresetRow = {
  id: string;
  name: string;
  plugin: string | null;
  category: string;
  preview_path: string | null;
  artwork_url: string | null;
  preset_path: string | null;
  source_project: string | null;
  favorite: boolean;
  core: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
};

function rowToLoopStack(
  row: LoopStackRow,
  signed: Map<string, string>,
): LoopStack {
  return {
    id: row.id,
    name: row.name,
    previewPath: opt(row.preview_path),
    previewUrl: row.preview_path ? signed.get(row.preview_path) : undefined,
    artworkUrl: opt(row.artwork_url),
    key: opt(row.music_key),
    bpm: num(row.bpm),
    bars: num(row.bars),
    sourceProject: opt(row.source_project),
    sourcePath: opt(row.source_path),
    favorite: row.favorite,
    notes: row.notes ?? "",
    components: toComponents(row.components),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPreset(row: PresetRow, signed: Map<string, string>): Preset {
  return {
    id: row.id,
    name: row.name,
    plugin: opt(row.plugin),
    category: toPresetCategory(row.category),
    previewPath: opt(row.preview_path),
    previewUrl: row.preview_path ? signed.get(row.preview_path) : undefined,
    artworkUrl: opt(row.artwork_url),
    presetPath: opt(row.preset_path),
    sourceProject: opt(row.source_project),
    favorite: row.favorite,
    core: row.core,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Everything the Library landing page renders, in one pass.
 *
 * Unlike the old `fetchLibraryItems`, these throw on error rather than
 * returning `[]` — a broken query should surface in `/library/error.tsx`, not
 * masquerade as an empty library.
 */
export async function fetchLibrarySnapshot(): Promise<LibrarySnapshot> {
  const supabase = getServerSupabase();

  const [stacksResult, presetsResult, collectionsResult, itemsResult] =
    await Promise.all([
      supabase
        .from("library_loop_stacks")
        .select("*")
        .eq("owner_id", OWNER_ID)
        .order("created_at", { ascending: false }),
      supabase
        .from("library_presets")
        .select("*")
        .eq("owner_id", OWNER_ID)
        .order("created_at", { ascending: false }),
      supabase
        .from("library_collections")
        .select("*")
        .eq("owner_id", OWNER_ID)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("library_collection_items")
        .select("id, collection_id, loop_stack_id, preset_id, position")
        .order("position", { ascending: true }),
    ]);

  for (const result of [
    stacksResult,
    presetsResult,
    collectionsResult,
    itemsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const stackRows = (stacksResult.data ?? []) as LoopStackRow[];
  const presetRows = (presetsResult.data ?? []) as PresetRow[];

  const signed = await signPreviews(supabase, [
    ...stackRows.map((r) => r.preview_path ?? ""),
    ...presetRows.map((r) => r.preview_path ?? ""),
  ]);

  // Membership rows are fetched unscoped (the table has no owner_id) and then
  // grouped by collection; only collections this owner owns are kept.
  const itemsByCollection = new Map<string, CollectionItemRef[]>();
  for (const row of itemsResult.data ?? []) {
    const ref: CollectionItemRef = row.loop_stack_id
      ? {
          itemId: row.id,
          type: "loopStack",
          id: row.loop_stack_id,
          position: row.position,
        }
      : {
          itemId: row.id,
          type: "preset",
          id: row.preset_id as string,
          position: row.position,
        };
    const existing = itemsByCollection.get(row.collection_id);
    if (existing) existing.push(ref);
    else itemsByCollection.set(row.collection_id, [ref]);
  }

  return {
    loopStacks: stackRows.map((row) => rowToLoopStack(row, signed)),
    presets: presetRows.map((row) => rowToPreset(row, signed)),
    collections: (collectionsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: opt(row.description),
      artworkUrl: opt(row.artwork_url),
      items: (itemsByCollection.get(row.id) ?? []).sort(
        (a, b) => a.position - b.position,
      ),
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

/**
 * One collection plus its resolved contents. Reuses the snapshot so the
 * "add existing assets" picker has the full library without a second trip.
 */
export async function fetchCollectionDetail(
  id: string,
): Promise<CollectionDetail | null> {
  const snapshot = await fetchLibrarySnapshot();
  const collection = snapshot.collections.find((c) => c.id === id);
  if (!collection) return null;

  return {
    collection,
    items: resolveCollectionItems(
      collection,
      snapshot.loopStacks,
      snapshot.presets,
    ),
    allLoopStacks: snapshot.loopStacks,
    allPresets: snapshot.presets,
  };
}
