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

### Migration history (drift repaired 2026-09-04)

Production's recorded history now matches this directory one-for-one: one row
per file, versioned by the file's `NNNN` prefix (`0001` … `0033`), which is
what `supabase db push` compares against. The next `db push` should report
nothing to apply and nothing unknown on the remote.

That was not true before. Until 2026-09-04 the recorded versions were
timestamps with no overlap with the filenames, so `db push` refused to run
(`Remote migration versions not found in local migrations directory`) and every
migration was pasted in by hand — which is how the record and the schema drifted
apart. The repair was done in one sitting and found three things worth knowing:

- **Four merged migrations had never reached production** (0029–0032), even
  though the app that needed them had already deployed. 0030 and 0031 in
  particular meant the seven-step finishing checklist and per-variation runs
  could not have worked. Applied.
- **0005 (`analytics_fields`) had been skipped entirely** — no `tracks.genre`,
  `started_at`, `completed_at`, none of its triggers. Nothing in `src/` read
  them, so nothing was visibly broken. Applied, so the schema matches the repo
  rather than the repo being edited to match the accident.
- **Production had a column the repo never defined**: `tracks.sort_order` with
  an index, from a migration applied directly to the project on 2026-08-25 for
  a "manual priority order" that never shipped. Removed by
  `0033_drop_stray_track_sort_order.sql` (a no-op on databases provisioned from
  the repo), so the repo is once again the only source of schema.

After confirming every file's effects were present, the
`supabase_migrations.schema_migrations` rows were replaced with the 33
filename-versioned entries — metadata only, the same thing
`supabase migration repair --status applied` writes.

Keep it that way: apply with `supabase db push` (or, if a migration must be run
from the Supabase MCP tools, name it exactly after the file, e.g.
`0034_whatever`, and then repair the version to `0034` so the record still
lines up). Never apply a migration to production that is not in this
directory.

Tables: `tracks`, `track_stages`, `track_finishing_steps`, `track_variations`
(+ `_steps`), `actions` (tasks, track-level or studio-level), `sessions`,
`session_activities` (per-activity time + notes), `session_types`,
`track_versions`, `suno_experiments` / `suno_candidates`, `albums`,
`resources`, and the `library_*` tables. Triggers seed the 5 stages on track
insert and bump `tracks.last_worked_at` on session insert. The `bottlenecks`
table and `actions.is_primary` were dropped in 0024: the next thing to do on a
track is the top of its task list, not a stored flag.

RLS is **enabled** on every table (0016) but there are no policies: this is a
single-user app, the server reads with the service-role key, and nothing goes
through the anon key except the permissive storage policies in
`0003_storage_policies.sql`. Adding a second user would mean real auth plus
`using (owner_id = auth.uid())` policies.

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
