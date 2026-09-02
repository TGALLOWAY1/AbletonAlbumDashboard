import { describe, expect, it } from "vitest";
import {
  MAX_ESTIMATE_MINUTES,
  countOpenEstimates,
  formatEstimateSummary,
  formatMinutes,
  isStageKey,
  sumOpenEstimates,
  taskDetails,
  toStageKey,
} from "@/lib/task-details";
import { STAGE_KEYS, STAGE_LABELS } from "@/lib/types";

const task = (
  estimated_minutes: number | null,
  completed_at: string | null = null,
) => ({ estimated_minutes, completed_at });

describe("formatMinutes", () => {
  it("renders under an hour as minutes", () => {
    expect(formatMinutes(25)).toBe("25m");
    expect(formatMinutes(5)).toBe("5m");
    expect(formatMinutes(59)).toBe("59m");
  });

  it("renders a whole hour without a trailing zero", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(120)).toBe("2h");
  });

  it("renders hours and minutes, never a decimal or a big minute count", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(135)).toBe("2h 15m");
    expect(formatMinutes(MAX_ESTIMATE_MINUTES)).toBe("10h");
  });

  it("survives nonsense without printing NaN", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(-30)).toBe("0m");
    expect(formatMinutes(Number.NaN)).toBe("0m");
    expect(formatMinutes(24.6)).toBe("25m");
  });
});

describe("stage key validation", () => {
  it("accepts exactly the five production stages", () => {
    STAGE_KEYS.forEach((key) => expect(isStageKey(key)).toBe(true));
    expect(STAGE_KEYS).toHaveLength(5);
  });

  it("rejects anything else, including the legacy suno category", () => {
    // `startSunoExperiment` writes category "suno" on the action it creates,
    // so a non-stage category is real data, not a hypothetical.
    expect(isStageKey("suno")).toBe(false);
    expect(isStageKey("")).toBe(false);
    expect(isStageKey(null)).toBe(false);
    expect(isStageKey(undefined)).toBe(false);
    expect(isStageKey(3)).toBe(false);
    expect(isStageKey("Mixing")).toBe(false);
  });

  it("narrows a stored category to a stage or to nothing", () => {
    expect(toStageKey("mixing")).toBe("mixing");
    expect(toStageKey("suno")).toBeNull();
    expect(toStageKey(null)).toBeNull();
    expect(toStageKey(undefined)).toBeNull();
  });

  it("has a label for every key, so a chip can never render blank", () => {
    STAGE_KEYS.forEach((key) => expect(STAGE_LABELS[key]).toBeTruthy());
  });
});

describe("taskDetails", () => {
  it("reads both columns into the shape the list works in", () => {
    expect(
      taskDetails({ estimated_minutes: 45, category: "arrangement" }),
    ).toEqual({ estimatedMinutes: 45, category: "arrangement" });
  });

  it("treats zero and negatives as no estimate", () => {
    expect(
      taskDetails({ estimated_minutes: 0, category: null }).estimatedMinutes,
    ).toBeNull();
    expect(
      taskDetails({ estimated_minutes: -5, category: null }).estimatedMinutes,
    ).toBeNull();
    expect(
      taskDetails({ estimated_minutes: null, category: null }).estimatedMinutes,
    ).toBeNull();
  });

  it("drops a category that is not a stage", () => {
    expect(
      taskDetails({ estimated_minutes: 15, category: "suno" }).category,
    ).toBeNull();
  });
});

describe("sumOpenEstimates", () => {
  it("adds up the open estimates", () => {
    expect(sumOpenEstimates([task(25), task(20), task(45)])).toBe(90);
  });

  it("ignores completed tasks — a done estimate is history, not work left", () => {
    expect(
      sumOpenEstimates([task(30), task(60, "2026-01-01T00:00:00Z")]),
    ).toBe(30);
  });

  it("ignores tasks with no estimate", () => {
    expect(sumOpenEstimates([task(30), task(null), task(0)])).toBe(30);
  });

  it("is zero for an unestimated list", () => {
    expect(sumOpenEstimates([task(null), task(null)])).toBe(0);
    expect(sumOpenEstimates([])).toBe(0);
  });
});

describe("countOpenEstimates", () => {
  it("counts only open tasks carrying an estimate", () => {
    expect(
      countOpenEstimates([
        task(25),
        task(null),
        task(15),
        task(90, "2026-01-01T00:00:00Z"),
      ]),
    ).toBe(2);
  });
});

describe("formatEstimateSummary", () => {
  it("reads as a sentence about the work that is left", () => {
    expect(
      formatEstimateSummary([task(60), task(45), task(30), task(0), task(null)]),
    ).toBe("~2h 15m estimated across 3 tasks");
  });

  it("says task, singular, for one", () => {
    expect(formatEstimateSummary([task(25), task(null)])).toBe(
      "~25m estimated across 1 task",
    );
  });

  it("says nothing at all when nothing is estimated", () => {
    expect(formatEstimateSummary([task(null), task(0)])).toBeNull();
    expect(formatEstimateSummary([])).toBeNull();
  });

  it("says nothing when every estimate belongs to a finished task", () => {
    expect(
      formatEstimateSummary([task(60, "2026-01-01T00:00:00Z")]),
    ).toBeNull();
  });
});
