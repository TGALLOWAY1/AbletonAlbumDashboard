import { describe, expect, it } from "vitest";
import {
  activePreset,
  describeLength,
  describeReading,
  formatClock,
  formatLength,
  minutesToTargetMs,
  readTargetMs,
  readTimer,
  startRefusal,
  targetMinutes,
  timerPresets,
} from "@/lib/focus-timer";
import { FOCUS_PRESET_MINUTES } from "@/lib/dashboard/widgets";

const MIN = 60_000;

describe("minutesToTargetMs", () => {
  it("turns a length in minutes into milliseconds", () => {
    expect(minutesToTargetMs(25)).toBe(25 * MIN);
    expect(minutesToTargetMs(90)).toBe(90 * MIN);
  });

  it("reads 0 — the open-ended preset — as no target", () => {
    expect(minutesToTargetMs(0)).toBeNull();
  });

  it("reads a negative or non-finite length as no target", () => {
    expect(minutesToTargetMs(-5)).toBeNull();
    expect(minutesToTargetMs(Number.NaN)).toBeNull();
    expect(minutesToTargetMs(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("readTargetMs", () => {
  it("keeps a positive finite target", () => {
    expect(readTargetMs(25 * MIN)).toBe(25 * MIN);
  });

  it("reads a session persisted before the timer existed as open-ended", () => {
    expect(readTargetMs(undefined)).toBeNull();
    expect(readTargetMs(null)).toBeNull();
  });

  it("reads anything that is not a usable number as open-ended", () => {
    expect(readTargetMs(0)).toBeNull();
    expect(readTargetMs(-1)).toBeNull();
    expect(readTargetMs("1500000")).toBeNull();
    expect(readTargetMs(Number.NaN)).toBeNull();
    expect(readTargetMs({})).toBeNull();
  });
});

describe("targetMinutes", () => {
  it("round-trips a length through the stored target", () => {
    for (const minutes of FOCUS_PRESET_MINUTES) {
      expect(targetMinutes(minutesToTargetMs(minutes))).toBe(minutes);
    }
  });
});

describe("readTimer", () => {
  it("counts up when the session is open-ended", () => {
    expect(readTimer(0, null)).toEqual({ kind: "elapsed", seconds: 0 });
    expect(readTimer(999, null)).toEqual({ kind: "elapsed", seconds: 0 });
    expect(readTimer(61_500, null)).toEqual({ kind: "elapsed", seconds: 61 });
  });

  it("shows the full length for the whole first second of a countdown", () => {
    expect(readTimer(0, 25 * MIN)).toEqual({ kind: "remaining", seconds: 1500 });
    expect(readTimer(250, 25 * MIN)).toEqual({ kind: "remaining", seconds: 1500 });
    expect(readTimer(1000, 25 * MIN)).toEqual({ kind: "remaining", seconds: 1499 });
  });

  it("counts down to the last second without reaching zero early", () => {
    expect(readTimer(25 * MIN - 1, 25 * MIN)).toEqual({
      kind: "remaining",
      seconds: 1,
    });
  });

  it("turns into overtime at the target instead of stopping", () => {
    expect(readTimer(25 * MIN, 25 * MIN)).toEqual({ kind: "overtime", seconds: 0 });
    expect(readTimer(25 * MIN + 999, 25 * MIN)).toEqual({
      kind: "overtime",
      seconds: 0,
    });
    expect(readTimer(25 * MIN + 83_000, 25 * MIN)).toEqual({
      kind: "overtime",
      seconds: 83,
    });
  });

  it("never runs backwards: every later instant reads further along", () => {
    const target = 1 * MIN;
    let previous = Number.POSITIVE_INFINITY;
    for (let elapsed = 0; elapsed < target; elapsed += 250) {
      const { kind, seconds } = readTimer(elapsed, target);
      expect(kind).toBe("remaining");
      expect(seconds).toBeLessThanOrEqual(previous);
      previous = seconds;
    }
    previous = -1;
    for (let elapsed = target; elapsed < 2 * target; elapsed += 250) {
      const { kind, seconds } = readTimer(elapsed, target);
      expect(kind).toBe("overtime");
      expect(seconds).toBeGreaterThanOrEqual(previous);
      previous = seconds;
    }
  });

  it("gives the same reading for the same elapsed time, so a pause cannot move the digits", () => {
    // Paused, the provider reports the accumulated time; resumed, it reports
    // that same value plus zero. Both must print identically.
    const paused = readTimer(7 * MIN + 420, 25 * MIN);
    const resumed = readTimer(7 * MIN + 420 + 0, 25 * MIN);
    expect(resumed).toEqual(paused);
  });

  it("clamps a negative or unusable elapsed time to the start", () => {
    expect(readTimer(-5000, null)).toEqual({ kind: "elapsed", seconds: 0 });
    expect(readTimer(-5000, 25 * MIN)).toEqual({ kind: "remaining", seconds: 1500 });
    expect(readTimer(Number.NaN, 25 * MIN)).toEqual({
      kind: "remaining",
      seconds: 1500,
    });
  });
});

describe("formatClock", () => {
  it("prints minutes and seconds, two digits each", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(5)).toBe("00:05");
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(3599)).toBe("59:59");
  });

  it("adds the hours from an hour up", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(5400)).toBe("1:30:00");
    expect(formatClock(3 * 3600 + 7 * 60 + 9)).toBe("3:07:09");
  });

  it("never prints a negative or fractional time", () => {
    expect(formatClock(-3)).toBe("00:00");
    expect(formatClock(59.9)).toBe("00:59");
    expect(formatClock(Number.NaN)).toBe("00:00");
  });
});

describe("formatLength", () => {
  it("shows the chosen length on the idle clock", () => {
    expect(formatLength(25)).toBe("25:00");
    expect(formatLength(90)).toBe("1:30:00");
  });

  it("shows 00:00 for an open-ended session", () => {
    expect(formatLength(0)).toBe("00:00");
  });
});

describe("timerPresets", () => {
  it("offers the registry's presets, open-ended first", () => {
    expect(timerPresets(25, FOCUS_PRESET_MINUTES)).toEqual([0, 15, 25, 45, 60, 90]);
  });

  it("adds a default that is not a preset, in order", () => {
    expect(timerPresets(30, FOCUS_PRESET_MINUTES)).toEqual([0, 15, 25, 30, 45, 60, 90]);
    expect(timerPresets(120, FOCUS_PRESET_MINUTES)).toEqual([
      0, 15, 25, 45, 60, 90, 120,
    ]);
  });

  it("ignores a default it cannot offer", () => {
    expect(timerPresets(-1, FOCUS_PRESET_MINUTES)).toEqual([0, 15, 25, 45, 60, 90]);
    expect(timerPresets(12.5, FOCUS_PRESET_MINUTES)).toEqual([0, 15, 25, 45, 60, 90]);
  });
});

describe("activePreset", () => {
  it("lights the chip matching the chosen length", () => {
    expect(activePreset(25, FOCUS_PRESET_MINUTES)).toBe(25);
    expect(activePreset(0, FOCUS_PRESET_MINUTES)).toBe(0);
  });

  it("lights nothing when the length is not a preset", () => {
    expect(activePreset(30, FOCUS_PRESET_MINUTES)).toBeNull();
  });
});

describe("describeLength", () => {
  it("names a length in words", () => {
    expect(describeLength(0)).toBe("Open-ended");
    expect(describeLength(25)).toBe("25 min");
    expect(describeLength(60)).toBe("1 hr");
    expect(describeLength(90)).toBe("1 hr 30 min");
  });
});

describe("describeReading", () => {
  it("says what the digits measure", () => {
    expect(describeReading({ kind: "remaining", seconds: 1500 })).toBe(
      "25:00 remaining",
    );
    expect(describeReading({ kind: "elapsed", seconds: 65 })).toBe("01:05 elapsed");
    expect(describeReading({ kind: "overtime", seconds: 83 })).toBe(
      "Time is up — 01:23 over",
    );
  });
});

describe("startRefusal", () => {
  const mixing = { name: "Mixing", requires_track: true };
  const practice = { name: "Practice", requires_track: false };

  it("lets a session start with no session type at all", () => {
    expect(startRefusal(null, null)).toBeNull();
    expect(startRefusal(null, "t1")).toBeNull();
  });

  it("lets a type that needs no track start with or without one", () => {
    expect(startRefusal(practice, null)).toBeNull();
    expect(startRefusal(practice, "t1")).toBeNull();
  });

  it("lets a requires_track type start once a track is chosen", () => {
    expect(startRefusal(mixing, "t1")).toBeNull();
  });

  it("refuses a requires_track type with no track, in the runner's words", () => {
    expect(startRefusal(mixing, null)).toBe("Mixing sessions require a track.");
  });
});
