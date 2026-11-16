import { describe, expect, it } from "vitest";
import { createStarterRun, focusSessionPath, stepTimeBudget } from "@/lib/starter-run";
import { seedSessionStarters, STARTER_DURATIONS } from "@/lib/session-starters";

describe("launched Session Starter workflows", () => {
  it("keeps a deep snapshot and a unique run identity when the original is edited", () => {
    const template = seedSessionStarters()[0];
    const run = createStarterRun(template, 60);
    const second = createStarterRun(template, 20);
    template.steps[0].title = "An edited instruction";
    template.outcomes.push("An added outcome");
    expect(run.template.steps[0].title).toBe("Choose your starting rack");
    expect(run.template.outcomes).toHaveLength(2);
    expect(run.durationMinutes).toBe(60);
    expect(run.runId).not.toBe(second.runId);
    expect(run.footageCaptured).toBe(false); // Filmable does not mean filmed.
  });

  it("allocates the chosen time across every step without losing minutes", () => {
    for (const duration of STARTER_DURATIONS) {
      for (let count = 1; count <= 30; count++) {
        const minutes = Array.from({ length: count }, (_, index) => stepTimeBudget(duration, index, count));
        expect(minutes.reduce((a, b) => a + b, 0)).toBe(duration);
        expect(Math.max(...minutes) - Math.min(...minutes)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns to the correct shared timer or the unsaved log", () => {
    const run = createStarterRun(seedSessionStarters()[0], 20);
    expect(focusSessionPath({ starter: run, trackId: "track", phase: "paused" })).toBe("/focus/starter");
    expect(focusSessionPath({ starter: run, trackId: "track", phase: "stopped" })).toBe("/focus/log");
    expect(focusSessionPath({ starter: null, trackId: "track", phase: "running" })).toBe("/focus/track");
    expect(focusSessionPath({ starter: null, trackId: null, phase: "running" })).toBe("/focus/new");
  });
});
