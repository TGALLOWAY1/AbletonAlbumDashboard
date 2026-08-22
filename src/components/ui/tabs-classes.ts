/**
 * Tab strip class names, kept out of `tabs.tsx` because that file is a
 * `"use client"` module: a server component importing these from there gets
 * client-reference proxies instead of the strings, and renders unstyled.
 *
 * Shared so a server-rendered strip built from links (see `ProgressPanel`)
 * matches the Radix tabs without copying the class strings.
 */

export const TABS_LIST_CLASS =
  "inline-flex items-center justify-center gap-1 rounded-md bg-surface p-1 text-muted-foreground border border-border";

export const TABS_TRIGGER_CLASS =
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all";

/** The part `data-[state=active]` applies, for a strip that has no Radix state. */
export const TABS_TRIGGER_ACTIVE_CLASS = "bg-surface-2 text-foreground shadow-sm";
