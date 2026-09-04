/**
 * What `tracks.last_worked_at` should be, given the sessions a track still has.
 *
 * The column has exactly one writer in the database: the `bump_track_last_worked`
 * trigger (migration 0001, taught to skip track-less rows in 0005), and it fires
 * on **insert only**. That is fine while sessions are append-only, but a session
 * can now be edited or deleted, and both move the answer backwards — which a
 * `greatest(last_worked_at, new.ended_at)` bump can never do. So the two write
 * paths in `src/app/actions/sessions.ts` recompute the value here instead of
 * nudging it.
 *
 * The rule: **the latest `ended_at` among the rows the track still has, or null
 * when it has none.** No other writer exists to respect — nothing in the app
 * assigns `last_worked_at`, and no migration backfills it — so the recomputed
 * value is simply what the trigger would have arrived at had it seen this set of
 * rows from the start.
 *
 * Two deliberate choices:
 *
 * - **Status is not filtered.** The trigger does not look at `sessions.status`
 *   either, so filtering here (to `completed`, say) would make an edit quietly
 *   disagree with an insert. Any row carrying an `ended_at` counts.
 * - **Rows with no `ended_at` are skipped rather than treated as "now".** A
 *   planned session (0009 made `ended_at` nullable) has not been worked yet.
 *
 * `tracks.started_at` is left alone on purpose: 0005 sets it once, from the
 * first session, and then never overwrites it precisely so the user can edit it
 * by hand. Recomputing it here would take that back.
 */
export type SessionEnd = { ended_at?: string | null };

export function lastWorkedAtFrom(sessions: SessionEnd[]): string | null {
  let latestMs = Number.NEGATIVE_INFINITY;
  let latest: string | null = null;

  for (const session of sessions) {
    const endedAt = session.ended_at;
    if (!endedAt) continue;
    const ms = new Date(endedAt).getTime();
    // An unparseable timestamp is not a later one. Comparing NaN would just
    // return false, but skipping says why.
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      // The stored string, not a re-serialized one: the column is a
      // timestamptz and there is no reason for a round trip to rewrite it.
      latest = endedAt;
    }
  }

  return latest;
}
