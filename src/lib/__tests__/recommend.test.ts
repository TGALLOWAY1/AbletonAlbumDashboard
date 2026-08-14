import { describe, expect, it } from "vitest";
import { recommendTrack } from "@/lib/recommend";
import {
  STAGE_KEYS,
  type StageRow,
  type TrackWithDetails,
} from "@/lib/types";

function stagesAt(percent: number): StageRow[] {
  return STAGE_KEYS.map(
    (k) =>
      ({
        track_id: "t",
        stage_key: k,
        complete: percent >= 100,
        percent,
      }) as StageRow,
  );
}

function track(
  id: string,
  overrides: Partial<TrackWithDetails> = {},
): TrackWithDetails {
  return {
    id,
    name: id,
    last_worked_at: null,
    stages: stagesAt(0),
    bottleneck: null,
    primaryAction: null,
    openTaskCount: 0,
    completedTaskCount: 0,
    estMinutesRemaining: 0,
    ...overrides,
  } as TrackWithDetails;
}

const bottleneck = {
  id: "b1",
  track_id: "t",
  description: "muddy low end",
  category: "mixing",
  is_active: true,
} as TrackWithDetails["bottleneck"];

describe("recommendTrack", () => {
  it("returns null with no tracks", () => {
    expect(recommendTrack([])).toBeNull();
  });

  it("prefers the track closest to done, all else equal", () => {
    const rec = recommendTrack([
      track("a", { stages: stagesAt(20) }),
      track("b", { stages: stagesAt(80) }),
    ]);
    expect(rec?.track.id).toBe("b");
    expect(rec?.reason).toBe("Closest to done");
  });

  it("uses the supplied 7-day session counts as momentum", () => {
    const counts = new Map([["b", 5]]);
    const rec = recommendTrack(
      [
        track("a", { stages: stagesAt(50) }),
        track("b", { stages: stagesAt(50) }),
      ],
      counts,
    );
    expect(rec?.track.id).toBe("b");
    expect(rec?.reason).toBe("High momentum");
  });

  it("treats momentum as zero when no counts are supplied", () => {
    const rec = recommendTrack([
      track("a", { stages: stagesAt(60) }),
      track("b", { stages: stagesAt(50) }),
    ]);
    expect(rec?.track.id).toBe("a");
    expect(rec?.reason).not.toBe("High momentum");
  });

  it("penalizes an active bottleneck", () => {
    const rec = recommendTrack([
      track("blocked", { stages: stagesAt(50), bottleneck }),
      track("clear", { stages: stagesAt(50) }),
    ]);
    expect(rec?.track.id).toBe("clear");
  });

  it("rewards recently worked tracks via freshness", () => {
    const rec = recommendTrack([
      track("fresh", {
        stages: stagesAt(50),
        last_worked_at: new Date().toISOString(),
      }),
      track("stale", { stages: stagesAt(50) }),
    ]);
    expect(rec?.track.id).toBe("fresh");
  });

  it("never attributes the pick to staleness", () => {
    // A stale, low-progress, zero-momentum field: whatever wins, the reason
    // must be one of the positive score contributors.
    const rec = recommendTrack([
      track("a", { stages: stagesAt(10) }),
      track("b", { stages: stagesAt(5), bottleneck }),
    ]);
    expect([
      "Closest to done",
      "High momentum",
      "Fresh in your mind",
      "Quick win — no active bottleneck",
    ]).toContain(rec?.reason);
  });

  it("boosts a track with unreviewed Suno variations and says so", () => {
    const rec = recommendTrack([
      track("plain", { stages: stagesAt(50) }),
      track("suno", {
        stages: stagesAt(50),
        sunoExperiment: {
          id: "e1",
          status: "reviewing",
          goal: "darker drop",
          unreviewedCount: 3,
        },
      }),
    ]);
    expect(rec?.track.id).toBe("suno");
    expect(rec?.reason).toBe("3 Suno variations waiting for review");
  });

  it("uses the singular form for one waiting variation", () => {
    const rec = recommendTrack([
      track("suno", {
        stages: stagesAt(50),
        sunoExperiment: {
          id: "e1",
          status: "reviewing",
          goal: "darker drop",
          unreviewedCount: 1,
        },
      }),
    ]);
    expect(rec?.reason).toBe("1 Suno variation waiting for review");
  });

  it("surfaces a selected keeper as ready to integrate", () => {
    const rec = recommendTrack([
      track("plain", { stages: stagesAt(50) }),
      track("suno", {
        stages: stagesAt(50),
        sunoExperiment: {
          id: "e1",
          status: "selected",
          goal: "darker drop",
          unreviewedCount: 0,
        },
      }),
    ]);
    expect(rec?.track.id).toBe("suno");
    expect(rec?.reason).toBe("Selected Suno idea ready to integrate");
  });

  it("Suno reasons only appear for tracks with pending Suno work", () => {
    // The suno terms must be inert when the field is absent — the reason for
    // a plain winner comes from the classic contributor list.
    const rec = recommendTrack([
      track("a", { stages: stagesAt(80) }),
      track("b", { stages: stagesAt(20) }),
    ]);
    expect(rec?.reason).toBe("Closest to done");
  });
});
