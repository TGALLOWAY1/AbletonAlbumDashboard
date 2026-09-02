import { describe, expect, it } from "vitest";
import { lastWorkedAtFrom } from "@/lib/session-last-worked";

describe("lastWorkedAtFrom", () => {
  it("is null when the track has no sessions left", () => {
    // Deleting a track's only session has to clear the column, not leave the
    // old timestamp standing. This is the case the insert-only trigger cannot
    // express.
    expect(lastWorkedAtFrom([])).toBeNull();
  });

  it("is null when nothing that is left has been worked yet", () => {
    expect(
      lastWorkedAtFrom([{ ended_at: null }, { ended_at: undefined }, {}]),
    ).toBeNull();
  });

  it("takes the latest ended_at, whatever order the rows arrive in", () => {
    expect(
      lastWorkedAtFrom([
        { ended_at: "2026-03-01T10:00:00.000Z" },
        { ended_at: "2026-05-20T18:30:00.000Z" },
        { ended_at: "2026-04-11T09:15:00.000Z" },
      ]),
    ).toBe("2026-05-20T18:30:00.000Z");
  });

  it("can move backwards", () => {
    // Editing the newest session's end date earlier, or deleting it, must pull
    // the track's last-worked date back to the previous session.
    const before = lastWorkedAtFrom([
      { ended_at: "2026-05-20T18:30:00.000Z" },
      { ended_at: "2026-03-01T10:00:00.000Z" },
    ]);
    const after = lastWorkedAtFrom([{ ended_at: "2026-03-01T10:00:00.000Z" }]);
    expect(before).toBe("2026-05-20T18:30:00.000Z");
    expect(after).toBe("2026-03-01T10:00:00.000Z");
  });

  it("ignores rows with no end while still answering from the rest", () => {
    // A planned session (migration 0009 made ended_at nullable) has not been
    // worked, so it must not count as "now".
    expect(
      lastWorkedAtFrom([
        { ended_at: null },
        { ended_at: "2026-01-02T00:00:00.000Z" },
        { ended_at: null },
      ]),
    ).toBe("2026-01-02T00:00:00.000Z");
  });

  it("compares instants, not strings", () => {
    // 08:00-05:00 is 13:00Z — later than 12:00Z despite sorting earlier as text.
    expect(
      lastWorkedAtFrom([
        { ended_at: "2026-02-01T12:00:00.000Z" },
        { ended_at: "2026-02-01T08:00:00.000-05:00" },
      ]),
    ).toBe("2026-02-01T08:00:00.000-05:00");
  });

  it("returns the stored string verbatim", () => {
    const stored = "2026-06-07 21:45:00+00";
    expect(lastWorkedAtFrom([{ ended_at: stored }])).toBe(stored);
  });

  it("skips unparseable timestamps", () => {
    expect(
      lastWorkedAtFrom([
        { ended_at: "not a date" },
        { ended_at: "2026-06-01T00:00:00.000Z" },
      ]),
    ).toBe("2026-06-01T00:00:00.000Z");
    expect(lastWorkedAtFrom([{ ended_at: "not a date" }])).toBeNull();
  });
});
