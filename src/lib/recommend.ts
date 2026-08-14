import { MAX_CANDIDATES_PER_EXPERIMENT } from "@/lib/suno";
import type { TrackWithDetails } from "@/lib/types";
import { progressFromStages } from "@/lib/types";

export type Recommendation = {
  track: TrackWithDetails;
  primaryAction: TrackWithDetails["primaryAction"];
  reason: string;
  score: number;
};

const WEIGHTS = {
  progress: 0.45,
  momentum: 0.3,
  freshness: 0.15, // 1 - staleness
  bottleneck: -0.1,
  // Suno round-trip nudges: unreviewed variations are momentum-friendly
  // ten-minute wins, and a selected keeper is one step from a finished
  // decision. Both are 0 for tracks without an open experiment.
  sunoReview: 0.12,
  sunoIntegrate: 0.1,
};

const HORIZON_DAYS = 14;

function daysSince(iso: string | null | undefined): number {
  if (!iso) return HORIZON_DAYS;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, ms / 86_400_000);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function recommendTrack(
  tracks: TrackWithDetails[],
  sessionsByTrackLast7?: Map<string, number>,
): Recommendation | null {
  if (tracks.length === 0) return null;

  const ranked = tracks.map((t) => {
    const progress = progressFromStages(t.stages) / 100;
    const momentum = clamp01(
      (sessionsByTrackLast7?.get(t.id) ?? 0) / 5,
    );
    const staleness = clamp01(daysSince(t.last_worked_at) / HORIZON_DAYS);
    const freshness = 1 - staleness;
    const hasBottleneck = t.bottleneck ? 1 : 0;
    // Optional chaining: test factories build partial tracks via `as` casts.
    const suno = t.sunoExperiment ?? null;
    const sunoUnreviewed = suno?.unreviewedCount ?? 0;
    const sunoReview = clamp01(sunoUnreviewed / MAX_CANDIDATES_PER_EXPERIMENT);
    const sunoIntegrate = suno?.status === "selected" ? 1 : 0;

    const score =
      WEIGHTS.progress * progress +
      WEIGHTS.momentum * momentum +
      WEIGHTS.freshness * freshness +
      WEIGHTS.bottleneck * hasBottleneck +
      WEIGHTS.sunoReview * sunoReview +
      WEIGHTS.sunoIntegrate * sunoIntegrate;

    // Reason attribution: every candidate mirrors a positive contributor to
    // the actual score, so the badge can never claim a quality (e.g.
    // staleness) that the score penalizes.
    const contribs: Array<[string, number]> = [
      ["Closest to done", WEIGHTS.progress * progress],
      ["High momentum", WEIGHTS.momentum * momentum],
      ["Fresh in your mind", WEIGHTS.freshness * freshness],
      [
        "Quick win — no active bottleneck",
        hasBottleneck ? -Infinity : -WEIGHTS.bottleneck,
      ],
    ];
    const [topContrib] = contribs.sort((a, b) => b[1] - a[1])[0];

    // Pending Suno work takes precedence as the displayed reason (it is the
    // most actionable next step and always a positive score contributor via
    // the suno terms above); unreviewed candidates outrank an unintegrated
    // keeper because reviewing unblocks integrating.
    const reason =
      sunoReview > 0
        ? `${sunoUnreviewed} Suno variation${sunoUnreviewed === 1 ? "" : "s"} waiting for review`
        : sunoIntegrate > 0
          ? "Selected Suno idea ready to integrate"
          : topContrib;

    return {
      track: t,
      primaryAction: t.primaryAction,
      reason,
      score,
    } satisfies Recommendation;
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked[0] ?? null;
}
