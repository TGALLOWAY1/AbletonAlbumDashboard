import { describe, expect, it } from "vitest";
import {
  LEARNING_INTENSITY_BANDS,
  buildActivityStrip,
  buildRangeStrip,
  learningIntensity,
  learningStreaks,
} from "@/lib/learning-activity";
import { getRangeStart, toDayKey } from "@/lib/analytics";

// Mon 24 Aug 2026, local — every date below is derived from it, so the suite
// depends on the machine's timezone (which several assertions are about) but
// not on its clock.
const NOW = new Date(2026, 7, 24, 18, 0, 0);

function day(year: number, month: number, date: number) {
  return new Date(year, month, date);
}

function strip(start: Date, end: Date, entries: [string, number][] = []) {
  return buildActivityStrip({
    start,
    end,
    dailyMap: new Map(entries),
    today: NOW,
  });
}

describe("learningIntensity", () => {
  it("gives every band a distinct step, and nothing a zero", () => {
    expect(learningIntensity(0)).toBe(0);
    expect(learningIntensity(-1)).toBe(0);
    expect(learningIntensity(1)).toBe(1);
    expect(learningIntensity(2)).toBe(2);
    expect(learningIntensity(3)).toBe(3);
    expect(learningIntensity(4)).toBe(3);
    expect(learningIntensity(5)).toBe(4);
    expect(learningIntensity(50)).toBe(4);
  });

  it("has a band label for every step the legend draws", () => {
    expect(LEARNING_INTENSITY_BANDS).toHaveLength(5);
  });
});

describe("strip geometry", () => {
  it("is one cell per day, inclusive of both ends, oldest first", () => {
    const s = strip(day(2026, 7, 18), NOW);

    expect(s.days).toHaveLength(7);
    expect(s.days[0].date.getDate()).toBe(18);
    expect(s.days[6].date.getDate()).toBe(24);
  });

  it("pads nothing — a strip is a run of dates, not a calendar", () => {
    // Wed → Mon spans three calendar weeks; a Monday-aligned grid would add
    // padding days to complete them. This adds none.
    const s = strip(day(2026, 7, 12), NOW);
    expect(s.days).toHaveLength(13);
  });

  it("marks today, and only today", () => {
    const s = strip(day(2026, 7, 18), NOW);
    expect(s.days.filter((d) => d.isToday)).toHaveLength(1);
    expect(s.days.at(-1)!.isToday).toBe(true);
  });

  it("reads counts off the day map by local calendar day", () => {
    const key = toDayKey(day(2026, 7, 20));
    const s = strip(day(2026, 7, 18), NOW, [[key, 3]]);

    const marked = s.days.find((d) => d.key === key)!;
    expect(marked.count).toBe(3);
    expect(marked.intensity).toBe(3);
    // Every other day in the window is empty, not undefined.
    expect(s.days.every((d) => d.key === key || d.count === 0)).toBe(true);
  });

  it("totals, counts active days and names the busiest one", () => {
    const s = strip(day(2026, 7, 18), NOW, [
      [toDayKey(day(2026, 7, 19)), 1],
      [toDayKey(day(2026, 7, 21)), 4],
      [toDayKey(day(2026, 7, 22)), 2],
    ]);

    expect(s.total).toBe(7);
    expect(s.activeDays).toBe(3);
    expect(s.busiest?.date.getDate()).toBe(21);
  });

  it("has no busiest day when nothing landed in the window", () => {
    const s = strip(day(2026, 7, 18), NOW);
    expect(s.total).toBe(0);
    expect(s.busiest).toBeNull();
  });
});

describe("month markers", () => {
  it("anchors a month to the column holding its own 1st", () => {
    const s = strip(day(2026, 6, 20), NOW);
    const august = s.monthMarkers.find((m) => m.label === "Aug")!;

    expect(s.days[august.column].date.getMonth()).toBe(7);
    expect(s.days[august.column].date.getDate()).toBe(1);
  });

  it("names the opening month, which no first-of-month covers", () => {
    const s = strip(day(2026, 6, 20), NOW);
    expect(s.monthMarkers[0]).toMatchObject({ column: 0, label: "Jul" });
  });

  it("drops the leading label when a real month would print on top of it", () => {
    // Window opens 29 Jul: August's own marker lands three columns in.
    const s = strip(day(2026, 6, 29), NOW);
    expect(s.monthMarkers.map((m) => m.label)).toEqual(["Aug"]);
  });

  it("tags January with its year when the window spans two", () => {
    const s = strip(day(2025, 11, 20), day(2026, 0, 20));
    const labels = s.monthMarkers.map((m) => m.label);
    expect(labels).toContain("Jan '26");
  });
});

describe("learningStreaks", () => {
  it("finds the longest run of consecutive days, and the live one", () => {
    const s = strip(day(2026, 7, 18), NOW, [
      [toDayKey(day(2026, 7, 18)), 1],
      [toDayKey(day(2026, 7, 19)), 1],
      [toDayKey(day(2026, 7, 20)), 1],
      // 21st empty — breaks the run
      [toDayKey(day(2026, 7, 23)), 1],
      [toDayKey(day(2026, 7, 24)), 1],
    ]);

    expect(learningStreaks(s)).toEqual({ longest: 3, current: 2 });
  });

  it("reports no live streak when the window's last day is empty", () => {
    const s = strip(day(2026, 7, 18), NOW, [
      [toDayKey(day(2026, 7, 18)), 2],
      [toDayKey(day(2026, 7, 19)), 1],
    ]);
    expect(learningStreaks(s)).toEqual({ longest: 2, current: 0 });
  });

  it("is zero on an empty window", () => {
    expect(learningStreaks(strip(day(2026, 7, 18), NOW))).toEqual({
      longest: 0,
      current: 0,
    });
  });
});

describe("buildRangeStrip", () => {
  it("covers exactly the range the rest of the app measures", () => {
    const s = buildRangeStrip({ dailyMap: new Map(), range: "30d", now: NOW });

    expect(s.days).toHaveLength(30);
    expect(s.start.getTime()).toBe(getRangeStart("30d", NOW).getTime());
    expect(s.days.at(-1)!.isToday).toBe(true);
  });

  it("draws a week and a year off the same rule", () => {
    const week = buildRangeStrip({ dailyMap: new Map(), range: "7d", now: NOW });
    const year = buildRangeStrip({ dailyMap: new Map(), range: "1y", now: NOW });

    expect(week.days).toHaveLength(7);
    expect(year.days).toHaveLength(365);
    // Both end on today: the range changes how far back the strip reaches,
    // never what it ends on.
    expect(week.days.at(-1)!.key).toBe(year.days.at(-1)!.key);
  });
});
