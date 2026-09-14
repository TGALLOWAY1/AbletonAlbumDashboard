"use client";

import { useSyncExternalStore } from "react";

// Nothing to subscribe to: whether we are in the browser is decided once, at
// hydration, and never changes again.
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False during the server render and the hydration pass, true from the paint
 * after it.
 *
 * For values only the browser can know — above all the reader's timezone, and
 * therefore which calendar day "today" is. A client component is still
 * server-rendered first, and on Vercel that render's calendar is UTC, so
 * reading the clock during it hands anyone east or west of Greenwich different
 * output than hydration produces and React discards the tree.
 *
 * `useSyncExternalStore` rather than a `useState`/`useEffect` mount flag
 * because that is the hook built for a value with two snapshots — and because
 * setting state synchronously in an effect is what the React Compiler's
 * `set-state-in-effect` rule (enabled here) exists to stop.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
