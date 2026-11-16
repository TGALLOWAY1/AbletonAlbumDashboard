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
- **Every finishing-step row opens its own notes.** The label, date and
  chevron on a `TrackFinishingSteps` row are one link to
  `/tracks/[id]/finishing/[stepKey]` (`?variation=<id>` for a variation's run);
  the tick stays a separate control. Notes live in `track_step_notes`
  (migration 0034), each one either **markdown** typed in or an **image**
  uploaded to the public `track-images` bucket under `step-notes/<track>/` —
  the resources `source_kind` shape, narrowed to two kinds. Any number of notes
  per step, newest first, so `variation_id` can be nullable without 0031's
  upsert problem. `src/lib/step-notes.ts` owns the shapes, the href, the row
  mapping, the counts and the action schemas; `attachDetails` loads only the
  keys and puts a `noteCount` on every `FinishingStep`. The page is one
  responsive route for both surfaces, like `/tracks/[id]/edit`; only its back
  link is decided per user agent. Stored markdown renders through
  `MarkdownBody` (`src/components/markdown-body.tsx`), shared with resources.
- Bounces, logged sessions and completed tasks are one timeline
  (`src/components/track/track-log-pane.tsx`) — they all answer "what happened to
  this track", so they are not three sections.
- **The dashboard (`src/app/page.tsx`) is a grid of widgets the user arranges**
  — see "Dashboard widgets" below. It is still a single responsive surface
  with no user-agent sniffing and no separate mobile route: the same markup is
  a 12-column grid, a six-column flow or one column, by the dashboard's own
  width. Everything the page used to be is a widget in the default layout.
- **The shortlist is the pinned tracks** — up to `MAX_PINNED_TRACKS`
  (5) tracks carrying `tracks.pinned_at` + `pin_order` (migration 0027), in an
  order you drag. It is deliberately *not* derived from album membership or
  `status`: it used to be the intersection of "in the active album" and
  "status = active" under a hard cap, so changing your mind meant archiving a
  song. The cap now lives on the pin (`setTrackPinned`, the only writer — it is
  not a database constraint, see 0027) and finishing or archiving a track
  unpins it automatically in `setTrackStatus`. `status` means only where a
  track is in its life; nothing caps how many are active. Migration 0027 also
  dropped the never-wired one-track `is_focus` flag from 0012.
- The shortlist is the Pinned Tracks widget
  (`src/components/dashboard/widgets/pinned-tracks-list.tsx`): compact rows
  with dividers, since the widget is already a card. A row's chevron opens a
  short inline detail (next task in full, open count, last worked, Open /
  Unpin) — **not** the full `TrackCard`, which picks its layout from the
  viewport (`md:`) and would draw four columns inside a quarter-width card.
  The detail still carries what that card offered from the home page — the
  Suno status toggle, the `.als` path copy (desktop) and the track actions
  menu — as server-rendered nodes passed in per track (`controls`).
  The top row is the song that matters most, and the one the Current Track
  widget follows when it is not pointed at a specific track.
  Pinning is reachable from three places: the "+" in the widget's header,
  which opens `PinTrackDialog`
  (`src/components/home/pin-track-dialog.tsx`); Unpin in a row's detail (and
  an icon on the row from 28rem of widget width — narrower, that width goes
  to the name and next task); and `PinTrackButton` in the shared
  `TrackHeaderBar` (so both track surfaces get it — parity rule below). The
  dialog lists the shortlist as well as the candidates, so at the cap a swap
  happens inside it instead of dead-ending on disabled Pin buttons, and its
  rows hold their order while it is open (`src/lib/pin-picker.ts`) so a toggle
  never moves a row under the pointer. Finished tracks are left out of its
  list, so when that is why it offers nothing (`pinPickerDeadEnd`) — or why a
  search came up empty — it says so and links to `/tracks`: a status can be
  moved back, and "add a track" would be the wrong advice.
- There is no active-album card on the dashboard. `albums.is_active` still
  exists and still means "the album a new track defaults into"
  (`resolveAlbumId`, `/tracks/new`, settings) — it just no longer decides what
  the home page shows. Album-less tracks are not called out here either; the
  `/tracks` shelf already files them under `BACKLOG_GROUP_LABEL`.
