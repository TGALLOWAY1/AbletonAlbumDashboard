# Session Starters

Session Starters lives at `/session-starters`, with individual guides at
`/session-starters/[id]` and active sessions at `/focus/starter`. Desktop and
mobile navigation expose the feature. The six defaults are editable templates,
not a separate hardcoded gallery.

## Architecture and implementation

The implementation followed five workstreams: inspect the existing template,
timer and storage systems; add templates and discovery; connect launch and
logging; add media and filming tools; and exercise the complete flow.

- `src/lib/session-starters.ts` owns the domain, six seed workflows, combined
  filters, image validation, resource URL validation and official TikTok URLs.
- `src/lib/data/session-starters.ts` extends the existing `session_templates`
  repository. Initial inserts ignore conflicts so edits and archives survive.
  `starter_data` is JSON containing ordered, stable-ID steps, resources,
  outcomes, filming guidance and video references. Favorites and archival have
  their own columns. Older databases get explicit read-only previews; outages
  reach the route's retryable error boundary.
- `src/app/actions/session-starters.ts` validates all mutations and scopes them
  to the existing server-side `OWNER_ID`. It also duplicates templates with
  independent copies of media, so deleting an original's visual cannot break
  its duplicate.
- `src/components/session-starters/` contains gallery, illustrated covers,
  detail, editor, visual management, filming and inspiration panels, launch,
  active session, wrap-up, and history summaries. Existing Radix dialogs,
  buttons, track picker, colors and toast behavior are reused.
- `FocusSessionProvider` is the single timer. A launch deep-copies the template
  into a run with a unique token and chosen duration. Steps, notes and outputs
  survive reloads in the existing tab's session storage. A running, paused or
  stopped-but-unsaved session cannot be replaced by another launch.
- `completeStarterSession` calls the existing `completeSession` writer. A
  single atomic `sessions` row stores `template_id`, an immutable workflow
  snapshot, completed step IDs, assets, filming outcomes and a next action.
  A unique run token makes an interrupted save safe to retry. No separate
  session tracking table or service was introduced.
- Pauses are excluded from worked duration, matching the existing logger.
  The snapshot retains the original wall-clock start. Sessions can finish with
  any number of completed steps. Dashboard history and track logs can show
  the historical workflow and outputs without loading today's template.
- Content status belongs to the individual run, independently of whether a
  reusable template is suitable for filming.

## Database and storage setup

Apply `supabase/migrations/0037_session_starters.sql` after the existing
migrations, through the repository's normal process:

```sh
supabase link --project-ref <your-project-ref> # if not already linked
supabase db push
```

The migration extends `session_templates` and `sessions`, adds
`session_starter_media`, and creates the private `session-starter-visuals`
bucket. It preserves existing template/session rows. The seed workflows are
inserted idempotently on first gallery access after migration.

Use the existing Supabase environment variables, including the server-only
`SUPABASE_SERVICE_ROLE_KEY`. Files are uploaded through server actions; no
anonymous bucket policies are added. The media table stores metadata and
storage keys separately from file bytes. Uploads allow PNG, JPEG, WebP and GIF
up to 8 MiB, with MIME and signature checks on the server and a matching bucket
limit. SVG/HTML files are rejected. New objects get unique server-owned paths;
failed metadata saves clean up their uploads. The Next.js multipart limit is
10 MiB so valid uploads can reach validation.

Image URLs use `/api/session-starters/media/[id]`. The route checks both media
and parent ownership and redirects to a fresh, short-lived signed URL with
private, no-store caching. Missing images have a visible fallback. Fullscreen
guides use containment and optional zoom; only cover images crop in cards.

TikTok URLs are validated against exact HTTPS hostnames and valid video/short
link paths. Full URLs can open the official TikTok player on demand. Every
reference retains an external Open in TikTok action, including short links,
private videos and unavailable players. No scraping, downloading or invented
creator/engagement metadata is used.

Geist and Geist Mono are self-hosted under `src/app/fonts/` with their OFL
license, preserving typography while removing the build's Google Fonts
network dependency.

## Validation

Executed on 2026-11-16: type-check passed, lint passed, all 696 tests in 56
files passed, and the production build passed. Turbopack required permission
to bind its local worker socket in the execution sandbox. No database
migration was applied remotely.

All 14 Playwright workflow groups passed against the isolated test service,
with no page exceptions. This included the original focus logger and starter
history in both the dashboard and existing track timeline. Desktop (1440 px)
and mobile (390 px) screenshots were reviewed, including fullscreen guides;
the mobile checks also asserted no horizontal page overflow.

Run the repository checks:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

Unit/integration coverage includes seed validity, combined filtering, safe
URLs, image validation, missing-schema/outage behavior, ownership, upload
cleanup, media authorization, snapshot isolation, selected time budgets,
idempotent completion and regression coverage of ordinary session logging.

The reproducible Playwright browser checks use a local PostgREST/Storage test
double and real Next.js pages/server actions. Setup and execution instructions
are in `tests/SESSION_STARTERS_QA.md`. They exercise desktop and mobile flows,
template persistence, media, video references, session interruption, completion
and failure recovery without touching real user data. Their results do not
prove real PostgreSQL constraints, RLS or external TikTok availability.

## Operational limits and next enhancements

The migration is provided for the existing deployment process; it was not
applied to the live database during implementation. Real Supabase database and
storage smoke testing should follow that migration. The application retains
its existing single-user, trusted-server access model; `OWNER_ID` is not a
multi-user authentication system. Add real authentication and per-user policies
before offering this as a public multi-user service.

Active work survives reloads in its tab, following the existing timer's storage
model; closing the tab clears that draft. Local project paths can be viewed or
copied, but browsers cannot launch Ableton files automatically. An uploaded
image deleted from a template can also become unavailable in an old run's
visual reference, while the historical workflow and outputs remain intact.

Useful next improvements are a content-production dashboard over run outputs,
cross-device draft recovery, and linking saved outputs to library items.
