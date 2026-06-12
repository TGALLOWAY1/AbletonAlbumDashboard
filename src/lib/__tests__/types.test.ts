import { describe, expect, it } from "vitest";
import {
  currentStageLabel,
  progressFromStages,
  STAGE_KEYS,
  type StageKey,
  type StageRow,
} from "@/lib/types";

function stage(
  key: StageKey,
  opts: { complete?: boolean; percent?: number | null } = {},
): StageRow {
  return {
    track_id: "t1",
    stage_key: key,
    complete: opts.complete ?? false,
    percent: opts.percent ?? null,
  } as StageRow;
}

function allStages(
  opts: (key: StageKey) => { complete?: boolean; percent?: number | null },
): StageRow[] {
  return STAGE_KEYS.map((k) => stage(k, opts(k)));
}

describe("progressFromStages", () => {
  it("returns 0 for no stages", () => {
    expect(progressFromStages([])).toBe(0);
  });

  it("averages boolean completion when percent is unset", () => {
    const stages = allStages((k) => ({
      complete: k === "idea" || k === "sound_design",
    }));
    expect(progressFromStages(stages)).toBe(40);
  });

  it("prefers explicit percent over the complete flag", () => {
    const stages = allStages(() => ({ percent: 50 }));
    expect(progressFromStages(stages)).toBe(50);
  });

  it("mixes percent and boolean stages", () => {
    const stages = [
      stage("idea", { complete: true }),
      stage("sound_design", { percent: 50 }),
      stage("arrangement"),
      stage("mixing"),
      stage("mastering"),
    ];
    expect(progressFromStages(stages)).toBe(30);
  });

  it("returns 100 when everything is done", () => {
    expect(progressFromStages(allStages(() => ({ complete: true })))).toBe(100);
  });
});

describe("currentStageLabel", () => {
  it("returns the first incomplete stage in workflow order", () => {
    const stages = allStages((k) => ({
      complete: k === "idea" || k === "sound_design",
    }));
    expect(currentStageLabel(stages)).toBe("Arrangement");
  });

  it("treats percent >= 100 as complete", () => {
    const stages = allStages((k) => ({
      percent: k === "idea" ? 100 : 0,
    }));
    expect(currentStageLabel(stages)).toBe("Sound Design");
  });

  it("falls back to the final stage when everything is complete", () => {
    expect(currentStageLabel(allStages(() => ({ complete: true })))).toBe(
      "Mastering",
    );
  });
});