- **Tasks do not have to belong to a track.** `actions.track_id` is nullable
  (migration 0028); a row with no track and an `owner_id` is a studio task
  ("back up the drive", "sort the sample folder"). They render in the Tasks
  widget (`src/components/dashboard/widgets/tasks.tsx` + `tasks-panel.tsx`),
  whose one setting is which list it shows: the studio's, or a track's. It is
  the *same* `TrackTodoList` and the *same* server actions in
  `src/app/actions/track-todos.ts`, which all take `trackId: string | null` —
  never fork the list. The widget's "To do" / "Done" tabs are two views of
  that list (`list="open" | "done"`); there is no "In progress", because a
  task is open or completed and nothing else. Note `scopeToList` in the
  actions: narrow a studio-task query with `.is("track_id", null)`, never
  `.eq("track_id", null)`, which PostgREST renders as `track_id=eq.null` and
  matches nothing.
- **The full progress view is its own page, `/analytics`**
  (`src/components/home/progress-panel.tsx`): the work heatmap with every
  figure measured over it, and the session history log behind a tab in the
  URL (`src/lib/progress-tab.ts`). For a while it was the dashboard's last
  section (`/#progress`); several widgets are now small windows onto the same
  data and link here for the whole of it — and editing or deleting a logged
  session must not depend on which widgets someone kept. `/sessions` and the
  old `/?progress=history` redirect to it. It is not a nav item: it is reached
  from the dashboard toolbar and from those widgets, and it lights up Home
  (`isHomeSection` in `nav-items.ts`).
- **One range control, one window.** The 7D/30D/3M/6M/1Y tabs govern the
  heatmap *and* the time, session count, tasks-done and streak figures printed
  under it — all read off a single `getRangeStats()` (`src/lib/analytics.ts`).
  Do not reintroduce a fixed-window stat row: the page used to carry "this
  week" tiles above a heatmap defaulting to three months, and the two halves
  routinely disagreed about what "now" meant. `getWeeklyDelta` is gone for the
  same reason. Tasks-done needs completion timestamps, so `fetchAnalyticsData`
  ships `taskCompletions` alongside sessions and the client filters by range.
  On the dashboard each analytics widget is its own window and names it in its
  header, but they all compute through the same `getRangeStats()` — so a
  widget and `/analytics` set to the same range print the same figure. A
  widget's reference time ("now") must advance when refreshed data arrives,
  not be fixed at mount, or a task ticked a moment ago falls outside the
  window until a reload.
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
  line instead. `WorkHeatmap` also takes `density="compact"` for a dashboard
  widget's box, where a 30-day calendar has about 170px of height: fixed
  small cells that print no dates and lean on the same readout line. It is
  opt-in and keeps the invariant above — `/analytics` draws `regular`.
- Time gets recorded three ways, all on the dashboard: the Quick Actions
  widget's "Start session" (`/focus/new`) and "Log session" (the backfill
  `SessionFormDialog`), and the Focus Timer widget, which runs the session in
  place. The timer is not a second clock: it drives the one global session in
  `FocusSessionProvider` (which is why moving, resizing or re-rendering the
  widget cannot disturb it) and Stop hands off to `/focus/log` like every
  other stop. A preset length is `targetMs` on that session — the widget
  counts down to it and then keeps counting the overtime rather than ending
  the session. While the widget is on screen it calls `showTimerSurface()`
  and `FloatingFocusBar` stands down, so the same timer is not drawn twice;
  for that reason the widget keeps a Stop control at every size, and stands
  aside for the pill while the dashboard is being customized (its contents
  are inert then, so it could show the clock but not stop it).
- **The dashboard toolbar is one row.** On a phone every line above the
  first widget decides what makes the first screen, so the row is the layout
  name (which is the switcher) and three buttons that drop their labels below
  `sm:` (`TOOLBAR_BUTTON_CLASS` in `dashboard-shell.tsx`), fitting down to a
  375px phone. There is no greeting and no tagline. The default layout's
  phone order leads with the shortcuts as a single row, then the shortlist,
  then the tasks — what the home page has always put first there.
