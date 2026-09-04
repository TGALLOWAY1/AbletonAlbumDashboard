/**
 * Resource tags: the instrument/role axis that cuts across resource
 * categories. A category answers "what shelf is this on"; a tag answers "what
 * is it about" — bass, drums, pads, FX — which is how you actually go looking
 * for a sound-design article.
 *
 * Everything here is pure and free of React/Supabase so the storage format,
 * the filter, the grouping and the display casing can be tested directly and
 * cannot drift between the dialog that writes tags and the galleries that read
 * them. Storage form is always the normalised one: trimmed, lowercased,
 * single-spaced, deduped, length-capped. Display casing happens at render via
 * `formatTag` — never store what `formatTag` returns.
 */

/** Longest tag we keep. Long enough for "granular synthesis", short enough to fit a chip. */
export const MAX_TAG_LENGTH = 24;

/** Ceiling on tags per resource — a chip row, not a folksonomy. */
export const MAX_TAGS_PER_RESOURCE = 12;

/** Heading for items carrying no tags at all, always the last group. */
export const UNTAGGED_GROUP_LABEL = "Untagged";

/**
 * The offered vocabulary, seeded from the library's own preset categories
 * (PRESET_CATEGORIES in src/lib/data/library.ts: bass, chords, keys, lead,
 * pad, drums, texture, fx) so a resource about pads and a preset filed under
 * Pads answer to the same word, plus vocals and a few sound-design verbs.
 *
 * This is a *suggestion* list, not a constraint: the database has no check on
 * tag values (migration 0032) and a typed-in word is as valid as one of these.
 * The order is meaningful — it is the order tag groups appear in the grouped
 * gallery, so the instrument words lead and the technique words follow.
 */
export const RESOURCE_TAG_SUGGESTIONS = [
  "bass",
  "drums",
  "keys",
  "chords",
  "lead",
  "pad",
  "texture",
  "fx",
  "vocals",
  "sampling",
  "synthesis",
  "modulation",
] as const;

export type ResourceTagSuggestion = (typeof RESOURCE_TAG_SUGGESTIONS)[number];

const SUGGESTION_RANK = new Map<string, number>(
  RESOURCE_TAG_SUGGESTIONS.map((tag, index) => [tag, index]),
);

/** Acronyms that look wrong title-cased ("Fx", "Eq"). */
const ACRONYM_TAGS = new Set(["fx", "eq", "midi", "lfo", "daw", "dj"]);

/**
 * One tag in storage form, or null if there is nothing left of it. Internal
 * whitespace is collapsed so "sound  design" and "sound design" are one tag.
 */
export function normalizeTag(raw: string): string | null {
  const cleaned = raw
    .replace(/[\s,]+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH)
    // A slice can leave a trailing space behind; don't store it.
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * A list of tags in storage form: normalised, empties dropped, first
 * occurrence wins on a duplicate, capped at MAX_TAGS_PER_RESOURCE. Input order
 * is preserved — the user's own order is the one they see back.
 */
export function normalizeTags(
  raw: readonly (string | null | undefined)[] | null | undefined,
): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const tag = normalizeTag(value);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS_PER_RESOURCE) break;
  }
  return out;
}

/** Split one free-text field ("bass, drums pad") into tags. */
export function parseTagInput(value: string): string[] {
  return normalizeTags(value.split(","));
}

/** Display form: "fx" -> "FX", "sound design" -> "Sound Design". */
export function formatTag(tag: string): string {
  const normalized = normalizeTag(tag);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((word) =>
      ACRONYM_TAGS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** Anything carrying tags — resources today, and the gallery rows built from them. */
export type Taggable = { tags: string[] };

/**
 * AND semantics: an item is kept only if it carries *every* selected tag.
 * Chips narrow, they don't widen — picking "bass" then "fx" asks for material
 * about both, which is the only reading that makes a second tap useful.
 */
export function filterResourcesByTags<T extends Taggable>(
  items: readonly T[],
  tags: readonly string[],
): T[] {
  const wanted = normalizeTags(tags);
  if (wanted.length === 0) return [...items];
  return items.filter((item) => {
    const own = new Set(normalizeTags(item.tags));
    return wanted.every((tag) => own.has(tag));
  });
}

export type ResourceTagGroup<T> = {
  /** The tag in storage form, or null for the untagged group. */
  tag: string | null;
  /** Ready to print as a section heading. */
  label: string;
  items: T[];
};

/**
 * One group per tag, suggestion order first (so Bass/Drums/Keys lead), then
 * everything else alphabetically, with untagged items last. An item with two
 * tags appears in *both* groups on purpose: this is a way of browsing, not a
 * partition, and hiding a pad-and-texture article from one of them would make
 * the tag row lie about what it contains.
 */
export function groupResourcesByTag<T extends Taggable>(
  items: readonly T[],
): ResourceTagGroup<T>[] {
  const byTag = new Map<string, T[]>();
  const untagged: T[] = [];

  for (const item of items) {
    const tags = normalizeTags(item.tags);
    if (tags.length === 0) {
      untagged.push(item);
      continue;
    }
    for (const tag of tags) {
      const bucket = byTag.get(tag);
      if (bucket) bucket.push(item);
      else byTag.set(tag, [item]);
    }
  }

  const groups: ResourceTagGroup<T>[] = [...byTag.keys()]
    .sort(compareTags)
    .map((tag) => ({ tag, label: formatTag(tag), items: byTag.get(tag)! }));

  if (untagged.length > 0) {
    groups.push({ tag: null, label: UNTAGGED_GROUP_LABEL, items: untagged });
  }
  return groups;
}

/** Suggested vocabulary first, in its own order; everything else A-Z. */
export function compareTags(a: string, b: string): number {
  const rankA = SUGGESTION_RANK.get(a);
  const rankB = SUGGESTION_RANK.get(b);
  if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
  if (rankA !== undefined) return -1;
  if (rankB !== undefined) return 1;
  return a.localeCompare(b);
}

/**
 * How many items carry each tag, in the same order the groups appear. Drives
 * the filter chip row, which only offers tags something is actually filed
 * under.
 */
export function countResourceTags(
  items: readonly Taggable[],
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of normalizeTags(item.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([a], [b]) => compareTags(a, b))
    .map(([tag, count]) => ({ tag, count }));
}

/** Add a tag if absent, remove it if present — one chip tap. */
export function toggleTag(tags: readonly string[], tag: string): string[] {
  const normalized = normalizeTag(tag);
  if (!normalized) return normalizeTags(tags);
  const current = normalizeTags(tags);
  return current.includes(normalized)
    ? current.filter((t) => t !== normalized)
    : normalizeTags([...current, normalized]);
}

/**
 * Read the selection out of a URL: `?tag=bass&tag=fx`. Repeated params rather
 * than one comma-joined value so the selection is a plain, hand-editable,
 * linkable URL.
 */
export function parseTagParam(
  value: string | string[] | undefined,
): string[] {
  if (value === undefined) return [];
  return normalizeTags(Array.isArray(value) ? value : [value]);
}

/** The query fragment for a tag selection — "" when nothing is selected. */
export function serializeTagParam(tags: readonly string[]): string {
  const usp = new URLSearchParams();
  for (const tag of normalizeTags(tags)) usp.append("tag", tag);
  return usp.toString();
}
