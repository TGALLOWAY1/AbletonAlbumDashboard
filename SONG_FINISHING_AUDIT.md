# Song Finishing App Assessment

**App:** Finish Five — "Five tracks. One focus. Finish them."
**Date:** 2026-06-12
**Scope:** Full product, UX, architecture, and codebase review (~22k lines, 18 DB tables, ~180 source files). No changes implemented; this is the audit and prioritized plan.

---

## Executive Summary

Finish Five has a genuinely strong core thesis — a hard cap of five active tracks, one bottleneck per track, one primary action per track, a five-stage pipeline — and the engineering quality is well above average for a project this size (zero `any` types, zero TODO comments, consistent Zod validation, clean React 19 optimistic-UI patterns, no orphaned components except two noted below).

The biggest problem is that **the app's "tell me what to do next" brain is built but disconnected.** Specifically:

1. **The recommendation engine is half-broken and almost invisible.** `recommendTrack()` weights momentum at 30% of its score, but its only caller (`SidebarFocusPanel`) never passes the sessions map, so momentum is permanently zero and the "High momentum" reason can never fire (`src/components/sidebar-focus-panel.tsx:14`). The recommendation appears *only* in the desktop sidebar — mobile users, the people most likely to glance at the app between sessions, never see a recommendation at all. `RecommendationCard` and `suggestFocusTrack` exist but are imported nowhere.

2. **Rich reflection data goes in; nothing comes back out.** Every session captures enjoyment, progress-impact, a 9-activity time breakdown, and per-activity notes — and almost none of it is ever shown to the user again or fed into prioritization. The app asks producers to do reflective work (the hard part) and then discards the payoff (the motivating part).

3. **The pipeline ends at "Mastering," not "Released."** There is no export/release stage, no definition of done, and no celebration or ritual when a track is finished. For an app whose entire mission is *finishing*, the finish line itself is the least-developed part of the product.

4. **Feature surface has drifted from the mission.** Templates (fully hardcoded, view-only), Library (45 hardcoded seed items mixed with DB instruments), and Resources (with fake seed content) are large, polished surfaces that don't move a single song closer to done. Meanwhile the dashboard can't answer "which track is stuck?"

5. **A real bug class undermines mobile:** 8 server actions (stages, bottlenecks, primary actions, versions) never revalidate `/m/[trackId]`, so mobile track pages show stale data after edits — a direct violation of the repo's own parity rule.

The opportunity is not to add features. It is to **wire together what already exists** — recommendation → dashboard, session outcomes → progress feedback, bottleneck data → stuck detection — and to give the product an actual finish line.

---

## Top 15 Prioritized Improvements