- Library (`src/app/library/**`) is likewise a single responsive surface — the feature parity rule below is track-level and does not imply an `/m/library` route. `src/app/library/layout.tsx` mounts the preview player so playback survives navigation between Library routes without leaking an audio element onto every other page.
- Resources (`src/app/resources/**`) is one system at three scopes: `/resources`
  is the landing page, `/resources/[categoryId]` is a category, and
  `/resources/[categoryId]/[resourceId]` is a single topic. All three share the
  same parts — `ResourceCategoryNav` (the horizontal tab row; `null` means All),
  `ResourceTopicGallery` + `ResourceTopicCard` (the numbered, thumbnail-first
  cards) and `AddResourceDialog`. There is no separate category-directory page:
  the nav *is* the directory. Numbering is positional, off "recommended order"
  (oldest first), not a stored field.
- **`/resources` is not the "All" gallery any more.** It used to open on every
  resource the user owned, numbered 1..n — the least useful view in the
  section, since the category tabs reach the same material organised and search
  reaches it faster. It now opens on `ResourcesRestingView`: the activity map,
  then the pinned poster shelf, then the learned one. The gallery is still
  there and now searches *every* category at once — `ResourceGalleryView` takes
  a `resting` node and swaps to results the moment a word is typed or a tag
  picked. A category page passes no `resting`, because there the gallery is the
  page.
- **The category tabs are rearrangeable, the categories are not editable.** The
  seven categories stay a list in code (pinned to 0026's check constraint); only
  their *order* is the user's, stored in `resource_category_order` (migration
  0036) as one row per placed category. `orderCategories`
  (`src/lib/resource-category-order.ts`) applies it: unplaced or newly added
  categories follow the placed ones, stale ids are dropped. "Rearrange" in
  `ResourceCategoryTabs` drags tabs (Pointer Events, arrow keys too) and
  `reorderResourceCategories` upserts 0..n-1; "All" always stays first. Only
  the tab row follows this order — the add dialog and move menu keep the
  default. Reads degrade to the default order without the table.
- **Archiving a resource is the learning event, and there is no counter.**
  `resources.archived_at` (migration 0035) is the whole log: the figure on
  `/resources` is `count(archived_at is not null)` and the activity map shades
  each day by how many landed on it, both derived in
  `src/lib/resource-shelf.ts`. Nothing increments a stored tally — a tally
  cannot be un-learned and this can. Archiving also clears the pin
  (`setResourceArchived`), so nothing is on two shelves at once, and archived
  material leaves every gallery and comes back as the Learned shelf on
  `/resources` *and* at the foot of its own category page.
- The activity map is **not** the work heatmap and does not share its model.
  `src/lib/heatmap.ts` draws minutes on a Monday-aligned week grid because a
  producer's week has a shape; `src/lib/learning-activity.ts` draws counts on a
  single strip of days because what a learning log answers is "did the habit
  hold". What they do share is `toDayKey` (so both line up with the user's own
  calendar day), `RangeKey` — one range vocabulary, `RANGE_LONG_LABELS` is just
  the spelled-out wording for a dropdown — and the invariant that **a cell's
  size never depends on the range**: fixed `--cell`/`--gap`, scroll when wider
  than the card, month markers carrying a column index rather than a width
  share. `ResourceActivityCard` is the one range control for everything on it,
  Overall and By Category alike.
- **A resource carries 1-5 stars, and unrated is not zero.** `resources.rating`
  is nullable; `readRating` reads anything outside 1-5 back as null rather than
  clamping, and `ResourceStars` renders *nothing at all* when unrated — a row
  of hollow stars on every card is a judgement the user never made. The only
  writer is `ResourceRatingControl` on the detail page; everywhere else shows
  it read-only.
- Pinned resources are a wall of covers (`ResourcePosterShelf`, 2:3, numbered
  underneath), capped at `MAX_PINNED_RESOURCES` in `setResourcePinned` — the
  only writer, for the reason 0027 gives for tracks. Order is the pin timestamp
  itself, so unlike the dashboard's hand-dragged shortlist there is no
  `pin_order` to keep in step.
