"use client";

import * as React from "react";

/**
 * How much a template is worth to the producer, on a 1–5 scale they set
 * themselves. Templates have no Supabase table yet (`src/lib/data/templates.ts`
 * is a static catalogue), so the rating lives in localStorage: a per-device
 * judgement that still has to survive a refresh and the trip between the
 * templates list and `/templates/[id]`.
 */

export const TEMPLATE_VALUE_STORAGE_KEY = "finish-five:templates:values";

export const TEMPLATE_VALUE_MIN = 1;
export const TEMPLATE_VALUE_MAX = 5;

/** Scale-end wording shown under the picker. */
export const TEMPLATE_VALUE_LOW_LABEL = "Rarely useful";
export const TEMPLATE_VALUE_HIGH_LABEL = "Essential";

export type TemplateValues = Record<string, number>;

const EMPTY: TemplateValues = {};

function isValidValue(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= TEMPLATE_VALUE_MIN &&
    v <= TEMPLATE_VALUE_MAX
  );
}

/**
 * Read the stored map, dropping anything that is not a whole 1–5 — the JSON is
 * user-editable, so a bad entry must not render a template as "7/5".
 */
export function parseTemplateValues(raw: string | null): TemplateValues {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return EMPTY;
    }
    const out: TemplateValues = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidValue(value)) out[id] = value;
    }
    return out;
  } catch {
    return EMPTY;
  }
}

/**
 * Set (or, with `null`, clear) one template's value. Returns a new map rather
 * than mutating, so it can be diffed by identity.
 */
export function withTemplateValue(
  values: TemplateValues,
  id: string,
  value: number | null,
): TemplateValues {
  const next = { ...values };
  if (value === null || !isValidValue(value)) {
    delete next[id];
  } else {
    next[id] = value;
  }
  return next;
}

/**
 * Order for the "Highest Value" sort: rated templates first, descending, with
 * unrated ones after them. Ties fall back to name so the list stays stable.
 */
export function compareTemplateValue(
  a: number | undefined,
  b: number | undefined,
): number {
  return (b ?? 0) - (a ?? 0);
}

// localStorage is an external store, so it is read through
// useSyncExternalStore rather than mirrored into state in an effect. The
// snapshot is the raw string: a stable primitive React can compare, unlike a
// freshly parsed object. `subscribe` covers both this tab (every mounted
// picker re-reads when one of them changes) and other tabs (`storage`).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(TEMPLATE_VALUE_STORAGE_KEY);
  } catch {
    // Private mode or storage disabled — a rating is a convenience, never a
    // reason to break the page.
    return null;
  }
}

// On the server (and for the hydrating render) nothing is rated, so the markup
// matches what the client produces before localStorage is readable.
function getServerSnapshot(): string | null {
  return null;
}

function write(values: TemplateValues) {
  try {
    window.localStorage.setItem(
      TEMPLATE_VALUE_STORAGE_KEY,
      JSON.stringify(values),
    );
  } catch {
    /* ignore — see getSnapshot */
  }
  listeners.forEach((notify) => notify());
}

/**
 * The stored values plus a setter. Both the templates list and the template
 * detail page use this, so rating from one surface shows up on the other.
 */
export function useTemplateValues(): {
  values: TemplateValues;
  setValue: (id: string, value: number | null) => void;
} {
  const raw = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const values = React.useMemo(() => parseTemplateValues(raw), [raw]);

  const setValue = React.useCallback((id: string, value: number | null) => {
    // Re-read rather than closing over `values`: another row may have written
    // since this callback was created.
    write(withTemplateValue(parseTemplateValues(getSnapshot()), id, value));
  }, []);

  return { values, setValue };
}
