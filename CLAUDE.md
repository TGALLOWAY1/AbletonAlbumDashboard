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
- **What the dashboard shows is the pinned shortlist** — up to `MAX_PINNED_TRACKS`
  (5) tracks carrying `tracks.pinned_at` + `pin_order` (migration 0027), in an
  order you drag. It is deliberately *not* derived from album membership or
  `status`: it used to be the intersection of "in the active album" and
  "status = active" under a hard cap, so changing your mind meant archiving a
  song. The cap now lives on the pin (`setTrackPinned`, the only writer — it is
  not a database constraint, see 0027) and finishing or archiving a track
  unpins it automatically in `setTrackStatus`. `status` means only where a
  track is in its life; nothing caps how many are active. Migration 0027 also
  dropped the never-wired one-track `is_focus` flag from 0012.
- Pinned rows are **collapsed by default** (`src/components/home/pinned-tracks.tsx`).
  The expanded body is the existing `TrackCard`, rendered on the server and
  passed down as a `ReactNode` — that is what keeps the drag/collapse wrapper a
  client component without pulling the whole card into the browser bundle.
  Pinning is reachable from three places: the dashboard row, the pin picker
  underneath it, and `PinTrackButton` in the shared `TrackHeaderBar` (so both
  track surfaces get it — parity rule below).
- There is no active-album card on the dashboard. `albums.is_active` still
  exists and still means "the album a new track defaults into"
  (`resolveAlbumId`, `/tracks/new`, settings) — it just no longer decides what
  the home page shows. Album-less tracks are not called out here either; the
  `/tracks` shelf already files them under `BACKLOG_GROUP_LABEL`.
- **Tasks do not have to belong to a track.** `actions.track_id` is nullable
  (migration 0028); a row with no track and an `owner_id` is a studio task
  ("back up the drive", "sort the sample folder") and renders in
  `src/components/home/studio-tasks.tsx`. It is the *same* `TrackTodoList` and
  the *same* server actions in `src/app/actions/track-todos.ts`, which all take
  `trackId: string | null` — never fork the list. Note `scopeToList` there:
  narrow a studio-task query with `.is("track_id", null)`, never
  `.eq("track_id", null)`, which PostgREST renders as `track_id=eq.null` and
  matches nothing.
- The dashboard is also the progress surface: it ends with a Progress section
  (`src/components/home/progress-panel.tsx`, anchor `#progress`) carrying the
  work heatmap and every figure measured over it. There is no `/analytics` or
  `/sessions` page — both routes redirect to `/#progress`.
- **One range control, one window.** The 7D/30D/3M/6M/1Y tabs govern the
  heatmap *and* the time, session count, tasks-done and streak figures printed
  under it — all read off a single `getRangeStats()` (`src/lib/analytics.ts`).
  Do not reintroduce a fixed-window stat row: the page used to carry "this
  week" tiles above a heatmap defaulting to three months, and the two halves
  routinely disagreed about what "now" meant. `getWeeklyDelta` is gone for the
  same reason. Tasks-done needs completion timestamps, so `fetchAnalyticsData`
  ships `taskCompletions` alongside sessions and the client filters by range.
- **A heatmap cell's size never depends on the range.** It used to: week
  columns were `flex-1` turned square by `aspect-square`, so the fewer columns
  a range had the bigger its squares got — 504px at 7D on a 1080px card, 1.8px
  at 1Y on a phone — and the 24px weekday gutter lined up with those rows at
  no range at all. Geometry now lives in `--cell`/`--gap`
  (`src/components/analytics/work-heatmap.tsx`). Trail cells are exactly
  `--cell` and anything wider than the card scrolls; calendar cells are a
  seventh of the container under a 30rem cap, so they track the viewport
  between ~35px and 63px but are identical for 7D and 30D. Do not "fix" the
  calendar to a hard pixel width — a month grid that refuses a phone's width
  is a worse calendar. The grid itself is a pure model in `src/lib/heatmap.ts`,
  and month labels carry a **week column index** rather than a width share, so
  a label cannot drift off the column it names.
