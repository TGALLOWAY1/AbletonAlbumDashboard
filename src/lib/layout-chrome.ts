/**
 * Positioning contract for the app's persistent chrome (sidebar, mobile
 * header, mobile bottom nav, library mini-player).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * "The nav bar moves when I scroll" has been reported and re-fixed several
 * times. Every recurrence had the same root cause: a piece of chrome was
 * pinned with `position: sticky` instead of `position: fixed`.
 *
 * `sticky` looks identical to `fixed` in the happy path, then silently starts
 * scrolling with the page when *any* of these change:
 *
 *   - an ancestor gains `overflow` (hidden / auto / clip) — sticky then pins
 *     to that element's scrollport instead of the viewport;
 *   - the sticky element's parent stops being taller than it (parent height,
 *     flex direction, or `min-h-screen` edits all do this);
 *   - the page overflows horizontally — `sticky top-0` pins vertically only,
 *     so the element slides sideways out of view on horizontal scroll.
 *
 * None of those are visible in the diff that causes them, which is why the bug
 * kept coming back. `fixed` is anchored to the viewport and is immune to all
 * three. So: **every piece of persistent chrome is `fixed`, never `sticky`.**
 *
 * The one thing `fixed` does need is that the chrome sits outside normal flow,
 * so the scrolling column has to reserve the space itself — that is what
 * `contentColumn` and `mainPadding` below are for. Those offsets must stay in
 * step with the chrome's own dimensions; `layout-chrome.test.ts` asserts they
 * do, in rem, so a resize on one side can't silently uncover the other.
 *
 * Changing anything here means reading that test first.
 */

/** Chrome dimensions, in rem, that offsets elsewhere in the app depend on. */
export const SIDEBAR_WIDTH_REM = 16; // w-64  — desktop sidebar
export const MOBILE_HEADER_HEIGHT_REM = 3; // h-12  — mobile top bar
export const MOBILE_NAV_HEIGHT_REM = 3.75; // rendered height of the bottom nav row

/**
 * The class strings that pin each piece of chrome, plus the offsets the
 * scrolling content uses to stay clear of them. Components spread these rather
 * than hand-rolling positioning, so there is exactly one place to audit.
 */
export const APP_CHROME = {
  /** Desktop sidebar: pinned to the full left edge of the viewport. */
  sidebar: "fixed inset-y-0 left-0 z-30 w-64",
  /** Mobile top bar: pinned across the top of the viewport. */
  mobileHeader: "fixed inset-x-0 top-0 z-30 h-12",
  /** Mobile bottom tab bar: pinned across the bottom of the viewport. */
  mobileBottomNav: "fixed inset-x-0 bottom-0 z-40",
  /**
   * Library preview player: pinned across the bottom, lifted above the mobile
   * bottom nav, and inset past the sidebar on desktop (where the nav is gone).
   */
  libraryMiniPlayer:
    "fixed inset-x-0 z-40 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] md:bottom-0 md:left-64",
  /**
   * The scrolling column beside the fixed sidebar. `md:pl-64` reserves the
   * sidebar's width now that it no longer takes up space in flow.
   */
  contentColumn: "min-h-screen md:pl-64",
  /**
   * Padding on `<main>`. `pt-16` clears the fixed mobile header (h-12) with a
   * 1rem gap; `pb-24` clears the fixed bottom nav. Desktop has neither, so the
   * `md:` values drop back to the normal page gutter.
   */
  mainPadding: "px-4 pb-24 pt-16 md:px-8 md:pb-7 md:pt-7",
} as const;

/**
 * Files that render persistent chrome. The regression test scans these for
 * `sticky`, which is banned here for the reasons at the top of this file.
 */
export const CHROME_SOURCE_FILES = [
  "src/app/layout.tsx",
  "src/components/sidebar.tsx",
  "src/components/mobile/mobile-header.tsx",
  "src/components/mobile/bottom-nav.tsx",
  "src/components/library/library-mini-player.tsx",
] as const;
