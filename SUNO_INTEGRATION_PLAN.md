# Suno ↔ Finish Five — Workflow Assessment & Integration Plan

**Date:** 2026-08-13
**Scope:** Assessment of Suno's current capabilities and this codebase, plus a concrete, phased plan for three requested workflows (version → variations, section → call-and-response, new idea creation) and additional finishing-focused workflows. No changes implemented; this is the design doc.

---

## Executive Summary

The single most important fact shaping this design: **Suno has no official public API as of August 2026.** An official developer API is in an exploratory intake phase (announced July 2026), and third-party wrappers exist but are unofficial resellers with ToS risk. So the right build today is not an "integration" — it is a **round-trip workflow**: the dashboard owns *intent* (why you're going to Suno), *provenance* (what came back and where it came from), *review* (keep/reject fast), and *guardrails* (Suno generates infinite options; Finish Five exists to finish). The Suno step itself stays manual in the browser — which is genuinely fine, because a well-built round-trip removes ~90% of the friction (prompt assembly, file naming, "where did I put that clip," "which bounce was this a variation of," "did I ever review these").

Design everything so that when the official API ships, automation drops into slots that already exist (`external_job_id` columns, a first `src/app/api/` route) rather than forcing a rework.

The codebase is well-positioned: strong task/session/bottleneck machinery, a recommendation engine, a private `track-audio` bucket, and a hard parity rule between `/tracks/[id]` and `/m/[trackId]`. The gaps are specific and buildable:

1. `track_versions` has **no provenance** (only label, path, duration) — generated audio would be an undifferentiated pile.
2. There is **no section/arrangement concept** anywhere — required for workflow 2.
3. There are **no API routes and no server-side upload path** — everything is browser → Storage with the anon key.
4. There is **no review/triage surface** — nothing distinguishes "new, needs a listen" from "keeper" from "rejected."

---

## Part 1 — Suno Capability Assessment (what matters for these workflows)

| Capability | What it does | Relevance | Tier notes |
|---|---|---|---|
| **Upload Audio** | Upload your own audio; up to 8 min on Pro/Premier (60s on free) | Entry point for *every* round-trip workflow | Pro or Premier required for full bounces |
| **Cover** | Re-imagines an uploaded/generated track in a new style while keeping melody/structure | Workflow 1 (variations) — this is the core primitive | Any paid tier |
| **Extend** | Continues a track from a chosen point | Workflow 2 (call-and-response) — upload your 8-bar "call," let Suno "answer" | Any paid tier |
| **Personas / Voices** | Captures the vocal style/vibe of a track as a reusable element; Voices can capture your own voice | Scratch vocals / topline workflow (Part 4) | Paid tiers |
| **Studio** | Browser multitrack timeline: split into up to 12 time-aligned stems, Stem Covers (rework one stem), Replace Section (regenerate only a weak region), reorder/rewrite sections, export full mix / ranges / stem WAVs / MIDI-from-stems | Stem-swap bottleneck breaker, MIDI extraction, precise section work | Premier ($24/mo, 10k credits); stem→MIDI ≈10 credits/stem; section edits cost proportional to length |
| **API** | None official. Intake form for early-access developer API opened July 2026. Third-party resellers ($0.014–$0.111/song) are unofficial | Automation is Phase 4, not Phase 1. Recommend applying to the official intake now; avoid resellers | — |

**Practical implication:** every workflow below reduces to the same loop — *dashboard prepares intent + files → user does 2–5 minutes in Suno → user drags results back → dashboard files, links, and schedules the review.* Optimize that loop.

## Part 2 — Codebase Assessment (what we build on)

**Assets:**
- `track_versions` + `track-audio` bucket + `AudioVersionList`/`VersionItem` (wavesurfer playback, signed URLs) — the natural home for generated audio.
- `actions` (todos + one primary "next action"), `bottlenecks` (one active per track), `sessions` + `session_activities` — the tracking machinery the user asked for already exists; Suno work should flow *into* it, not beside it.
- Track metadata that seeds prompts for free: `tags` (genre), `song_key`, `bpm`, `notes`, active bottleneck description.
- `recommendTrack()` + NextUpCard + stale/"needs attention" triage — the right place to surface "you have unreviewed variations."
- Conventions that constrain the design: parity rule (one component, `variant` prop), `revalidateTrackSurfaces()` on every track-level mutation, Zod in every server action.

**Gaps (each is a deliverable below):** version provenance/lineage; sections; review states; a server-side ingest path; any Suno-specific UI.

---

## Part 3 — Shared Infrastructure (build once, powers all workflows)

### 3.1 Schema: version provenance + experiments

```sql
-- 00XX_suno_experiments.sql

alter table track_versions
  add column kind text not null default 'bounce'
    check (kind in ('bounce','suno_variation','suno_response','suno_idea','stem','section_export','reference')),
  add column source text not null default 'upload'
    check (source in ('ableton','suno','upload')),
  add column parent_version_id uuid references track_versions(id) on delete set null,
  add column review_status text not null default 'none'
    check (review_status in ('none','inbox','keeper','rejected')),
  add column notes text,
  add column suno_url text;      -- link back to the clip on suno.com

create table suno_experiments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  track_id uuid references tracks(id) on delete cascade,   -- nullable: new-idea experiments pre-date the track
  source_version_id uuid references track_versions(id) on delete set null,
  section_id uuid,                                          -- FK added in the sections migration
  bottleneck_id uuid references bottlenecks(id) on delete set null,
  experiment_type text not null
    check (experiment_type in ('variation','call_response','new_idea','stem_swap','vocal_topline','midi_extract')),
  goal text not null,            -- "find a darker chorus texture" — forces intent before generating
  prompt text,                   -- the style/lyrics prompt actually pasted into Suno
  status text not null default 'open'
    check (status in ('open','reviewing','done','abandoned')),
  action_id uuid references actions(id) on delete set null, -- the auto-created review todo
  external_job_id text,          -- null today; slot for the official API later
  outcome_note text,             -- "kept the pluck idea, recreated in Serum" — closes the learning loop
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
```

`parent_version_id` gives lineage (v7 bounce → its 4 variations render nested under it). `goal` is deliberately `not null`: writing one sentence of intent before opening Suno is the cheapest anti-rabbit-hole guardrail that exists.

### 3.2 The Suno panel (one component, both surfaces)

`src/components/suno-panel.tsx` with `variant: "desktop" | "mobile"`, rendered as a card on the Overview tab of `/tracks/[id]` and a section of `/m/[trackId]`. Three zones:

1. **Open experiment** (mirror of the bottleneck pattern — *one open experiment per track*, enforced with a partial unique index): goal, type, prompt with a copy button, "Open Suno" link, drop zone for results.
2. **Inbox**: versions with `review_status='inbox'`, each with the wavesurfer player, an **A/B toggle against `parent_version_id`**, and two buttons: Keep / Reject. Keeping prompts an optional one-line note and can spawn a todo ("Recreate the brass stab from variation 2 in Ableton").
3. **Start a round-trip**: buttons for the workflow types, pre-filtered by context (a version row offers "Get variations"; the section list offers "Call & response").

### 3.3 Prompt builder

`src/lib/suno-prompt.ts` — pure function, unit-testable like `recommend.ts`:

```
buildSunoPrompt({track, experiment}) →
  "[genre from tags[0]] track, [bpm] BPM, key of [song_key], [mood words from goal].
   [experiment-type-specific suffix]"
```

Copy-to-clipboard in the panel. This alone kills the blank-prompt problem and makes generations consistent with the track's actual metadata.

### 3.4 Ingest: where files live

- **Bucket:** keep everything in the existing private `track-audio` bucket. Convention: `{trackId}/suno/{experimentId}/{originalFilename}` (idea-pool clips before a track exists: `ideas/{experimentId}/...`). No new bucket, no new policies.
- **Upload path:** reuse the existing browser-side upload (drag-drop onto the panel) → `addVersionRecord` extended to accept `kind`, `parentVersionId`, `experimentId`, `sunoUrl`, `reviewStatus:'inbox'`. Server-side ingest (fetching from a URL) waits for Phase 4 when there's an API to fetch from.
- **Local disk (documented convention, not code):** Suno downloads go to `~/Music/Suno Inbox/`, *never* into the Ableton project folder. Only keepers get dragged into the project's `Samples/Imported/Suno/` folder. This keeps AI reference material from polluting projects and makes "collect all and save" clean.

### 3.5 Tracking: tasks, sessions, focus

- Opening an experiment auto-creates an `actions` row: *"Review Suno results: {goal}"*, `category: 'suno'`, `estimated_minutes: 15`. It flows into the existing todo list, the "~Xh left" chip, and weekly "tasks done" stats for free.
- Add `suno_ideation` to `session_activities.activity_key` (and `production-activities.ts`) so time in Suno is visible in the Progress analytics rather than invisible.
- NextUpCard nudge: if the recommended track has inbox items, the reason line becomes *"3 unreviewed Suno variations waiting"* — reviews are momentum-friendly 10-minute sessions, ideal for the stale-track re-entry problem.

---

## Part 4 — The Three Requested Workflows

### Workflow 1 — Export a version → Suno variations

*Suno primitive: Upload + Cover.*

1. On any version row: **"Get variations"** → dialog asks for the goal ("darker drop", "what would this sound like as garage?") → creates the experiment, builds the prompt, copies it, shows the checklist: download this bounce (signed URL button) → upload to Suno → run Cover 2–4× → download → drop here.
2. Dropped files land as `kind:'suno_variation'`, `parent_version_id` = the source bounce, `review_status:'inbox'`.
3. Review in the panel with A/B against the parent. Keep ≤1 (soft-enforced: keeping a second asks "replace current keeper?"). Keeper → optional todo + `outcome_note` → experiment `done`.

**Effort:** the flagship workflow; mostly Part 3 infrastructure + one dialog. ~Medium.

### Workflow 2 — Export sections → call-and-response ideas

*Suno primitive: Upload + Extend (upload the "call," Suno generates the "answer"). Studio Replace Section is the precision alternative.*

Requires the first section concept in the app:

```sql
create table track_sections (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  version_id uuid references track_versions(id) on delete set null, -- which bounce the timestamps refer to
  name text not null,             -- "Verse 2", "Drop 1"
  start_seconds numeric not null,
  end_seconds numeric not null,
  sort_order int not null default 0
);
```

- **MVP (recommended):** *don't* build in-browser audio trimming. You are already in Ableton — loop-brace-exporting an 8-bar section is a 10-second operation there. The dashboard's job is the part Ableton can't do: mark the section on the version's waveform (wavesurfer regions plugin — drag to select, name it), store the timestamps, and run the same round-trip loop with `experiment_type:'call_response'` and `kind:'suno_response'` results linked to the section. The section markers also become durable arrangement metadata the app has never had — useful far beyond Suno ("bottleneck: Drop 1", per-section todos later).
- **Stretch:** client-side trim via WebAudio (decode → slice → encode WAV → upload as `kind:'section_export'`), giving a one-click "download just this section to feed Suno." Nice, not necessary.

**Effort:** Medium (regions UI) + the stretch trim is Medium on its own. Ship MVP first.

### Workflow 3 — New idea creation

*Suno primitive: plain generation from a prompt (optionally seeded by a hum/voice-memo upload).*

- **Idea pool page** (`/ideas`, plus a dashboard entry point): experiments with `track_id: null`, `experiment_type:'new_idea'`. Seed form: genre, key, BPM, mood words → prompt builder → generate in Suno → drop 1–3 favorites into the pool.
- Each pooled idea has exactly three exits, and the UI should make sitting in the pool feel temporary:
  1. **Promote → track**: calls `createTrack` with the seed metadata (tags/key/bpm), status `backlog` (respecting the 5-active cap), the clip becomes version 1 (`kind:'suno_idea'`), stage stays `idea`, and starter todos are created: "Recreate chords in Ableton", "Replace drums with your own". The Suno clip is a *reference demo to beat*, not the track.
  2. **Archive** (experiment `abandoned`, note optional).
  3. **Expire**: pool items untouched for 14 days get flagged in the same "Needs attention" spirit as stale tracks — triage or lose them.

**Effort:** Medium. The promote-to-track action is the only new mutation; everything else is Part 3.

---

## Part 5 — Additional Workflows (the improved request)

These map Suno primitives onto the app's *existing* finishing concepts — bottlenecks, stages, reflection — which is where the real acceleration is:

1. **Stem-swap bottleneck breaker** (`experiment_type:'stem_swap'`; needs Premier/Studio). When a track's active bottleneck is `sound_design` or `mixing`, the bottleneck editor offers: *"Try a stem swap: upload the bounce to Studio, split stems, Stem-Cover only the problem layer, bring back the WAV as a reference."* Result links to `bottleneck_id`; resolving the bottleneck records what worked in `outcome_note`. This turns Suno into a targeted unsticking tool instead of a toy.
2. **Scratch vocals / topline sketching** (`experiment_type:'vocal_topline'`). Upload the instrumental bounce, use Cover/Personas (or your own Voice) to get a disposable topline. Purpose: unblock *arrangement* decisions ("does this section want a vocal?") without booking a vocalist. Keeper toplines become todos ("write real lyrics for hook melody"), not final audio.
3. **MIDI extraction** (`experiment_type:'midi_extract'`; Studio, ~10 credits/stem). When a variation's chords or melody are the keeper element, pull stem→MIDI in Studio and drag the `.mid` into Ableton — recreating in your own sounds is faster and keeps the release fully yours. Store the `.mid`? No — MIDI goes straight into the Ableton project; the dashboard just tracks the experiment + outcome note.
4. **Reference-cover ear training** (fits `experiment_type:'variation'`). Cover your rough demo into 3 wildly different genres and A/B them in the inbox purely to *hear your own arrangement with fresh ears* — a known trick for breaking demo-itis. Cheap because it's just Workflow 1 with a different goal sentence.

### Guardrails (this is a finishing app)

- **One open experiment per track** (partial unique index, same pattern as bottlenecks/primary action). Suno's failure mode is infinite optionality; the cap forces close-before-open.
- **Goal required before prompt.** No aimless generation sessions.
- **Keep ≤1 per experiment**, rejected items get their storage objects deleted on experiment close (keep rows for history, drop the audio — storage hygiene).
- **Inbox aging** feeds the existing "Needs attention" triage; an inbox item is a commitment to listen, not a collection.
- **Suno time is logged time**: the `suno_ideation` activity key means the Progress page will tell you honestly if ideation is eating finishing time.

---

## Part 6 — Phased Roadmap

| Phase | Contents | Effort |
|---|---|---|
| **1. Provenance + round-trip core** | Migration (3.1), extended `addVersionRecord`, SunoPanel (both variants), prompt builder + tests, Workflow 1 end-to-end, review todo auto-creation, `suno_ideation` activity key | ~3–4 focused sessions |
| **2. Sections + call-and-response** | `track_sections`, wavesurfer regions UI on VersionItem, Workflow 2 MVP | ~2–3 sessions |
| **3. Idea pool** | `/ideas` page, promote-to-track action, expiry nudges, NextUpCard inbox nudge | ~2 sessions |
| **4. Automation (blocked on Suno)** | Apply to the official API intake **now**; when access lands: first `src/app/api/suno/` route handler, server-side fetch-and-store into the bucket, `external_job_id` wiring, possibly auto-cover on new bounce upload | Unknown; design already slotted |
| **Stretch** | In-browser section trim (WebAudio), stem-swap prompt in BottleneckEditor, per-section todos | opportunistic |

**Non-goals:** third-party Suno API resellers (ToS + reliability risk for a personal tool that works fine manually); storing Suno stems/MIDI long-term in the dashboard (Ableton is the home for working material — the dashboard stores *decisions and references*); any scraping of suno.com.

Every UI piece above is subject to the parity rule (one component, `variant` prop, land on both routes in the same PR) and every mutation calls `revalidateTrackSurfaces`.

---

## Sources

- [Suno — official site](https://suno.com/)
- [Suno help: How to Use Audio Uploads](https://help.suno.com/en/articles/6141569) · [What does Upload Audio do?](https://help.suno.com/en/articles/2477633)
- [Suno help: Introduction to Studio](https://help.suno.com/en/articles/7940161)
- [Suno adds advanced track editing, stem separation, and full song uploads — AlternativeTo](https://alternativeto.net/news/2025/6/suno-adds-advanced-track-editing-stem-separation-and-full-songs-uploads)
- [Suno explores developer API — Music Business Worldwide](https://www.musicbusinessworldwide.com/suno-explores-developer-api-seeking-apps-that-unlock-experiences-generative-music-makes-possible-for-the-first-time/)
- [Suno is opening an API partner program — Digital Music News](https://www.digitalmusicnews.com/2026/07/03/suno-is-opening-an-api-partner-program/)
- [Suno Studio guide — Jack Righteous](https://jackrighteous.com/en-us/blogs/guides-using-suno-ai-music-creation/suno-studio-v5-complete-guide) · [Suno Studio review — Undetectr](https://undetectr.com/blog/suno-studio-review)
- [Suno review 2026 — eesel](https://www.eesel.ai/blog/suno-review)