- Short and long windows are drawn differently on purpose (`heatmapMode`):
  7D/30D as a `calendar` — seven weekday columns, the date printed in every
  square, the month named in place on its 1st — and 3M/6M/1Y as the compact
  `trail`. A date cannot be read off a 14px square, and a `title` tooltip never
  fires on touch, so the trail names the hovered or tapped day in a readout
  line instead.
- Time gets recorded two ways and both are in the dashboard header: "Start
  session" (`/focus/new`, the timer) and `ManualSessionEntry` (backfill).
  Logging used to sit at the bottom of the page behind the Progress → History
  tab, which is the wrong place for the one control that keeps every number on
  the page true.
- Library (`src/app/library/**`) is likewise a single responsive surface — the feature parity rule below is track-level and does not imply an `/m/library` route. `src/app/library/layout.tsx` mounts the preview player so playback survives navigation between Library routes without leaking an audio element onto every other page.
- Resources (`src/app/resources/**`) is one system at three scopes: `/resources`
  is the "All" gallery, `/resources/[categoryId]` is a category, and
  `/resources/[categoryId]/[resourceId]` is a single topic. All three share the
  same parts — `ResourceCategoryNav` (the horizontal tab row; `null` means All),
  `ResourceTopicGallery` + `ResourceTopicCard` (the numbered, thumbnail-first
  cards) and `AddResourceDialog`. There is no separate category-directory page:
  the nav *is* the directory. Numbering is positional, off "recommended order"
  (oldest first), not a stored field.
- `AddResourceDialog` renders its own trigger button on purpose. Category pages
  are server components, and an element passed into Radix's `asChild` Slot from
  one hydrates without the props the Slot injects on the client. Pass
  `categoryId`/`categoryTitle` to it and the new resource inherits that category
  (read-only label instead of a picker); omit them on `/resources`, where there
  is no category context, and the user picks one.
- Server actions that mutate a resource call `revalidateResourceSurfaces` from
  `src/lib/revalidate-resources.ts` — the sibling of `revalidateTrackSurfaces`.
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
- `PinTrackButton.variant: "desktop" | "mobile"` — `src/components/track/pin-track-button.tsx`

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

## Migrations

- SQL lives in `supabase/migrations/`, numbered `NNNN_name.sql`, contiguous, a
  number used once. Take the next unused one and **re-check before merging** —
  if another PR lands a migration while yours is open, renumber. Two files
  sharing a number leaves the apply order undefined and lets one silently never
  run (this happened: 0026 collided between the resources work and the pin
  work).
- Apply with `supabase db push`, never by pasting into the dashboard SQL
  editor. Hand-application is what let production's recorded history drift out
  of step with the repo — see "Known drift" in README.md.
- **Reads must degrade, writes must explain.** Vercel deploys on merge and
  migrations are applied separately, so a shipped build can meet a database
  without its column. A read that hits a missing column retries without it or
  returns empty *and logs which file to run*; it never takes the page down, and
  it never silently reports zero where real data exists (see
  `fetchTaskCompletions`). A write returns a `MIGRATION_*_MISSING_MESSAGE`
  naming the file. Helpers live in `src/lib/migration-errors.ts`.
- Destructive steps (`drop column`, `drop table`) get a `DATA LOSS` note in the
  migration's header comment saying exactly what is lost and whether anything
  read it.

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
- Artwork — track covers, album covers, library artwork, resource thumbnails —
  renders through `CoverArt` (`src/components/cover-art.tsx`), never a bare
  `<img>`. Uploads are full-resolution originals and most slots that show them
  are 24-96px, so `CoverArt` wraps `next/image` to serve a resized, lazy WebP.
  It takes `fill`, so **the calling element must be `relative` and carry its
  own dimensions**, and it requires an explicit `sizes` describing that slot —
  a wrong `sizes` silently undoes the whole thing. Hosts the optimizer may
  fetch from are listed once in `src/lib/image-hosts.ts`, which `next.config.ts`
  and `CoverArt` both read; an unlisted host degrades to a lazy `<img>` rather
  than throwing. Image uploads go through `prepareImageUpload`
  (`src/lib/image-downscale.ts`) and are stored with a one-year `cacheControl`,
  since every storage key is unique per upload.
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
