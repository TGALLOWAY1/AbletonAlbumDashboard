/**
 * The arithmetic behind the dashboard's Focus Timer widget.
 *
 * A focus session is a stopwatch: the provider records when it started and
 * how long it has run, and that elapsed time is what gets logged. A *timer*
 * is only a way of reading the same stopwatch against a length the user chose
 * up front — so nothing here keeps time. Every function takes the elapsed
 * milliseconds the provider already reports plus the chosen target, and says
 * what the clock face should show. That is what makes the widget safe to
 * drag, resize, unmount and re-render: it has no time of its own to lose.
 *
 * Kept out of the component for the reason `focus-runner.ts` is: the rules
 * for "how much is left", "are we over" and "which preset is lit" have to be
 * exercised by tests without React or a ticking clock.
 */

import { canSelectSessionType } from "@/lib/focus-runner";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;

/**
 * A length in minutes as the provider stores it. `0` — the registry's
 * open-ended preset — and anything that is not a positive, finite number of
 * minutes become `null`: no target, count up.
 */
export function minutesToTargetMs(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.round(minutes * MS_PER_MINUTE);
}

/**
 * A target read back from storage. Sessions persisted before the timer
 * existed have no `targetMs` at all, and sessionStorage is user-editable, so
 * anything but a positive finite number reads as open-ended rather than as a
 * countdown from NaN.
 */
export function readTargetMs(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null;
}

/** The whole minutes a target stands for; `0` for an open-ended session. */
export function targetMinutes(targetMs: number | null): number {
  return targetMs == null ? 0 : Math.round(targetMs / MS_PER_MINUTE);
}

export type TimerKind =
  /** No target: the clock counts up from zero. */
  | "elapsed"
  /** A target not yet reached: the clock counts down to zero. */
  | "remaining"
  /** A target passed: the clock counts up again, from the moment it ran out. */
  | "overtime";

export type TimerReading = {
  kind: TimerKind;
  /** The whole seconds to print — see `formatClock`. */
  seconds: number;
};

/**
 * What the clock face shows for a session that has run `elapsedMs` against
 * `targetMs` (null for open-ended).
 *
 * Reaching zero does not end anything: the reading turns into `overtime` and
 * keeps counting, because the session itself is still running — stopping
 * someone mid-flow to tell them the time is up is worse than running over.
 *
 * Rounding is chosen so the display never lies about a whole second. Time
 * remaining rounds *up*: a 25-minute timer reads 25:00 for its first second
 * and only shows 00:00 at the instant it is actually spent, where rounding
 * down would print 24:59 the moment Start is pressed. Elapsed and overtime
 * round *down*, like any stopwatch. The same elapsed value always gives the
 * same reading, so pausing and resuming cannot move the digits.
 */
export function readTimer(elapsedMs: number, targetMs: number | null): TimerReading {
  // A clock set backwards mid-session would otherwise show a negative time.
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (targetMs == null) {
    return { kind: "elapsed", seconds: Math.floor(elapsed / MS_PER_SECOND) };
  }
  if (elapsed < targetMs) {
    return {
      kind: "remaining",
      seconds: Math.ceil((targetMs - elapsed) / MS_PER_SECOND),
    };
  }
  return {
    kind: "overtime",
    seconds: Math.floor((elapsed - targetMs) / MS_PER_SECOND),
  };
}

/**
 * Whole seconds as a clock face: `MM:SS` under an hour, `H:MM:SS` from an
 * hour up. Minutes stay two digits so the width of the display does not
 * change as a countdown crosses ten minutes.
 */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** The idle clock: the chosen length, or 00:00 when the session is open-ended. */
export function formatLength(minutes: number): string {
  return formatClock(targetMinutes(minutesToTargetMs(minutes)) * 60);
}

/**
 * The lengths offered as chips: the registry's presets, plus the widget's own
 * default when its settings hold a length that is not one of them (the schema
 * allows any whole minute up to four hours). Without that, a widget saved at
 * 30 minutes would open on a length no chip could return it to. Open-ended
 * (0) sorts first, then shortest to longest.
 */
export function timerPresets(
  defaultMinutes: number,
  presets: readonly number[],
): number[] {
  const all = new Set<number>(presets);
  if (Number.isInteger(defaultMinutes) && defaultMinutes >= 0) all.add(defaultMinutes);
  return [...all].sort((a, b) => a - b);
}

/** Which chip is lit for the chosen length, or null when none matches. */
export function activePreset(
  minutes: number,
  presets: readonly number[],
): number | null {
  return presets.includes(minutes) ? minutes : null;
}

/** A length in words: "Open-ended", "25 min", "1 hr", "1 hr 30 min". */
export function describeLength(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "Open-ended";
  const whole = Math.round(minutes);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** What the reading is *of*, for the clock's accessible name. */
export function describeReading(reading: TimerReading): string {
  const clock = formatClock(reading.seconds);
  if (reading.kind === "remaining") return `${clock} remaining`;
  if (reading.kind === "overtime") return `Time is up — ${clock} over`;
  return `${clock} elapsed`;
}

/**
 * Why Start must be refused, or null when the session may begin.
 *
 * The one rule is the focus runner's (`canSelectSessionType`): a session type
 * flagged `requires_track` has nothing to log progress against without a
 * track. The picker already greys such a type out while no track is chosen,
 * but the pairing can still arise behind it — the chosen track is archived in
 * another tab and drops out of the list on the next refresh — so Start checks
 * again, with the runner's own wording.
 */
export function startRefusal(
  sessionType: { name: string; requires_track: boolean } | null,
  trackId: string | null,
): string | null {
  if (sessionType && !canSelectSessionType(sessionType, trackId)) {
    return `${sessionType.name} sessions require a track.`;
  }
  return null;
}