| Rank | Improvement | User Impact | Complexity | Risk | Recommendation |
|---|---|---|---|---|---|
| 1 | Fix momentum input to `recommendTrack()` (pass last-7-day session counts) | High — 30% of the scoring brain is dead | Low | Low | Do immediately |
| 2 | Add missing `/m/[trackId]` revalidation to 8 actions in `stages.ts`, `bottlenecks.ts`, `actions.ts`, `versions.ts` | High — mobile shows stale data after every stage/bottleneck/version edit | Low | Low | Do immediately |
| 3 | "Next Up" hero card on the dashboard (both breakpoints): one recommended track, its primary action, one Start button | High — answers "what do I work on today?" in 0 clicks; mobile currently has *no* recommendation surface | Low–Med | Low | Do immediately (reuse the dead `RecommendationCard`) |
| 4 | Stuck/stale signals: "untouched N days" + bottleneck-age badges on track cards and a "Needs attention" dashboard row | High — surfaces the silent killers of albums | Med | Low | Phase 1 |
| 5 | Add "Export / Release" as a 6th stage (or a done-checklist) + a completion ritual when a track hits done | High — gives the product an actual finish line | Med | Med (migration + seeded-stage trigger change) | Phase 2 |
| 6 | Unify session outcome capture: bring energy + improved/still-broken into the focus log, or cut them from the calendar dialog | Med–High — currently the same event captures different data depending on entry point | Low–Med | Low | Phase 1 |
| 7 | Close the reflection loop: show progress-impact trend, activity breakdown, and activity notes on the track History tab / analytics | High — converts captured-and-discarded data into momentum feedback | Med | Low | Phase 2 |
| 8 | Cut session-log friction: make activity allocation one-tap (preset "mostly X" buttons), ratings optional-by-default | Med–High — the 9-step log flow is the most repeated flow in the app | Med | Low | Phase 1–2 |
| 9 | Replace `alert()` error handling with the toast component that already exists in `src/components/library/toast.tsx` | Med — every optimistic surface currently fails into a browser alert | Low–Med | Low | Phase 1 |
| 10 | Track list (`/tracks`) sorting: by progress, last-worked, est. minutes remaining, stuck-ness | Med | Low | Low | Phase 1 |
| 11 | Surface weekly review beyond the calendar: Monday intention prompt + Friday reflection prompt on the dashboard | Med — the best behavioral feature in the app is hidden on one sub-view | Med | Low | Phase 2 |
| 12 | Demote or rebuild Templates: it is 100% hardcoded data with `/Users/producer/...` paths and "coming soon" actions | Med (removes confusion + dead weight) | Low (remove) / High (rebuild) | Low | Remove from nav until DB-backed |
| 13 | Validate `requires_track` in the focus runner (currently calendar-only), and let focus sessions start from a template | Med | Low | Low | Phase 2 |
| 14 | Storage hygiene: delete cover images on remove/replace (`cover-image-upload.tsx`), fix duplicate migration number `0012_*` | Low–Med | Low | Low | Phase 1 housekeeping |
| 15 | Add a minimal test setup (vitest) covering `recommend.ts`, `progressFromStages`, and the revalidation contract | Med (protects the brain you're about to invest in) | Med | Low | Phase 2 |

---

## Critical UX Problems

1. **Mobile users get zero guidance.** The recommendation, sidebar stats, and "Start Session" entry point all live in the desktop-only sidebar (`src/components/sidebar.tsx`, hidden below `md:`). On mobile the dashboard is a sorted list of cards with no "do this one" signal. Given the app's mission, this is the single worst gap.

2. **The recommendation engine misleads even where it works.** Beyond the dead momentum input, the reason-attribution list in `src/lib/recommend.ts:51-56` contains a contradiction: "Hasn't been touched in a while" is scored as a *positive* contributor (`WEIGHTS.freshness * (1 - freshness)`) while the actual score *penalizes* staleness. A user can be told a track is recommended *because* it's stale when staleness lowered its score.

3. **Stale mobile pages after edits** (the 8-action revalidation gap above). Toggling a stage on `/m/[trackId]` then navigating back will show the old state.

4. **The most-repeated flow is the highest-friction flow.** Stopping a focus session forces a full-screen logging page: allocate minutes across 9 activity cards, two 1–5 rating scales, notes, optional bottleneck — ~9 steps. Good data capture, but heavy enough that it punishes short sessions, which are exactly the sessions a momentum-building app should encourage.

5. **No "stuck" concept anywhere.** The data exists (`last_worked_at`, bottleneck `created_at`, status) but no surface answers "which songs are dying?" Tracks can silently rot at 40% forever; the dashboard sort (progress desc) actually buries them.

6. **Finishing a track is an anticlimax.** Completing the fifth stage does nothing. Status must be flipped manually; there's no release checklist, no archive ritual, no "you finished one — promote a backlog track into the open slot" moment, which is the natural payoff of the five-slot constraint.

7. **Errors surface as `window.alert()`** across todo list, history, next-action, bottleneck, notes, and version components — jarring and modal on mobile.

---

## Dashboard Improvements

Current state (`src/app/page.tsx`): greeting header → 4 stat cards → active-track cards sorted by progress desc → upcoming albums gallery → orphan-track notice. A "Sort by" control was deliberately removed in commit `31c6d85` — the right instinct (opinionated > configurable), but the remaining hardcoded sort answers the wrong question.

1. **Add a "Next Up" hero above the stats** (both breakpoints): recommended track, its primary action, reason badge, and a single Start Focus Session button. The dead `RecommendationCard` component is 80% of this. This converts the dashboard from a status display into an action trigger.
2. **Replace the progress-desc sort with an opinionated triage order:** Next Up first, then "in motion" (worked this week), then "needs attention" (stale > 7 days or bottleneck > 14 days old), each as a labeled group rather than a user-facing sort control. This respects the earlier decision to remove sorting while fixing what the sort communicates.
3. **Rework the stat row toward action.** "Tasks Completed" and "Total Time Worked" are vanity metrics here. Higher-leverage replacements: *current streak* (days/sessions this week), *tracks stuck* (count, links to the stuck group), *closest to done* (name + %, links to track).
4. **Show staleness on every `TrackCard`:** the card already shows last-worked; tint it (e.g., warning color past 7 days) so the scan-read answers "what's rotting?"
5. **Surface the weekly intention** (already auto-saved in `weekly_reviews`) as a one-line banner when set — it makes the week's theme ambient instead of buried in the calendar week view.

## Project Page Improvements

Current state: strong bones — stages checklist with per-stage %, bottleneck editor, next-action editor, todos with optimistic UI, markdown notes, audio versions with waveforms, ALS path copy.

1. **Lead with "what's next," not metadata.** The header spends its space on cover/genre/created-date; the primary action and current bottleneck are below the fold inside a tab. Put *current stage → primary action → Start session* as the first visual block.
2. **Desktop tabs vs. mobile scroll is an unjustified asymmetry.** Mobile's single scroll view is arguably the better design; consider collapsing desktop's Overview/Notes/Versions/History tabs into one scannable column with anchors. At minimum, remove the permanently disabled "Files (soon)" tab (`src/app/tracks/[id]/page.tsx:166`) — disabled promises erode trust.
3. **Show session history per track.** The History tab shows completed todos only; the track's sessions (durations, activity mix, progress-impact ratings) are the real story of the track and are currently invisible here.
4. **Bottleneck history matters.** `bottlenecks` keeps resolved rows with categories and timestamps, but the editor shows only the active one. "This track has had 3 mixing bottlenecks" is exactly the insight a finishing coach would surface.
5. **Consolidate the two edit-metadata entry points** (cover overlay + button both → `/tracks/[id]/edit`).
6. **Stage → suggested-action mapping.** When the current stage is Mixing and there's no primary action, offer stage-appropriate prompts ("Do a gain-staging pass", "Bounce and compare against reference"). Cheap, and makes the app feel like it understands production.

## Focus Session Improvements

Current state: dual system — ad-hoc timer (`FocusRunner` + `FocusSessionProvider`, sessionStorage-backed) and calendar-planned sessions (DB rows, templates, recurrences) — cleanly integrated at the data layer. The post-session logging page is thoughtful but heavy.

1. **Make logging effort proportional to session length.** Under ~20 minutes: one screen — "What did you mostly do?" (one activity tap), optional one-line note, save. Full 9-activity allocation becomes an "Add detail" expansion. The current flow taxes exactly the quick sessions that build momentum.
2. **Unify outcome capture between the two completion paths.** Energy rating and improved/still-broken exist only in `SessionCompleteDialog` (calendar); the focus log lacks them. Either add them to `SessionLogPage` or — better, given the friction point above — cut energy and improved/still-broken entirely and keep one progress-impact rating + notes. Decide once; the asymmetry is the worst option.
3. **Validate `requires_track` in the focus runner.** The calendar plan dialog enforces it; `/focus/new` doesn't, so a track-required session type can start trackless.
4. **Suggest a session goal at start.** The runner already pulls the primary action; promote it to an explicit "This session: <primary action>" commitment with a checkbox at the end ("Did you get there?"). A session with a declared goal is a different psychological event than an open timer.
5. **Let focus sessions start from a template** — `instantiateTemplate()` exists but is reachable only via calendar pre-planning.
6. **Mobile: the 9-card activity grid requires heavy scrolling** (`session-log-page.tsx`, 3-col grid in a `max-w-md` container). The one-tap preset from item 1 mostly solves this.

## Progress Tracking Improvements

1. **Answer "what changed this week?"** Nothing currently does. A weekly delta view — sessions logged, stage % moved per track, todos closed, bottlenecks resolved — belongs on the dashboard or as the reflection prompt's preamble. All inputs already exist in `sessions`, `track_stages`, `actions`, `bottlenecks`.
2. **Use the data the user already gives you.** Progress-impact ratings (never displayed), per-activity notes (never displayed), activity-minute allocations (never aggregated per track). A per-track "time by activity" bar and an impact-over-time sparkline make every logged session visibly accumulate into something.
3. **Stage-change history.** `track_stages` stores only current state; consider an audit of stage % changes (or derive movement from session-adjacent snapshots) so "this track moved 15% this month" is answerable.
4. **Analytics is good but disconnected** — completion rate, sessions/week, top bottleneck, and the heatmap are solid; link them back to action (top bottleneck → "3 tracks currently stuck on mixing → view them").

## Motivation & Behavioral Design Improvements

1. **Completion ritual (highest leverage).** When the last stage hits 100%: full-screen moment, mark completed, prompt to promote one backlog track into the freed slot. This single feature operationalizes the entire "Finish Five" premise — finishing creates the *only* way to start something new.
2. **Streaks, gently.** The heatmap already computes a longest streak; surface current-week consistency on the dashboard. Avoid guilt mechanics (no broken-streak shaming) — show "3 sessions this week" not "you missed Tuesday."
3. **Perfectionism countermeasures.** Bottleneck age is the proxy for tweaking-in-circles: a track with high session count, high progress, and an old mixing bottleneck should get a nudge — "You've logged 6 mixing sessions on this. Ship a version and move to mastering?" Version uploads are a natural "good enough, bounced it" checkpoint to encourage.
4. **Session goal + outcome check** (see Focus item 4) — implementation intentions are the best-evidenced cheap intervention in this space.
5. **Make the weekly review a loop, not a journal.** Monday: intention prompt referencing last week's reflection. Friday: reflection prompt pre-filled with the week's actual numbers (sessions, stage movement). Currently both are blank textareas on a calendar sub-view.
6. **Reframe the empty backlog promise.** The five-slot cap is enforced server-side on activation (good); pair the cap-hit error with the motivating frame: "Finish or shelve one of your five to open a slot."

## Mobile UX Improvements

1. **Recommendation parity (covered above)** — the dashboard hero solves this since the dashboard is responsive.
2. **Fix the 8-action revalidation gap** — this is the mobile bug with the widest blast radius.
3. **Session log on mobile**: one-tap activity preset; the current grid is the worst mobile screen in the app.
4. **Update CLAUDE.md's parity-gap snapshot** — it claims mobile lacks audio version upload, but `/m/[trackId]` renders the full `AudioVersionList` with upload (line 147). Stale docs cause reviewers to enforce the wrong rules.
5. **`VersionItem` tap targets** sit small buttons beside a waveform; spread controls on mobile.
6. **Timezone handling is naive `new Date()` throughout** — fine for single-user V1, worth a note before any deploy-for-others step.

---

## Feature Audit

### Keep
- **Five-active-track cap** (server-enforced on activation) — the product's soul.
- **Stages / bottleneck / primary-action / todos model** on track pages — correct, producer-shaped data model with partial unique indexes enforcing "one active bottleneck, one open primary action."
- **Focus runner + floating bar** — multi-tab guard, sessionStorage persistence; solid.
- **Calendar planning stack** (types, templates, recurrences, weekly intention) — genuinely differentiated; just under-surfaced.
- **Analytics heatmap + completion rate** — keep, then wire to action.
- **Albums** — clean grouping with sensible fresh-install fallback.

### Improve
- **Recommendation engine** — fix momentum input, fix reason attribution, add staleness-of-bottleneck and "almost done" boost, surface it everywhere.
- **Session outcome capture** — one unified, lighter schema (see Focus #2).
- **Weekly reviews** — keep the data model, move the prompts into the daily surface.
- **Manual session dialog** — fine concept; can't capture activity breakdown, so backfilled sessions are second-class.
- **Samples** — works (File System Access API + IndexedDB handles); needs a graceful unsupported-browser fallback.
- **Error handling** — adopt the existing toast component app-wide.

### Remove
- **Templates page (as-is)** — 14 hardcoded items, hardcoded `/Users/producer/...` paths, "coming soon" create/import. Either rebuild DB-backed or pull from nav; a polished fake feature costs trust and maintenance.
- **Library's 45 hardcoded seed items** (`src/lib/data/library-items.ts`) mixed into the real instruments DB — confusing data provenance; keep the DB-backed instruments, drop the fixtures.
- **Resources seed/fallback fake content** (`SEED_FEATURED_RESOURCES` etc.) — show an honest empty state instead.
- **Dead code:** `suggestFocusTrack` (`src/lib/focus.ts`) and `RecommendationCard` *if* not adopted by the dashboard hero; the disabled "Files (soon)" tab; `energy_rating` if the unified capture drops it.

### Expand
- **Bottleneck system** → history per track, age-based stuck detection, category trends already in analytics — this is the app's best raw material for "production bottleneck detection."
- **The finish line** → export/release stage, done-checklist, completion ritual, simple release planning per album.
- **Per-track session intelligence** → time-by-activity, impact trends, "this track responds best to morning arrangement sessions"-grade insights later.

---

## Code Quality Findings

**Overall: unusually clean.** No `any` in signatures, no `@ts-ignore`, zero TODO/FIXME comments, no orphaned components beyond the two named, consistent Zod + throw-on-error server actions, correct React 19 `useOptimistic` usage.

Issues, in priority order:

1. **Revalidation contract violations (8 functions):** `stages.ts:23,41`, `bottlenecks.ts:37,49`, `actions.ts:45,56`, `versions.ts:29,49` revalidate `/tracks/[id]` but not `/m/[trackId]` (and mostly not `/focus/[trackId]`). `track-todos.ts:7-13` is the compliant pattern. Worth extracting a shared `revalidateTrackSurfaces(trackId)` helper so this bug class can't recur.
2. **Dead code:** `src/lib/focus.ts` (`suggestFocusTrack`), `src/components/recommendation-card.tsx` — never imported.
3. **Recommendation bugs:** momentum never supplied (`sidebar-focus-panel.tsx:14`); contradictory reason attribution (`recommend.ts:51-56`).
4. **Storage leaks:** cover-image remove/replace never deletes the old object (`cover-image-upload.tsx`); audit `track-images` bucket usage.
5. **Migration hygiene:** duplicate number — `0012_albums_disable_rls.sql` and `0012_track_focus.sql`.
6. **No tests, no test infra.** Acceptable for V1; the scoring logic, `progressFromStages`, and the revalidation contract are the three things worth a tiny vitest suite before further investment.
7. **Hardcoded datasets posing as features:** `library-items.ts` (45 items), `templates.ts` (14 items), resources seed content — these are the closest thing the repo has to tech debt.
8. **Large components** (`add-resource-dialog.tsx` 470 lines, `session-complete-dialog.tsx` 381, `samples-workspace.tsx` 360, `track-card.tsx` 349) — not urgent; split when next touched.
9. **`src/components/mobile/` naming** — already flagged in CLAUDE.md as a follow-up; also update the stale parity-gap note there (audio upload gap is closed).
10. **Security posture (documented, but flag before any public deploy):** RLS intentionally off, anon key has full access, `OWNER_ID` falls back to a hardcoded UUID (`src/lib/owner.ts`). Fine for single-user; a hard blocker for anything multi-user or publicly hosted.

---

## Future Product Opportunities

### Quick Wins
- Dashboard "Next Up" hero (reuse dead component).
- Stuck badges from existing `last_worked_at` + bottleneck age.
- Weekly delta summary ("This week: 4 sessions, +12% across 3 tracks").
- Stage-aware suggested actions when no primary action is set.
- Completion ritual + open-slot promotion prompt.

### Medium Effort
- Unified, friction-scaled session logging.
- Per-track session intelligence (activity mix, impact trend, surfaced activity notes).
- Bottleneck history + detection ("3 tracks stuck on mixing — schedule a mixing block?" linking straight into calendar planning, which already exists).
- Release checklist per track (export settings, metadata, loudness check, artwork) as the 6th stage's content.
- Reference-track workflow: attach a reference per track, A/B against uploaded versions (wavesurfer is already in the stack).

### Strategic Bets
- **Finishability score & coach:** combine progress, momentum, bottleneck age, and session-impact history into a per-track "likely to finish" signal with one recommended intervention. This is the existing recommendation engine grown up — not a new system.
- **Session recommendations:** "You make the most progress in 45-min morning arrangement sessions" — the `session_activities` + ratings data already supports this once there's volume.
- **Release planning:** album-level target date flowing down to per-track pacing ("to release in March, finish one track every 3 weeks").
- **AI production coach** (only after the loops above exist): weekly review co-pilot that reads the week's real data and drafts the reflection/intention.

---

## Suggested Product Vision

If rebuilt from scratch today, MVP-sized:

**One daily loop, one weekly loop, one finish line.**

- **Daily:** open the app → one recommended track with one action and one button. Work. Stop. Log in ≤3 taps. See the track's progress visibly move.
- **Weekly:** Monday intention (seeded from last week's reflection), Friday reflection (pre-filled with the week's actual numbers). One glance shows what moved, what's stuck, and the one intervention for next week.
- **Finish line:** five slots, hard cap. A track exits only through Released (checklist + ritual) or Shelved (honest, reversible). Finishing is the only way to start.

Everything in the current app either feeds those three loops (stages, bottlenecks, sessions, calendar, analytics) or it doesn't (hardcoded templates, seed library items, fake resources). The vision is the current app with the wires connected and the dead weight cut — not a different product.

## Suggested Roadmap

### Phase 1: Eliminate Friction (bug-fix + wiring, ~days)
1. Pass real 7-day session counts into `recommendTrack`; fix reason attribution.
2. Add `/m/[trackId]` (+ `/focus/[trackId]`) revalidation to the 8 non-compliant actions via a shared helper.
3. Dashboard "Next Up" hero on both breakpoints; regroup track list into In Motion / Needs Attention.
4. Staleness badges on track cards; `/tracks` sorting options.
5. Toast-based error handling replacing `alert()`.
6. Housekeeping: stale CLAUDE.md parity note, duplicate migration number, remove disabled Files tab, delete dead `suggestFocusTrack`.

### Phase 2: Increase Momentum
1. Friction-scaled session logging (one-tap activity preset; ratings optional); unify the two completion schemas.
2. Weekly delta summary + dashboard-surfaced intention/reflection prompts.
3. Per-track session history on the track page (time by activity, impact trend, activity notes finally displayed).
4. Session goal commitment + outcome check in the focus runner; `requires_track` validation; start-from-template.
5. Minimal vitest suite for `recommend.ts`, `progressFromStages`, revalidation helper.

### Phase 3: Drive Completion
1. Export/Release stage (migration + seed-trigger update) with a release checklist.
2. Completion ritual + backlog-promotion flow on track completion.
3. Bottleneck history, age-based stuck detection, and the perfectionism nudge.
4. Remove/rebuild decision executed for Templates, seed Library items, and Resources seed content.

### Phase 4: Become the Producer Operating System
1. Finishability score unifying progress/momentum/stuck signals; one recommended intervention per track.
2. Reference-track A/B workflow on versions.
3. Album-level release planning with per-track pacing.
4. Session-pattern insights; optional AI weekly-review co-pilot.

---

## Recommended First Implementation Prompt

> **Finish Five — Phase 1: Wire up the recommendation brain and fix mobile staleness.** Do not add new features beyond what's listed; run `pnpm typecheck && pnpm lint` before committing.
>
> 1. **Fix the momentum input.** Add a data fetcher (e.g., `getSessionCountsByTrackSince(days)` in `src/lib/data/sessions.ts`) returning a `Map<trackId, count>` of completed sessions in the last 7 days. Pass it to `recommendTrack()` in `src/components/sidebar-focus-panel.tsx`. In `src/lib/recommend.ts`, fix the reason-attribution list so "Hasn't been touched in a while" cannot be reported as the reason when staleness reduced the score, and remove the misleading `-1` sentinel on the bottleneck row.
> 2. **Fix the revalidation contract.** Create `revalidateTrackSurfaces(trackId)` (revalidates `/`, `/tracks/[id]`, `/m/[trackId]`, `/focus/[trackId]`, `/calendar`, `/sessions` — match the existing pattern in `src/app/actions/track-todos.ts`). Use it in all eight non-compliant mutations in `src/app/actions/stages.ts`, `bottlenecks.ts`, `actions.ts`, and `versions.ts`, and refactor `track-todos.ts` to use it too.
> 3. **Dashboard "Next Up" hero.** In `src/app/page.tsx`, above the stats row, render the top recommendation (adapt the currently-unused `src/components/recommendation-card.tsx`): track name + cover, primary action (or "Set a next action" link to the track page), reason badge, and a Start Focus Session button linking to `/focus/[trackId]`. It must work on both mobile and desktop breakpoints (the dashboard is a single responsive surface — no UA sniffing). Keep the sidebar panel but have it use the same fetched data.
> 4. **Triage grouping + staleness.** Replace the progress-desc sort in `page.tsx` with three labeled groups: the Next Up track (excluded from lists), "In motion" (worked within 7 days, by progress desc), and "Needs attention" (last_worked_at > 7 days ago or no sessions yet, stalest first). In `src/components/track-card.tsx`, render the last-worked label in the warning color with a "stale" hint when > 7 days.
> 5. **Toasts over alerts.** Promote the toast in `src/components/library/toast.tsx` to a shared `src/components/` location and replace every `alert(...)` error fallback in `track-todo-list.tsx`, `track-todo-history.tsx`, `next-action-editor.tsx`, `bottleneck-editor.tsx`, `notes-editor.tsx`, `stages-checklist.tsx`, `audio-version-list.tsx`, and `version-item.tsx`.
> 6. **Housekeeping.** Delete `src/lib/focus.ts` (unused). Remove the disabled "Files (soon)" tab from `src/app/tracks/[id]/page.tsx`. Update CLAUDE.md's parity-gap snapshot (mobile audio upload gap is closed). Renumber `supabase/migrations/0012_track_focus.sql` to resolve the duplicate prefix, only if it has not been applied to the production database — otherwise document the duplication in the README instead.