- **A PDF and a markdown note get a generated cover.** `ResourcePosterArt`
  falls back to one — the category's colourway (`RESOURCE_POSTER_GRADIENTS`,
  keyed by category so all seven differ, unlike `ResourceColor` where three
  share green), the source's icon, and on `poster` the title set on the
  artwork. `tile` leaves the title off for the gallery card, which prints it
  underneath already. A thumbnail, when there is one, still goes through
  `CoverArt`.
- `AddResourceDialog` renders its own trigger button on purpose. Category pages
  are server components, and an element passed into Radix's `asChild` Slot from
  one hydrates without the props the Slot injects on the client. Pass
  `categoryId`/`categoryTitle` to it and the new resource inherits that category
  (read-only label instead of a picker); omit them on `/resources`, where there
  is no category context, and the user picks one.
- **A resource's category is its shelf; its tags are what it is about.**
  `resources.tags` (migration 0032) is a free-form `text[]` — instrument and
  role words like bass, drums, pad, fx — with *no* check constraint, because
  adding a word must never need a migration. `src/lib/resource-tags.ts` owns
  the storage form (trim, lowercase, dedupe, length cap), the suggested
  vocabulary (seeded from the library's `PRESET_CATEGORIES` so a pad article
  and a pad preset answer to the same word), the AND-semantics filter and the
  grouping. Display casing is `formatTag` at render time — never store it.
- Search, the tag chip row, the group-by-tag toggle and the gallery are one
  component (`ResourceGalleryView`) mounted by both `/resources` and every
  category page, so the two scopes cannot drift. The tag selection and the
  grouping live in the URL (`?tag=a&tag=b`, `?group=tag`) so a filtered view is
  linkable and the pages stay server components; search is client state.
  Grouping repeats a two-tag resource in both groups on purpose — it is a way
  of browsing, not a partition — and untagged items come last.
- A saved resource is editable (`updateResource` + `EditResourceDialog` off the
  detail page). Category is *not* part of that form: it is in the resource's
  URL, so moving one stays `updateResourceCategory`, which returns the
  destination. Nor is `source_kind` — the body field follows the row's own kind
  and a PDF's storage path is not editable.
- Server actions that mutate a resource call `revalidateResourceSurfaces` from
  `src/lib/revalidate-resources.ts` — the sibling of `revalidateTrackSurfaces`.
- Server actions live under `src/app/actions/`.
- Data fetchers live under `src/lib/data/`.
- **A task can carry an estimate and a stage.** `actions.estimated_minutes`
  and `actions.category` have existed since 0001; `src/lib/task-details.ts`
  owns their meaning (`formatMinutes`, `sumOpenEstimates`, `toStageKey`).
  `category` is free text and the Suno round trip stores `"suno"` in it, so
  reads *narrow* it to one of the five stage keys rather than casting, and
  `updateTrackTodoDetails` only writes the keys the caller passed — an
  untouched picker must never erase that marker. Studio tasks (`trackId`
  null) may have an estimate but never a stage; the action refuses one.
- **A logged session is editable.** `updateSession` / `deleteSession` in
  `src/app/actions/sessions.ts` never write `duration_seconds` (generated),
  and afterwards put `tracks.last_worked_at` back in step with the rule in
  `src/lib/session-last-worked.ts`, because the insert-only trigger cannot.
  Backfill and edit share one form, `SessionFormDialog`; the Edit/Delete
  controls are one `SessionActions` component with a `variant` prop, mounted
  in the History tab and in the track log on both surfaces.
- `/tracks` also keeps its sort (`src/lib/track-sort.ts`, default last
  worked) and name/tag search (`src/lib/track-search.ts`) in the URL, sorted
  within each album shelf. Every control on that page owns one query param
  and merges the others through `mergeQuery`, so none resets another.
- The focus runner's track and session-type pickers are decided by the pure
  helpers in `src/lib/focus-runner.ts`; switching track mid-session patches
  the running session in `FocusSessionProvider` *before* the route change so
  the destination page owns it at once, and the goal re-seeds from the new
  track unless the user typed their own.

## Dashboard widgets

The home page is a grid of widgets the user adds, moves, resizes and
configures, saved as named layouts. Four layers, each ignorant of the ones
above it:

