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
});
