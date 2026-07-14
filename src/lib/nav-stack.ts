/**
 * In-app navigation stack backed by sessionStorage.
 *
 * `NavigationTracker` (mounted once in the root layout) pushes every pathname
 * the user visits; `BackLink` consults the stack to decide between a real
 * `router.back()` (preserves where the user actually came from — e.g.
 * album → track → back lands on the album) and a hardcoded fallback push
 * (deep links, fresh tabs).
 *
 * Everything here is pure except `readNavStack`/`writeNavStack`, which wrap
 * sessionStorage access in try/catch so private-browsing modes and SSR
 * degrade to "no history" (BackLink then uses its fallback).
 */

export const NAV_STACK_KEY = "ff-nav-stack";

/** Oldest entries are dropped beyond this size. */
export const NAV_STACK_MAX = 20;

/**
 * Returns a new stack with `path` appended. Consecutive duplicates are
 * skipped (re-renders, refreshes) and the stack is capped at
 * `NAV_STACK_MAX` by dropping the oldest entries.
 */
export function pushPath(stack: string[], path: string): string[] {
  if (stack.length > 0 && stack[stack.length - 1] === path) return stack;
  const next = [...stack, path];
  return next.length > NAV_STACK_MAX ? next.slice(next.length - NAV_STACK_MAX) : next;
}

/** True when there is somewhere in-app to go back to. */
export function hasInAppHistory(stack: string[]): boolean {
  return stack.length > 1;
}

/**
 * The path a back navigation from `currentPath` would land on, or null.
 *
 * The tracker pushes the *current* page onto the stack too, so when the top
 * of the stack equals `currentPath` the previous entry is one below the top.
 * If the top differs (tracker effect hasn't run yet), the top itself is the
 * previous page.
 */
export function previousPath(stack: string[], currentPath: string): string | null {
  if (stack.length === 0) return null;
  const top = stack[stack.length - 1];
  if (top !== currentPath) return top;
  return stack.length > 1 ? stack[stack.length - 2] : null;
}

/**
 * Returns the stack with the trailing `currentPath` removed, ready to be
 * persisted before calling `router.back()` (otherwise the tracker would
 * re-push the destination on top of a stale copy of the current page).
 * No-op when the top isn't `currentPath`.
 */
export function popCurrent(stack: string[], currentPath: string): string[] {
  if (stack.length > 0 && stack[stack.length - 1] === currentPath) {
    return stack.slice(0, -1);
  }
  return stack;
}

/** Safe JSON parse: anything malformed or non-string-array → []. */
export function parseStack(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function serializeStack(stack: string[]): string {
  return JSON.stringify(stack);
}

/** Read the stack from sessionStorage; [] when unavailable (SSR, private browsing). */
export function readNavStack(): string[] {
  try {
    return parseStack(window.sessionStorage.getItem(NAV_STACK_KEY));
  } catch {
    return [];
  }
}

/** Persist the stack; silently a no-op when sessionStorage is unavailable. */
export function writeNavStack(stack: string[]): void {
  try {
    window.sessionStorage.setItem(NAV_STACK_KEY, serializeStack(stack));
  } catch {
    // Private browsing / quota / SSR — BackLink degrades to its fallback.
  }
}
