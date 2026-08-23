# Finish Five — Repo Notes for Claude

An album-in-progress dashboard for tracks built in Ableton. Helps the user see where each song stands, run focused sessions, and finish songs.

## Stack

- Next.js 16.2 (app router) + React 19
- Tailwind CSS 4 + shadcn/ui (Radix primitives under the hood)
- Supabase (`@supabase/ssr`) for data + auth
- TypeScript 5, Zod for validation
- Package manager: `pnpm`

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint (Next.js config)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — vitest (unit tests in `src/**/__tests__/`)

Run `pnpm typecheck && pnpm lint && pnpm test` before committing.

## Layout

- Desktop track detail → `src/app/tracks/[id]/page.tsx`
- Mobile track detail → `src/app/m/[trackId]/page.tsx`
- Both track surfaces are the same **three-surface workspace**: Tasks, Notes and the
  track log. Desktop shows all three side by side in one non-scrolling viewport
  (each pane scrolls itself); mobile shows one at a time behind tabs whose state
  lives in the URL (`src/lib/track-pane.ts`). Identity, the `.als` path, the five
  production stages and Start-focus-session all ride in the shared header bar
  (`src/components/track/track-header-bar.tsx`) because they are status, not work.
- There is no "bottleneck" and no "next action". The next thing to do on a track is
  **the top of its open task list** — an ordering, not a stored flag. `nextTask` on
  `TrackWithDetails` is derived in `attachDetails`, and the focus session seeds its
  goal from the same row, so the two can never disagree. Migration 0024 dropped the
  `bottlenecks` table and `actions.is_primary`.
- That ordering is **hand-set**: tasks carry a nullable `actions.sort_order`
  (migration 0025) and reads sort by it with NULLs last, then `created_at`. So an
  untouched track keeps creation order and a new task lands at the bottom, both
  without a backfill. Drag the handle in `TrackTodoList` (Pointer Events, so mouse
  and touch share one path; the handle is also focusable and moves with
  arrow keys) and `reorderTrackTodos` writes an explicit 0..n-1. The list-shaped
  move helpers live in `src/lib/task-order.ts` so the drag and keyboard paths
  cannot drift.
- Bounces, logged sessions and completed tasks are one timeline
  (`src/components/track/track-log-pane.tsx`) — they all answer "what happened to
  this track", so they are not three sections.
- Dashboard root (`src/app/page.tsx`) is a single responsive surface using Tailwind `md:` breakpoints — no user-agent sniffing, no separate desktop/mobile route for the home page.
- The dashboard is also the progress surface: it ends with a Progress section (`src/components/home/progress-panel.tsx`, anchor `#progress`) carrying the work heatmap, range stats and the session-history log. There is no `/analytics` or `/sessions` page — both routes redirect to `/#progress`.
- Library (`src/app/library/**`) is likewise a single responsive surface — the feature parity rule below is track-level and does not imply an `/m/library` route. `src/app/library/layout.tsx` mounts the preview player so playback survives navigation between Library routes without leaking an audio element onto every other page.
- Server actions live under `src/app/actions/`.
- Data fetchers live under `src/lib/data/`.

## Feature parity rule (desktop ↔ mobile)

**Any track-level user-facing feature on `/tracks/[id]` must also work on `/m/[trackId]`, and vice versa.** Add it to both pages in the same PR.

Exceptions: features that are genuinely platform-specific — e.g. Ableton `.als` file-path copy (desktop-only by nature), camera capture (mobile-only). Document the exception in the PR description.

Reviewers should reject single-platform additions that have no platform-specific justification.

### How to share components between the two surfaces

Prefer **one component with a `variant` prop** over forking files. Existing examples:

- `TrackTodoList.variant: "desktop" | "mobile"` — `src/components/mobile/track-todo-list.tsx`
- `TrackHeaderBar.variant: "desktop" | "mobile"` — `src/components/track/track-header-bar.tsx`
- `TrackStageStrip.variant: "desktop" | "mobile"` — `src/components/track/track-stage-strip.tsx`
- `TrackLogPane.variant: "desktop" | "mobile"` — `src/components/track/track-log-pane.tsx`

Variant prop controls sizing (tap targets vs. compact desktop), not behavior. Server actions, optimistic reducers, and data shapes stay shared.

The `src/components/mobile/` directory currently holds components used on **both** platforms (legacy from when they were mobile-only). New shared components should land directly in `src/components/`; renaming the existing directory is a tracked follow-up, not blocking work.

### Known parity gaps (snapshot — file follow-ups under the rule above)

None currently. Both `/tracks/[id]` and `/m/[trackId]` mount the same
`TrackHeaderBar`, `TrackTodoList`, `NotesEditor` and `TrackLogPane` (including
bounce upload and the Suno round-trip), and link to the shared metadata editor at
`/tracks/[id]/edit`. The only difference is arrangement — three columns vs. three
tabs — which is a viewport constraint, not a feature gap. The `.als` file-path copy
renders in the desktop header only; it is meaningless on a phone (documented
exception).

## Conventions

- Server components are the default; mark client components with `"use client"` only when they need state, refs, or browser APIs.
- Server actions that mutate track-level data must call `revalidateTrackSurfaces(trackId)` from `src/lib/revalidate-track.ts`, which revalidates **both** route shapes plus the dashboard/focus/session surfaces. Do not hand-roll `revalidatePath` lists.
- User-facing errors in client components go through `useToast()` (`src/components/toast.tsx`, provider mounted in the root layout) — never `window.alert()`.
- Optimistic UI uses React 19's `useOptimistic` (see `TrackTodoList`).
- Persistent chrome (sidebar, mobile header, mobile bottom nav, library
  mini-player) is pinned with `position: fixed`, **never** `sticky`, and its
  positioning classes live in `src/lib/layout-chrome.ts` (`APP_CHROME`).
  `sticky` keeps regressing into "the nav bar moves when I scroll" — an
  ancestor gaining `overflow`, a parent that stops being taller than the bar,
  or horizontal page overflow all unpin it silently. Because fixed chrome is
  out of flow, the scrolling column reserves its space via
  `APP_CHROME.contentColumn` / `.mainPadding`; `layout-chrome.test.ts` asserts
  those offsets still match the chrome's dimensions.
- Styling: Tailwind utility classes, no CSS modules. Use `cn()` / `tailwind-merge` for conditional classes.
- The track library (`/tracks`) keeps its gallery/list + large/medium/small
  view preference in the URL (`src/lib/view-mode.ts`), so the page stays a server
  component and the choice is linkable. Controls that own their own query params
  take a `preserveQuery` prop and merge with `mergeQuery()` rather than
  overwriting the whole query string.
- `/tracks` is also the album shelf: it groups the library by album
  (`src/lib/track-grouping.ts`), listing empty albums too when no filter is
  applied, so every record has an entry point. There is no `/albums` index —
  that route redirects here; `/albums/[id]` is still where an album is edited,
  and it highlights the Tracks nav item (`EXTRA_SECTION_PREFIXES` in
  `src/components/nav-items.ts`).