- **Grid maths — `src/lib/dashboard/grid.ts`.** Rectangles on a 12-column
  grid: collision, compaction, move, resize, first free slot. Pure and
  unit-tested, like `task-order.ts`. Two invariants hold for everything it
  returns: nothing overlaps or leaves the grid (placement is sequential, so
  this is true by construction even for broken input), and gravity pulls up
  (no holes). A drag is always computed from the layout **as it was when the
  drag began**, never from the previous frame — chaining frames lets push
  order accumulate, so dragging out and back would not restore the layout.
  Who yields when a widget lands on another is the *centre rule*: the mover
  takes a widget's place once its centre has crossed that widget's centre
  (`moveItem`); the keyboard uses `stepItem`, where up/down mean "past the
  neighbour", because with gravity a one-row nudge just floats back.
- **The registry — `src/lib/dashboard/widgets.ts`.** What a widget *is*:
  name, blurb, category, the size presets it offers, whether a second copy
  makes sense (`multiple`), and a Zod schema plus field descriptors for its
  settings. Plain data, importable from the browser. The components live
  apart, in `src/components/dashboard/widgets/index.tsx`, because they are
  server components; that map is typed `Record<WidgetType, …>`, so a widget
  with no renderer does not compile. **To add a widget: one entry in
  `WIDGETS`, one component, one line in the renderer map.** The grid, the
  gallery, the settings dialog and persistence all iterate the registry and
  need no change.
- **The layout document — `src/lib/dashboard/layout.ts`.** A *type* is a kind
  of widget; an *instance* is one copy on a dashboard with its own id, box and
  settings (two Tasks widgets, two tracks). A layout is
  `{ version, items, order }`, stored whole in `dashboard_layouts.layout`
  (migration 0037) — a document rather than a row per widget because it is
  saved and cancelled as a unit and nothing queries inside it. **`readLayout`
  is the only way a stored layout enters the app, and it never throws**: an
  unknown or future version falls back to the default (flagged, and nothing is
  overwritten until the user saves); a type that no longer exists is dropped
  (renames go in `WIDGET_TYPE_ALIASES`); settings that fail the schema read as
  that widget's defaults; ids, boxes and overlaps are repaired. Changing the
  stored shape means bumping `LAYOUT_VERSION` and adding a step to `UPGRADES`.
  The save action runs the same function, so what is stored is always
  something the reader accepts.
- **The surface — `src/components/dashboard/`.** `page.tsx` picks the layout
  (`?layout=<id>`, omitted for the default, like every other view preference),
  renders one `WidgetHost` per instance **on the server**, and passes them to
  `DashboardShell` as nodes — the `PinnedTracks`-card trick, at page scale. So
  the shell and `DashboardGrid` are client components (they hold drag and
  edit state) while widgets stay server components that each read their own
  data. `WidgetHost` gives every widget a Suspense skeleton and its own error
  boundary: a failed query costs one card, not the page, so **a widget throws
  on a failed read** and never swallows it into zeros. Queries several widgets
  share are wrapped in `cache()` in `src/lib/data/dashboard.ts`.

Rules that are easy to break:

- **A widget is never told its size.** Its card is a CSS size container named
  `widget`; it decides what to show with `@sm/widget:`-style width queries and
  the `widget-h3:` / `widget-h4:` / `widget-h5:` height variants
  (`globals.css`). That is why content responds *while* the corner is being
  dragged, with no round trip. A bigger box shows more, not the same thing
  scaled. `dash-stack:` is the phone arrangement, where the box is as tall as
  its content and the height variants never match.
- **Where widgets go is CSS, not measurement.** Each cell carries
  `--x --y --w --h --mw --o` inline and `.dash-grid` picks the arrangement
  from a container query on the dashboard's *own* width (the sidebar takes
  16rem of a desktop viewport and none of a phone's, so the viewport is the
  wrong thing to ask): 12 columns from 58rem, six flowed columns from 32rem,
  one column below. Nothing is measured in the browser and nothing moves
  after hydration. Do not swap this for a library that positions with
  measured pixel transforms.
