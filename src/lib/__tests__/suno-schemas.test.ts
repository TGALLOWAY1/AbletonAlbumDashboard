import { describe, expect, it } from "vitest";
import {
  closeExperimentSchema,
  createSunoExperimentSchema,
  keepCandidateSchema,
  mineCandidateSchema,
} from "@/lib/suno";

const TRACK_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_ID = "33333333-3333-4333-8333-333333333333";
const EXPERIMENT_ID = "44444444-4444-4444-8444-444444444444";

describe("createSunoExperimentSchema", () => {
  const base = { trackId: TRACK_ID, sourceVersionId: VERSION_ID };

  it("requires a non-empty goal", () => {
    expect(() =>
      createSunoExperimentSchema.parse({ ...base, goal: "" }),
    ).toThrow();
    expect(() =>
      createSunoExperimentSchema.parse({ ...base, goal: "   " }),
    ).toThrow();
  });

  it("accepts a goal without preserve/change/avoid", () => {
    const parsed = createSunoExperimentSchema.parse({
      ...base,
      goal: "Stronger second drop",
    });
    expect(parsed.goal).toBe("Stronger second drop");
    expect(parsed.preserve).toBeUndefined();
    expect(parsed.change).toBeUndefined();
    expect(parsed.avoid).toBeUndefined();
  });

  it("trims the goal and intent fields", () => {
    const parsed = createSunoExperimentSchema.parse({
      ...base,
      goal: "  darker chorus  ",
      avoid: "  vocals  ",
    });
    expect(parsed.goal).toBe("darker chorus");
    expect(parsed.avoid).toBe("vocals");
  });
});

describe("mineCandidateSchema", () => {
  const base = { candidateId: CANDIDATE_ID, trackId: TRACK_ID };

  it("requires the note and the Ableton task", () => {
    expect(() =>
      mineCandidateSchema.parse({
        ...base,
        note: "",
        taskDescription: "Recreate bass",
      }),
    ).toThrow();
    expect(() =>
      mineCandidateSchema.parse({
        ...base,
        note: "Bass rhythm in final phrase",
        taskDescription: "  ",
      }),
    ).toThrow();
  });

  it("rejects end <= start and end without start", () => {
    const valid = {
      ...base,
      note: "Bass rhythm",
      taskDescription: "Recreate in bars 57-60",
    };
    expect(() =>
      mineCandidateSchema.parse({ ...valid, startSeconds: 47, endSeconds: 42 }),
    ).toThrow();
    expect(() =>
      mineCandidateSchema.parse({ ...valid, startSeconds: 42, endSeconds: 42 }),
    ).toThrow();
    expect(() =>
      mineCandidateSchema.parse({ ...valid, endSeconds: 42 }),
    ).toThrow();
  });

  it("accepts start-only and a valid range", () => {
    const valid = {
      ...base,
      note: "Bass rhythm",
      taskDescription: "Recreate in bars 57-60",
    };
    expect(
      mineCandidateSchema.parse({ ...valid, startSeconds: 42 }).startSeconds,
    ).toBe(42);
    const parsed = mineCandidateSchema.parse({
      ...valid,
      startSeconds: 42,
      endSeconds: 47,
    });
    expect(parsed.endSeconds).toBe(47);
  });
});

describe("keepCandidateSchema", () => {
  it("works with only the ids", () => {
    const parsed = keepCandidateSchema.parse({
      candidateId: CANDIDATE_ID,
      trackId: TRACK_ID,
    });
    expect(parsed.note).toBeUndefined();
    expect(parsed.taskDescription).toBeUndefined();
    expect(parsed.replaceExistingKeeper).toBeUndefined();
  });
});

describe("closeExperimentSchema", () => {
  const base = { experimentId: EXPERIMENT_ID, trackId: TRACK_ID };

  it("only allows the two terminal outcomes", () => {
    expect(
      closeExperimentSchema.parse({ ...base, outcome: "integrated" }).outcome,
    ).toBe("integrated");
    expect(
      closeExperimentSchema.parse({ ...base, outcome: "discarded" }).outcome,
    ).toBe("discarded");
    expect(() =>
      closeExperimentSchema.parse({ ...base, outcome: "reviewing" }),
    ).toThrow();
    expect(() =>
      closeExperimentSchema.parse({ ...base, outcome: "selected" }),
    ).toThrow();
  });
});
