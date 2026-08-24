# Finish Five

> Five tracks. One focus. Finish them.
<img width="1715" height="1099" alt="image" src="https://github.com/user-attachments/assets/544d2a20-c8d3-4665-bd1d-d2759565f6be" />

A focused songwriting/production tracker built around a single constraint:
**only five tracks can be active at a time.** Everything else lives in the
backlog. The dashboard tells you what's stuck, what's next, and which one to
open first.

## Features (V1)

- **Dashboard** — active-five card grid with per-track progress, current
  bottleneck, next action, and last-worked timestamp.
- **Recommendation engine** — deterministic scoring (progress + momentum −
  bottleneck − staleness) picks one track and one action to start with.
- **Track Detail** — five-stage production checklist (Idea, Sound Design,
  Arrangement, Mixing, Mastering), bottleneck editor, primary-action editor,
  markdown notes, and audio versions with wavesurfer.js playback.
- **Focus Mode** — minimal-chrome timer with start/pause/resume/stop. Stop
  flows into a full-screen production-logging page (`/focus/log`).
- **Session logging** — break the tracked time down across nine production
  activities (sound design, arrangement, mixing, organization, melody/harmony,
  automation, reference/listening, FX design, other) with +/− 5-min steppers,
  manual entry, and per-activity notes; rate Progress/Impact and Enjoyment 1–5;
  add a general note; and (track sessions) optionally update the bottleneck.
  Live total/untracked/completion summary. Saving persists the session,
  per-activity allocations (`session_activities`), ratings, updates the active
  bottleneck, and bumps `last_worked_at`.
- **All Tracks** — library view with status + tag filters, 5-active-cap
  enforced server-side on activation.
- **Analytics** — avg time/track, completion rate, sessions/week, top
  bottleneck category, plus a category bar chart.

## Stack

- **Next.js 16** (App Router, Turbopack, TS, Server Actions)
- **Tailwind v4** + handwritten Radix-backed shadcn-style components
- **Supabase Postgres** for data, **Supabase Storage** for audio versions
- **wavesurfer.js**, **react-markdown**, **date-fns**, **zod**

## Setup

```bash
npm install
cp .env.local.example .env.local
# Fill in the Supabase URL + anon key from your project's API settings
npm run dev
```

Required environment variables (see `.env.local.example`):

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project anon/publishable key |
| `NEXT_PUBLIC_OWNER_ID` | Any UUID — single-user V1 marker |

## Database

Schema lives in `supabase/migrations/`, numbered `NNNN_name.sql` and applied
in order. Filenames are contiguous and a number is used once — see
"Adding a migration" below.

### Applying them

Use tooling, not the dashboard SQL editor:

```bash
supabase link --project-ref <your-project-ref>   # once
supabase db push                                 # applies everything outstanding
```

Pasting migrations into the dashboard by hand is no longer the convention. It
was how this project ran for its first two dozen migrations, and it cost us:
every applied file had to be remembered rather than recorded, so the project's
migration history drifted out of step with the repo (see "Known drift" below).
`db push` records what it applies, which is the whole point.

Pull request branches get this for free — the Supabase GitHub integration
provisions a preview database per PR and applies new migration files to it on
every commit, so a migration is exercised against real Postgres before it is
merged.

### Adding a migration

Take the next unused number. Check `supabase/migrations/` at the moment you
create the file **and** re-check before merging: if another PR lands a
migration first, renumber yours. Two files sharing a number leaves the apply
order undefined and lets one of them silently never run.

Because the app deploys on merge but migrations are applied separately, a
shipped build can briefly meet a database without its column. Reads must
degrade rather than throw — see the header of `src/lib/migration-errors.ts`.

### Known drift

The production project's recorded migration history uses timestamp-style
versions (`20260824173937`) rather than the repo's `NNNN` filenames, with no
overlap between the two sets. `supabase db push` against production therefore
reports `Remote migration versions not found in local migrations directory`,
and migrations cannot yet be applied automatically on merge. Fixing it means a
one-time repair of `supabase_migrations.schema_migrations` so the recorded
versions match the filenames — metadata only, no schema change — after
confirming every migration in the repo is genuinely reflected in the schema.
Preview branches are unaffected: they are provisioned from the repo and are
already consistent.

Tables: `tracks`, `track_stages`, `bottlenecks`, `actions`, `sessions`,
`session_activities` (per-activity time + notes), `track_versions`. Triggers
seed the 5 stages on track insert and bump
`tracks.last_worked_at` on session insert. Partial unique indexes enforce
"one active bottleneck per track" and "one open primary action per track."

RLS is intentionally **off** in V1 (single-user, no auth). When you add real
auth, enable RLS on every table with `using (owner_id = auth.uid())` and
replace the permissive storage policies in `0003_storage_policies.sql`.

## Scripts

```
npm run dev         # next dev (Turbopack)
npm run build       # production build
npm run start       # production server
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add the three env vars above in Project Settings → Environment Variables.
4. Deploy.

## Project structure

```
src/
  app/
    page.tsx                 Dashboard
    layout.tsx               SiteNav + main shell
    tracks/
      page.tsx               Library
      new/page.tsx           Add Track
      [id]/page.tsx          Detail (Overview / Notes / Versions)
      [id]/edit/page.tsx     Edit metadata
    focus/[trackId]/page.tsx Focus Mode (timer)
    focus/log/page.tsx       Production-logging page (post-session)
    analytics/page.tsx       V1 metrics
    actions/                 Server Actions (one file per resource)
  components/
    ui/                      Radix-backed primitives
    ...                      Feature components
  lib/
    supabase/{server,browser}.ts
    data/{tracks,versions}.ts
    recommend.ts             Scoring engine
    types.ts                 Domain types + helpers
    database.types.ts        Supabase schema types (hand-maintained)
supabase/
  migrations/                SQL migrations
```

## Out of scope (intentional)

The PRD's §9 "Future Features" list is deferred: AI suggestions, Ableton
project integration, collaboration, smart pattern detection. Add real auth
before exposing this beyond a single user.