- **Only the 12-column grid is dragged.** There a widget moves by its top bar
  and resizes from its corner (Pointer Events — one path for mouse, pen and
  touch — plus arrow keys on the focused grip, Shift to resize). Narrower
  arrangements have no cells to drag between; they flow in `order`, which the
  up/down buttons rearrange. `order` is `null` until someone does that, so a
  desktop-only user's phone follows their desktop layout for free; the default
  layout sets it explicitly, because the best first screen on a phone
  (shortcuts, shortlist, tasks) is not the desktop read top to bottom. Which
  arrangement is live is read from the grid's computed style at the moment of
  the gesture, never tracked in state.
- **On a phone a widget is as tall as its content.** No fixed rows and no
  scrolling inside a card: a scroll box inside a scrolling page traps the
  thumb. `.dash-scroll` only scrolls where the box has a fixed height.
- **Edit mode edits a draft.** Nothing reaches the database until Save, which
  is what makes Cancel honest. A widget added or re-configured mid-edit has
  no server-rendered node, so `renderWidgetPreview` (a server action that
  returns the rendered `WidgetHost`) supplies one; previews are dropped when
  the page re-renders from the saved layout. Widget contents are `inert`
  while editing.
- **A save is conditional on the revision it was based on.** The whole
  document is written at once, so a save from a page that loaded before
  someone else's save would put back everything they changed — the widget
  removed in the other tab (or on the phone) silently reappears.
  `saveDashboardLayout` takes the `updated_at` the caller loaded and only
  matches a row still at it; otherwise nothing is written and the result says
  `conflict`, and the shell *asks* whether to replace the other change
  (`force`). The built-in layout has the same hazard in another shape — two
  tabs would each insert a "My Studio" — so once any row exists a save of it
  is refused. A successful save returns the new row id and revision, and the
  shell keeps both in state so a second save before the refresh lands is not
  a false conflict.
- **Unsaved changes are not lost without asking, and nothing changes under a
  save.** `beforeunload` covers reloads and leaving the site; an in-app link
  is a client-side route change and never fires it, so the shell also
  intercepts link clicks (capture phase) while the draft is dirty. While a
  save is in flight the grid is `inert`: the save carries the draft as it was
  when Save was pressed and replaces it when it lands.
- **Document order follows what is on screen.** Where a widget is drawn is
  CSS, but the order of the elements is what Tab and a screen reader follow,
  and the stacked and gridded arrangements read differently. The server
  renders stack order; `DashboardGrid` re-sorts to grid reading order once it
  sees the 12-column grid is live. That order is pinned from press to release
  of a pointer gesture — moving an element in the document drops its pointer
  capture — and a keyboard move puts focus back on the grip it came from.
- **Focus is handed on when its control disappears.** Saving removes Save,
  removing a widget removes its menu, a dialog opened from a menu has no
  trigger to return to. The shell names the next element (`focusNext`); the
  dashboard's dialogs `preventDefault` Radix's close-autofocus so it is not
  overridden. Do not let focus fall to `<body>`.
- **The options menu is portalled, and React bubbles its events to the drag
  bar anyway.** The bar's `onPointerDown` checks
  `currentTarget.contains(target)`; without it a press on a menu item starts
  a drag, captures the pointer, and the item is never chosen.
- **Goals are measured, not stored.** A goal is a target over the current
  week or month in the widget's settings, counted from `sessions` and
  `actions.completed_at` each time it is drawn — the "no counter" rule the
  resources shelf follows. There is no goals table.
- **No rows is a valid state.** With nothing in `dashboard_layouts` the app
  shows its built-in default ("My Studio", `defaultLayout()`), and the first
  save creates the row. `createDashboardLayout` writes the built-in first when
  it is about to create the only row, or "My Studio" would vanish from the
  switcher. A failed read of the table shows the built-in **read-only** —
  saving over an unknown set of rows could bury the real ones.

## Feature parity rule (desktop ↔ mobile)

**Any track-level user-facing feature on `/tracks/[id]` must also work on `/m/[trackId]`, and vice versa.** Add it to both pages in the same PR.

Exceptions: features that are genuinely platform-specific — e.g. Ableton `.als` file-path copy (desktop-only by nature), camera capture (mobile-only). Document the exception in the PR description.

