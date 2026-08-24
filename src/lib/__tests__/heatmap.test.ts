import { describe, expect, it } from "vitest";
import {
  HEATMAP_MODE,
  INTENSITY_BANDS,
  buildHeatmapGrid,
  heatmapMode,
  startOfWeek,
} from "@/lib/heatmap";
import { getMostActiveDay, getRangeStart, toDayKey } from "@/lib/analytics";

// Mon 24 Aug 2026, local. Every date below is derived from it, so the suite
// does not depend on the machine's clock — only on its timezone, which is the
// thing several of these assertions are about.
const NOW = new Date(2026, 7, 24, 18, 0, 0);

function day(year: number, month: number, date: Date | number) {
  return new Date(year, month, date as number);
}

function grid(start: Date, end: Date, entries: [string, number][] = []) {
  return buildHeatmapGrid({
    start,
    end,
    dailyMap: new Map(entries),
    today: NOW,
  });
}

describe("grid geometry", () => {
  it("pads to whole Monday-started weeks, every row the same weekday", () => {
    // Wed 12 Aug → Mon 24 Aug: 13 days, spanning three calendar weeks.
    const g = grid(day(2026, 7, 12), NOW);

    expect(g.weeks).toHaveLength(3);
    for (const week of g.weeks) {
      expect(week.days).toHaveLength(7);
      expect(week.days[0].date.getDay()).toBe(1); // Monday
      expect(week.days[6].date.getDay()).toBe(0); // Sunday
    }
    // Row n is weekday n in every column — what the weekday gutter labels.
    for (let row = 0; row < 7; row++) {
      const weekdays = new Set(g.weeks.map((w) => w.days[row].date.getDay()));
      expect(weekdays.size).toBe(1);
    }
  });

  it("marks the padding days out of range instead of dropping them", () => {
    const g = grid(day(2026, 7, 12), NOW);
    const first = g.weeks[0].days;

    // Mon 10 and Tue 11 pad the front; the window opens on Wed 12.
    expect(first.slice(0, 2).every((d) => !d.inRange)).toBe(true);
    expect(first[2].inRange).toBe(true);
    expect(first[2].date.getDate()).toBe(12);

    const inRange = g.weeks.flatMap((w) => w.days).filter((d) => d.inRange);
    expect(inRange).toHaveLength(13);
  });

  it("never runs past the last in-range day by more than its own week", () => {
    const g = grid(getRangeStart("1y", NOW), NOW);
    const last = g.weeks[g.weeks.length - 1].days;
    expect(last.some((d) => d.inRange)).toBe(true);
    expect(startOfWeek(NOW).getTime()).toBe(last[0].date.getTime());
  });

  it("gives every day a unique key, padding included", () => {
    const g = grid(getRangeStart("3m", NOW), NOW);
    const days = g.weeks.flatMap((w) => w.days);
    expect(new Set(days.map((d) => d.key)).size).toBe(days.length);
  });
});

describe("day contents", () => {
  it("reads seconds off the daily map by local day key", () => {
    const key = toDayKey(NOW);
    const g = grid(getRangeStart("7d", NOW), NOW, [[key, 5400]]);
    const today = g.weeks.flatMap((w) => w.days).find((d) => d.key === key);

    expect(today?.seconds).toBe(5400);
    expect(today?.intensity).toBe(3); // 90 minutes → the 1–2h band
    expect(today?.isToday).toBe(true);
  });

  it("flags the busiest day in the window, and nothing when it is empty", () => {
    const g = grid(getRangeStart("30d", NOW), NOW, [
      [toDayKey(day(2026, 7, 20)), 3600],
      [toDayKey(day(2026, 7, 22)), 7200],
    ]);
    expect(g.busiest?.key).toBe(toDayKey(day(2026, 7, 22)));
    expect(grid(getRangeStart("30d", NOW), NOW).busiest).toBeNull();
  });

  it("does not attribute work to out-of-range padding days", () => {
    // Window opens Wed 19 Aug, so Mon 17 pads the front of its first week and
    // Tue 25 onward pads the back of its last. Work on either must not show.
    const g = grid(day(2026, 7, 19), NOW, [
      [toDayKey(day(2026, 7, 17)), 3600],
      [toDayKey(day(2026, 7, 26)), 3600],
    ]);
    const days = g.weeks.flatMap((w) => w.days);
    const before = days.find((d) => d.key === toDayKey(day(2026, 7, 17)));
    const after = days.find((d) => d.key === toDayKey(day(2026, 7, 26)));

    expect(before?.inRange).toBe(false);
    expect(before?.seconds).toBe(0);
    expect(after?.inRange).toBe(false);
    expect(after?.seconds).toBe(0);
    expect(g.busiest).toBeNull();
  });
});

