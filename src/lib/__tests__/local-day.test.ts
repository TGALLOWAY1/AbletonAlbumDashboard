import { describe, expect, it } from "vitest";
import { MONTH_NAMES, formatDayMonth } from "@/lib/local-day";

describe("formatDayMonth", () => {
  it("prints a local calendar day, with or without the year", () => {
    const date = new Date(2026, 8, 13, 18, 0, 0);
    expect(formatDayMonth(date)).toBe("13 Sep");
    expect(formatDayMonth(date, { withYear: true })).toBe("13 Sep 2026");
  });

  it("reads the UTC day when asked, which is the point of the flag", () => {
    // 2026-09-13T23:30:00Z is the 13th in UTC and the 14th in, say, Sydney.
    // The first render on the server has to pick one and it has to be the
    // same one hydration picks, or React discards the tree — so both start
    // from UTC and only the paint after mount uses the reader's own day.
    const instant = new Date(Date.UTC(2026, 8, 13, 23, 30, 0));
    expect(formatDayMonth(instant, { utc: true })).toBe("13 Sep");
    expect(formatDayMonth(instant, { utc: true, withYear: true })).toBe(
      "13 Sep 2026",
    );
  });

  it("gives an unparseable date an empty string rather than 'NaN NaN'", () => {
    expect(formatDayMonth(new Date("not a date"))).toBe("");
  });

  it("names twelve months", () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe("Jan");
    expect(MONTH_NAMES[11]).toBe("Dec");
  });
});
