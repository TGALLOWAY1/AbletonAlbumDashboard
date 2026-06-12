# Finish Five — Repo Notes for Claude

An album-in-progress dashboard for tracks built in Ableton. Helps the user surface bottlenecks, run focused sessions, and finish songs.

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
- Dashboard root (`src/app/page.tsx`) is a single responsive surface using Tailwind `md:` breakpoints — no user-agent sniffing, no separate desktop/mobile route for the home page.
- Server actions live under `src/app/actions/`.
- Data fetchers live under `src/lib/data/`.

## Feature parity rule (desktop ↔ mobile)

**Any track-level user-facing feature on `/tracks/[id]` must also work on `/m/[trackId]`, and vice versa.** Add it to both pages in the same PR.

Exceptions: features that are genuinely platform-specific — e.g. Ableton `.als` file-path copy (desktop-only by nature), camera capture (mobile-only). Document the exception in the PR description.

Reviewers should reject single-platform additions that have no platform-specific justification.

### How to share components between the two surfaces

Prefer **one component with a `variant` prop** over forking files. Existing examples:

- `TrackTodoHistory.variant: "panel" | "collapsible"` — `src/components/mobile/track-todo-history.tsx`
- `TrackTodoList.variant: "desktop" | "mobile"` — `src/components/mobile/track-todo-list.tsx`

Variant prop controls sizing (tap targets vs. compact desktop), not behavior. Server actions, optimistic reducers, and data shapes stay shared.

The `src/components/mobile/` directory currently holds components used on **both** platforms (legacy from when they were mobile-only). New shared components should land directly in `src/components/`; renaming the existing directory is a tracked follow-up, not blocking work.

### Known parity gaps (snapshot — file follow-ups under the rule above)

None currently. Both `/tracks/[id]` and `/m/[trackId]` render `AudioVersionList`
(including upload) and link to the shared metadata editor at
`/tracks/[id]/edit`. The `.als` file-path copy renders on both but is only
useful on desktop (documented exception).

## Conventions

- Server components are the default; mark client components with `"use client"` only when they need state, refs, or browser APIs.
- Server actions that mutate track-level data must call `revalidateTrackSurfaces(trackId)` from `src/lib/revalidate-track.ts`, which revalidates **both** route shapes plus the dashboard/focus/session surfaces. Do not hand-roll `revalidatePath` lists.
- User-facing errors in client components go through `useToast()` (`src/components/toast.tsx`, provider mounted in the root layout) — never `window.alert()`.
- Optimistic UI uses React 19's `useOptimistic` (see `TrackTodoList`).
- Styling: Tailwind utility classes, no CSS modules. Use `cn()` / `tailwind-merge` for conditional classes.