describe("month markers", () => {
  it("anchors a month to the column that contains its 1st, not the next one", () => {
    // 1 Sep 2026 is a Tuesday: mid-week, so the column holding it also holds
    // 31 Aug. Labelling by the column's Monday would push "Sep" a week late.
    const g = grid(day(2026, 7, 1), day(2026, 8, 30));
    const sep = g.monthMarkers.find((m) => m.label === "Sep");
    const column = g.weeks[sep!.column];

    expect(column.days.some((d) => d.date.getMonth() === 8 && d.date.getDate() === 1)).toBe(true);
  });

  it("labels the window's opening month too", () => {
    const g = grid(day(2026, 6, 8), day(2026, 8, 30));
    expect(g.monthMarkers[0].column).toBe(0);
    expect(g.monthMarkers[0].label).toBe("Jul");
    expect(g.monthMarkers.map((m) => m.label)).toEqual(["Jul", "Aug", "Sep"]);
  });

  it("does not double up when the window opens on the 1st", () => {
    const g = grid(day(2026, 7, 1), day(2026, 8, 30));
    const columns = g.monthMarkers.map((m) => m.column);
    expect(new Set(columns).size).toBe(columns.length);
    expect(columns[0]).toBe(0);
  });

  it("drops the opening label when the next month starts on top of it", () => {
    // Opens 30 Aug; September starts two days later, in the very next column.
    const g = grid(day(2026, 7, 30), day(2026, 9, 15));
    expect(g.monthMarkers[0].label).toBe("Sep");
    expect(g.monthMarkers.some((m) => m.label === "Aug")).toBe(false);
  });

  it("years a January that a multi-year window would otherwise leave ambiguous", () => {
    const g = grid(day(2025, 10, 1), day(2026, 2, 1));
    expect(g.monthMarkers.map((m) => m.label)).toEqual([
      "Nov",
      "Dec",
      "Jan '26",
      "Feb",
      "Mar",
    ]);
  });

  it("keeps markers in column order so they cannot overlap when positioned", () => {
    const g = grid(getRangeStart("1y", NOW), NOW);
    const columns = g.monthMarkers.map((m) => m.column);
    expect([...columns].sort((a, b) => a - b)).toEqual(columns);
    // Months are at least four weeks apart, which is the room a label needs.
    for (let i = 1; i < columns.length; i++) {
      expect(columns[i] - columns[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("modes and bands", () => {
  it("draws short windows as calendars and long ones as trails", () => {
    expect(heatmapMode("7d")).toBe("calendar");
    expect(heatmapMode("30d")).toBe("calendar");
    expect(heatmapMode("3m")).toBe("trail");
    expect(heatmapMode("6m")).toBe("trail");
    expect(heatmapMode("1y")).toBe("trail");
  });

  it("has a mode for every range and a band for every intensity", () => {
    expect(Object.keys(HEATMAP_MODE)).toHaveLength(5);
    expect(INTENSITY_BANDS).toHaveLength(5);
  });

  it("keeps a calendar window to a handful of rows", () => {
    // The whole reason 7D/30D are calendars: few enough weeks to print dates.
    expect(grid(getRangeStart("7d", NOW), NOW).weeks.length).toBeLessThanOrEqual(2);
    expect(grid(getRangeStart("30d", NOW), NOW).weeks.length).toBeLessThanOrEqual(6);
  });
});

describe("day keys round-trip in local time", () => {
  it("names the weekday the key was written for", () => {
    // NOW is a Monday. Parsing its key as UTC (`new Date("2026-08-24")`) puts
    // it on Sunday for anyone west of Greenwich, which is what this guards.
    expect(getMostActiveDay(new Map([[toDayKey(NOW), 3600]]))).toBe("Mon");
  });

  it("agrees with the grid about which square is today", () => {
    const g = grid(getRangeStart("7d", NOW), NOW, [[toDayKey(NOW), 60]]);
    const today = g.weeks.flatMap((w) => w.days).find((d) => d.isToday);
    expect(today?.date.getDay()).toBe(1);
    expect(today?.key).toBe(toDayKey(NOW));
  });
});