Reviewers should reject single-platform additions that have no platform-specific justification.

### How to share components between the two surfaces

Prefer **one component with a `variant` prop** over forking files. Existing examples:

- `TrackTodoList.variant: "desktop" | "mobile" | "widget"` — `src/components/mobile/track-todo-list.tsx`
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
`/tracks/[id]/edit` and the shared finishing-step notes at
`/tracks/[id]/finishing/[stepKey]`. The only difference is arrangement — three
columns vs. three tabs — which is a viewport constraint, not a feature gap. The `.als` file-path copy
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
  of step with the repo; that drift was repaired on 2026-09-04 and the record
  now carries one filename-versioned row per file (see "Migration history" in
  README.md). If a migration has to go in through the Supabase MCP tools, name
  it exactly after the file and repair its recorded version to the `NNNN`
  prefix afterwards, so `db push` keeps agreeing with the directory. Never run
  SQL against production that is not a file in this directory — that is how
  `tracks.sort_order` appeared with no migration to explain it (0033 removed it).
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
- **Root-layout chrome never throws on a read.** The sidebar's data panels
  (`SidebarFocusPanel`, `SidebarStats`) render inside `src/app/layout.tsx` on
  every page, including on phones where CSS merely hides them. A throw there
  has no page-level `error.tsx` above it: it reaches `global-error.tsx` and
  replaces the whole app, whatever page the user was on — which is how one
  transient Supabase "Gateway Timeout" during a resources-page refresh became
  a full-screen "Something went wrong" for a save that had already succeeded.
  So the chrome catches, logs (`logSupabaseError`) and degrades: the focus
  panel to the plain `SidebarFocusLink`, the stats block to "Unavailable right
  now" rather than confident zeros. The fetchers they call keep throwing — on
  their own pages a failed read *should* reach that page's boundary.
  `layout-chrome-reads.test.ts` asserts the catch.
- Server actions that mutate track-level data must call `revalidateTrackSurfaces(trackId)` from `src/lib/revalidate-track.ts`, which revalidates **both** route shapes plus the dashboard/focus/session surfaces. Do not hand-roll `revalidatePath` lists.
- User-facing errors in client components go through `useToast()` (`src/components/toast.tsx`, provider mounted in the root layout) — never `window.alert()`. Toasts sit above dialogs (`z-[100]`): most validation errors are raised from inside one, and under the dialog's backdrop the action just looked like it did nothing. Write the message for the person — a schema's messages are user copy (see the widget registry), never a raw Zod string.
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
- **Form fields are 16px on touch screens.** iOS zooms the page in whenever it
  focuses a field whose text is under 16px, and never zooms back out;
  client-side navigation then carries the zoom to every later page, which is
  what "I keep pinching the app back to size on my phone" was. `globals.css`
  redefines `--text-xs`/`--text-sm` to 1rem on `input`, `textarea` and
  `select` under `(pointer: coarse)`. Tailwind's size utilities read those
  variables when they apply, so a field's `text-sm` is 14px with a mouse and
  16px on a phone with no class change, and a field with no size is floored
  at `max(1rem, 1em)`. An arbitrary size on a field (`text-[13px]`) skips the
  variables, so fields do not take one; and a layout that only fits the
  desktop size breaks on touch (`SessionFormDialog` puts start and minutes
  side by side only `sm:pointer-fine:`). Never stop the zoom with
  `maximum-scale=1`: it also stops Android users pinch-zooming at all.
  `mobile-zoom.test.ts` compiles the stylesheet to check the rule.
- **Nothing is wider than a phone's screen.** Safari shrinks a page whose
  content is wider than the viewport to fit it, so one overflowing element
  reads as the app rescaling itself between pages.
  Rendered user text wraps (`wrap-anywhere`) and its code blocks scroll in
  place (`[&_pre]:overflow-x-auto`); `MarkdownBody` and `NotesEditor` carry
  both. A button-styled label that can hold a name truncates (`BackLink`),
  since button styles never wrap. A row of full-size buttons has to be allowed
  to shrink so it can wrap, which is why `SunoStatusToggle`'s group is not
  `shrink-0`.
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
