"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Infinity as InfinityIcon,
  Music,
  Pause,
  Play,
  Square,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { useFocusSession } from "@/components/focus-session-provider";
import { useToast } from "@/components/toast";
import { canSelectSessionType } from "@/lib/focus-runner";
import {
  activePreset,
  describeLength,
  describeReading,
  formatClock,
  formatLength,
  minutesToTargetMs,
  readTimer,
  startRefusal,
  targetMinutes,
} from "@/lib/focus-timer";
import { cn } from "@/lib/utils";

export type TimerTrack = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  /** The top of the track's open task list — the goal a session on it takes. */
  nextTask: string | null;
};

export type TimerSessionType = {
  id: string;
  name: string;
  requires_track: boolean;
};

/**
 * The interactive half of the Focus Timer widget.
 *
 * NO TIME LIVES HERE. The session — when it started, how long it has run,
 * what length it was started against — is in `FocusSessionProvider`, which
 * sits in the root layout and persists to sessionStorage. This component only
 * reads `elapsedMs` and `targetMs` off it on each of the provider's ticks and
 * asks `readTimer` what to print. So the widget can be dragged, resized,
 * re-ordered, made `inert` by edit mode, re-rendered by a server action or
 * unmounted by a navigation, and the digits are the same afterwards: there is
 * no local interval to restart and no local start time to lose.
 *
 * What *is* local is the choice not yet acted on — length, track, session
 * type before Start — and each is stored as "what the user picked, if they
 * picked", falling back to the prop. A re-render with new props therefore
 * cannot clobber a pick, and a pick cannot pin a default that later changes.
 *
 * ONE SESSION. If a session is already live (started here, on a focus page,
 * on another track) the widget shows that one — its name, clock and controls —
 * and offers no Start. Stopping goes to `/focus/log`, the same hand-off the
 * focus runner makes; nothing here records a session.
 *
 * SIZES are CSS (see `widget-parts.tsx`). One DOM, four tiers by height:
 *
 *   base       clock, start / pause / resume (and Stop, as an
 *              icon, once live), the track's name                (Small)
 *   h3 / phone + track picker; labelled Stop; the session chip
 *   h4 / phone + length presets; what the digits measure         (Medium)
 *   h5 / phone + session type; the goal                          (Large)
 *
 * The top 44px is the eyebrow row and nothing else, because that is exactly
 * the strip edit mode covers with its drag bar — the clock stays in view
 * while the dashboard is being rearranged.
 */
export function FocusTimerPanel({
  defaultMinutes,
  presets,
  tracks,
  sessionTypes,
  defaultTrackId,
}: {
  defaultMinutes: number;
  presets: number[];
  tracks: TimerTrack[];
  sessionTypes: TimerSessionType[];
  defaultTrackId: string | null;
}) {
  const router = useRouter();
  const ctx = useFocusSession();
  const { toast } = useToast();

  // ------------------------------------------------- choices before Start ----

  // A picked length only counts against the default it was picked over: change
  // the widget's "Default length" setting and the new default shows, without
  // an effect to reset anything.
  const [pickedLength, setPickedLength] = useState<{
    over: number;
    minutes: number;
  } | null>(null);
  const minutes =
    pickedLength && pickedLength.over === defaultMinutes
      ? pickedLength.minutes
      : defaultMinutes;

  // `undefined` is "not chosen" — follow the top of the shortlist; `null` is
  // "No specific track", chosen on purpose.
  const [pickedTrackId, setPickedTrackId] = useState<string | null | undefined>(
    undefined,
  );
  const wantedTrackId = pickedTrackId === undefined ? defaultTrackId : pickedTrackId;
  // Looked up rather than trusted: a track archived elsewhere drops out of
  // `tracks` on the next refresh, and a session must not start on its id.
  const idleTrack = tracks.find((t) => t.id === wantedTrackId) ?? null;

  const [pickedTypeId, setPickedTypeId] = useState<string | null>(null);
  const idleType = sessionTypes.find((t) => t.id === pickedTypeId) ?? null;

  // ---------------------------------------------------------- the session ----

  const live = ctx.phase !== "idle";
  const stopped = ctx.phase === "stopped";
  const sessionTrack = ctx.trackId
    ? (tracks.find((t) => t.id === ctx.trackId) ?? null)
    : null;
  const sessionType = ctx.sessionTypeId
    ? (sessionTypes.find((t) => t.id === ctx.sessionTypeId) ?? null)
    : null;

  // Once stopped, what matters is how long there is to log, not how the
  // countdown stood — so the stopped clock always reads elapsed.
  const reading = live
    ? readTimer(ctx.elapsedMs, stopped ? null : ctx.targetMs)
    : null;
  const over = reading?.kind === "overtime";
  const clock = reading ? formatClock(reading.seconds) : formatLength(minutes);
  // H:MM:SS is two characters wider than MM:SS; step the type down so an hour
  // on the clock does not push the digits out of a narrow box.
  const long = clock.length > 5;

  const focusPath = ctx.trackId ? `/focus/${ctx.trackId}` : "/focus/new";

  // A track-less session started by the runner (or below) carries its session
  // type's name as `trackName`, so print one or the other, never both.
  const sessionTrackName = ctx.trackId
    ? (sessionTrack?.name ?? ctx.trackName ?? "Track")
    : null;
  const sessionLabel = sessionTrackName
    ? sessionType
      ? `${sessionTrackName} · ${sessionType.name}`
      : sessionTrackName
    : (sessionType?.name ?? ctx.trackName ?? "No specific track");

  const cover = (live ? sessionTrack : idleTrack)?.coverImageUrl ?? null;
  const goal = live ? ctx.goal.trim() : (idleTrack?.nextTask ?? "");

  // ------------------------------------------------- standing in for the pill ----

  // While this widget is on screen the floating focus pill would be a second
  // copy of it, so the widget tells the provider it is showing the session.
  // "On screen" is literal: on a phone the dashboard is one long column, and a
  // timer scrolled out of view is not showing anyone anything — there the pill
  // comes back. Declared on mount and corrected by the observer, so the pill
  // does not flash for the frame before the first observation arrives.
  //
  // It also has to be *usable*. While the dashboard is being customized every
  // widget's contents are inert, so this one can show the clock but cannot
  // stop it; if it still claimed the session there would be no Stop anywhere
  // on the page until the edit ended. The grid marks itself `data-editing`,
  // and the widget stands aside for the pill for as long as it does.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { showTimerSurface } = ctx;
  useEffect(() => {
    const el = rootRef.current;
    const grid = el?.closest<HTMLElement>(".dash-grid") ?? null;
    let withdraw: (() => void) | null = null;
    let onScreen = true;

    const sync = () => {
      const shown = onScreen && !grid?.hasAttribute("data-editing");
      if (shown && !withdraw) {
        withdraw = showTimerSurface();
      } else if (!shown && withdraw) {
        withdraw();
        withdraw = null;
      }
    };
    sync();

    const visibility =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              onScreen = entry.intersectionRatio >= 0.5;
              sync();
            },
            { threshold: 0.5 },
          )
        : null;
    if (el) visibility?.observe(el);

    const editing =
      grid && typeof MutationObserver !== "undefined"
        ? new MutationObserver(sync)
        : null;
    if (grid) editing?.observe(grid, { attributes: true, attributeFilter: ["data-editing"] });

    return () => {
      visibility?.disconnect();
      editing?.disconnect();
      withdraw?.();
    };
  }, [showTimerSurface]);

  // -------------------------------------------------------------- actions ----

  const start = () => {
    const refusal = startRefusal(idleType, idleTrack?.id ?? null);
    if (refusal) {
      toast(refusal);
      return;
    }
    ctx.start({
      trackId: idleTrack?.id ?? null,
      // What the runner passes: the track's name, else the session type's.
      trackName: idleTrack?.name ?? idleType?.name ?? null,
      sessionTypeId: idleType?.id ?? null,
      // The same goal the runner seeds — the top open task — so the log page
      // asks the same "did you get there?" whichever surface started it.
      goal: idleTrack?.nextTask ?? "",
      targetMs: minutesToTargetMs(minutes),
    });
  };

  // The provider keeps the stopped session (it lives in the root layout), so
  // the log page picks it up exactly as it does after the runner's Stop.
  const stopAndLog = () => {
    ctx.stop();
    router.push("/focus/log");
  };

  const changeTrack = (nextId: string | null) => {
    // The runner's rule: a type that needs a track cannot be left without one.
    if (idleType && !canSelectSessionType(idleType, nextId)) {
      toast(
        `${idleType.name} sessions require a track — change the session type first.`,
      );
      return;
    }
    setPickedTrackId(nextId);
  };

  const changeType = (nextId: string | null) => {
    const type = nextId ? (sessionTypes.find((t) => t.id === nextId) ?? null) : null;
    const refusal = startRefusal(type, idleTrack?.id ?? null);
    if (refusal) {
      toast(refusal);
      return;
    }
    setPickedTypeId(nextId);
  };

  // --------------------------------------------------------------- render ----

  const eyebrow = !live
    ? { icon: null, text: "Focus session", tone: "text-white/80" }
    : stopped
      ? { icon: Square, text: "Session stopped", tone: "text-white/80" }
      : ctx.phase === "paused"
        ? { icon: Pause, text: "Paused", tone: "text-white" }
        : over
          ? { icon: BellRing, text: "Time's up", tone: "text-amber-300" }
          : { icon: null, text: "Focus session", tone: "text-white/80" };
  const EyebrowIcon = eyebrow.icon;

  const caption = !reading
    ? null
    : stopped
      ? "worked — not logged yet"
      : reading.kind === "remaining"
        ? `left of ${describeLength(targetMinutes(ctx.targetMs))}`
        : reading.kind === "overtime"
          ? `over ${describeLength(targetMinutes(ctx.targetMs))} — ${
              ctx.phase === "paused" ? "paused" : "still running"
            }`
          : "Open-ended";

  return (
    <div
      ref={rootRef}
      className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-neutral-900 text-white"
    >
      {cover ? (
        <>
          <CoverArt
            src={cover}
            sizes="(min-width: 64rem) 40vw, (min-width: 40rem) 50vw, 100vw"
            className="-z-20"
          />
          {/* Flat and heavy on purpose: a cover can be any colour, including
              white, and every line of text on this card has to clear it. The
              slight blur takes the hard edges off busy artwork, which is
              what small text loses to. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-xs"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-gradient-to-br from-neutral-800 via-neutral-900 to-primary/30"
        />
      )}

      <div className="flex h-11 shrink-0 items-center px-4 widget-h3:justify-center dash-stack:justify-center">
        <h2
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
            eyebrow.tone,
          )}
        >
          {ctx.phase === "running" && !over && (
            <span aria-hidden className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70 motion-reduce:animate-none" />
              <span className="relative h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
          {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span className="truncate">{eyebrow.text}</span>
        </h2>
      </div>

      {/* Announced once, when the countdown runs out — the session carries on. */}
      <p className="sr-only" role="status">
        {over && !stopped
          ? ctx.phase === "paused"
            ? "Time is up. The session is paused."
            : "Time is up. The session is still running."
          : ""}
      </p>

      <div className="dash-scroll flex min-h-0 flex-1 flex-col px-4 pb-4">
        {/* `my-auto` rather than `justify-center`: centred when there is room,
            and top-aligned — still reachable — if a box is ever too short.
            Capped in width so a six-column box gets a timer, not a banner. */}
        <div className="mx-auto my-auto flex w-full max-w-md flex-wrap items-center gap-x-3 gap-y-1.5 widget-h3:flex-col widget-h3:flex-nowrap widget-h3:items-stretch widget-h3:gap-2.5 widget-h5:gap-3 dash-stack:flex-col dash-stack:flex-nowrap dash-stack:items-stretch dash-stack:gap-3">
          <div className="min-w-0 flex-1 widget-h3:flex-none widget-h3:text-center dash-stack:flex-none dash-stack:text-center">
            <div
              role="timer"
              aria-label={
                reading
                  ? describeReading(reading)
                  : `Session length: ${describeLength(minutes)}`
              }
              data-timer-clock
              className={cn(
                "font-semibold tabular-nums leading-none tracking-tight",
                // The Small tier shares its row with two round controls once a
                // session is live, so its steps are set by what fits beside
                // them — including "+" and an hour's extra digits.
                long
                  ? "text-2xl @[16rem]/widget:text-3xl @xs/widget:text-4xl widget-h3:text-4xl widget-h3:@xs/widget:text-5xl widget-h5:@md/widget:text-6xl dash-stack:text-5xl"
                  : "text-3xl @[16rem]/widget:text-4xl @xs/widget:text-5xl widget-h3:text-5xl widget-h3:@xs/widget:text-6xl widget-h5:@md/widget:text-7xl dash-stack:text-6xl",
                over && "text-amber-300",
              )}
            >
              {over && (
                <span aria-hidden className="mr-0.5 align-top text-[0.5em]">
                  +
                </span>
              )}
              {clock}
            </div>
            {caption && (
              <p
                data-timer-caption
                className={cn(
                  "mt-1.5 hidden truncate text-xs widget-h4:block dash-stack:block",
                  over ? "font-medium text-amber-200" : "text-white/80",
                )}
              >
                {caption}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 widget-h3:order-last dash-stack:order-last">
            {!live && (
              <PrimaryControl icon={Play} label="Start Focus" onClick={start} />
            )}
            {ctx.phase === "running" && (
              <PrimaryControl icon={Pause} label="Pause" tone="quiet" onClick={ctx.pause} />
            )}
            {ctx.phase === "paused" && (
              <PrimaryControl icon={Play} label="Resume" onClick={ctx.resume} />
            )}
            {stopped && (
              <PrimaryControl
                icon={ClipboardCheck}
                label="Log session"
                outlineIcon
                onClick={() => router.push("/focus/log")}
              />
            )}
            {/* Present at every size, Small included. While this widget is on
                screen the floating pill stands down, so if Stop were hidden
                here nothing on the dashboard could end the session. */}
            {(ctx.phase === "running" || ctx.phase === "paused") && (
              <button
                type="button"
                onClick={stopAndLog}
                aria-label="Stop session and log"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 text-sm font-medium text-white transition-colors hover:bg-white/20 widget-h3:w-auto widget-h3:rounded-md widget-h3:px-3 dash-stack:h-11 dash-stack:w-auto dash-stack:rounded-md dash-stack:px-4"
              >
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
                <span className="hidden widget-h3:inline dash-stack:inline">
                  Stop
                  <span className="hidden @xs/widget:inline"> &amp; log</span>
                </span>
              </button>
            )}
          </div>

          {/* Small only: the larger tiers name the track in the picker or chip. */}
          <p
            data-timer-track
            className="min-w-0 basis-full truncate text-xs text-white/80 widget-h3:hidden dash-stack:hidden"
          >
            {live ? sessionLabel : (idleTrack?.name ?? "No specific track")}
          </p>

          {!live && (
            <>
              <div
                role="group"
                aria-label="Session length"
                className="hidden gap-1 widget-h4:flex dash-stack:flex"
              >
                {presets.map((preset) => {
                  const selected = activePreset(minutes, presets) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={selected}
                      aria-label={describeLength(preset)}
                      title={describeLength(preset)}
                      onClick={() =>
                        setPickedLength({ over: defaultMinutes, minutes: preset })
                      }
                      className={cn(
                        "flex h-8 min-w-0 flex-1 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors dash-stack:h-11 dash-stack:text-sm",
                        selected
                          ? "bg-white text-neutral-900"
                          : "bg-white/15 text-white hover:bg-white/25",
                      )}
                    >
                      {preset === 0 ? (
                        <InfinityIcon className="h-4 w-4" aria-hidden />
                      ) : (
                        preset
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="hidden min-w-0 flex-col gap-2 widget-h3:flex @md/widget:flex-row dash-stack:flex dash-stack:gap-3">
                <PanelSelect
                  icon={Music}
                  label="Track"
                  value={idleTrack?.id ?? ""}
                  onChange={(v) => changeTrack(v || null)}
                >
                  <option value="">No specific track</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </PanelSelect>

                {sessionTypes.length > 0 && (
                  <PanelSelect
                    icon={Tag}
                    label="Session type"
                    value={idleType?.id ?? ""}
                    onChange={(v) => changeType(v || null)}
                    className="hidden widget-h5:block dash-stack:block"
                  >
                    <option value="">No session type</option>
                    {sessionTypes.map((t) => {
                      // The chosen type always stays selectable, so it can be
                      // seen and changed even if it is no longer a legal pick.
                      const blocked =
                        t.id !== idleType?.id &&
                        !canSelectSessionType(t, idleTrack?.id ?? null);
                      return (
                        <option key={t.id} value={t.id} disabled={blocked}>
                          {blocked ? `${t.name} — needs a track` : t.name}
                        </option>
                      );
                    })}
                  </PanelSelect>
                )}
              </div>
            </>
          )}

          {live &&
            (stopped ? (
              <p className="mx-auto hidden h-7 max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-medium widget-h3:inline-flex dash-stack:inline-flex dash-stack:h-9 dash-stack:text-sm">
                <Music className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden />
                <span className="truncate">{sessionLabel}</span>
              </p>
            ) : (
              <Link
                href={focusPath}
                aria-label={`Open focus session: ${sessionLabel}`}
                className="mx-auto hidden h-7 max-w-full items-center gap-1.5 rounded-full bg-white/15 pl-3 pr-2 text-xs font-medium text-white transition-colors hover:bg-white/25 widget-h3:inline-flex dash-stack:inline-flex dash-stack:h-9 dash-stack:text-sm"
              >
                <Music className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden />
                <span className="truncate">{sessionLabel}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/70" aria-hidden />
              </Link>
            ))}

          {goal && (
            <p
              data-timer-goal
              className="hidden min-w-0 text-center text-xs text-white/90 wrap-anywhere widget-h5:line-clamp-2 dash-stack:line-clamp-2"
            >
              <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/65">
                Goal
              </span>
              {goal}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The widget's one always-present button. At Small it is a 40px round icon
 * beside the clock (40, not 44, so it and Stop both fit beside the digits in
 * the narrowest box); from three rows up (and on a phone) it becomes the
 * full-width labelled button of the mockup. Same element either way, so the
 * accessible name does not depend on the size of the box.
 */
function PrimaryControl({
  icon: Icon,
  label,
  onClick,
  tone = "primary",
  outlineIcon = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** `quiet` for Pause: it is the control in reach, not a call to action. */
  tone?: "primary" | "quiet";
  /** Transport glyphs are drawn solid; an icon with inner detail is not. */
  outlineIcon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-sm transition-colors",
        "widget-h3:h-10 widget-h3:w-auto widget-h3:flex-1 widget-h3:rounded-md widget-h3:px-4",
        "dash-stack:h-11 dash-stack:w-auto dash-stack:flex-1 dash-stack:rounded-md dash-stack:px-4",
        tone === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-white/20 text-white hover:bg-white/30",
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", !outlineIcon && "fill-current")}
        aria-hidden
      />
      <span className="hidden widget-h3:inline dash-stack:inline">{label}</span>
    </button>
  );
}

/**
 * A native `<select>` dressed as the mockup's chip. Native on purpose: the
 * card is `overflow-hidden` and often 300px tall, so a popover list would be
 * clipped by it, and on a phone the system picker is the better control
 * anyway. `text-sm` with no arbitrary size, so the touch rule in globals.css
 * lifts it to 16px and iOS does not zoom the page on focus.
 */
function PanelSelect({
  icon: Icon,
  label,
  value,
  onChange,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // Named with `aria-label` rather than a wrapping <label>: a label that
    // contains its own <select> takes the option text into the control's name.
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70"
        aria-hidden
      />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer appearance-none truncate rounded-full border border-white/25 bg-white/15 pl-8 pr-8 text-sm font-medium text-white scheme-dark transition-colors hover:bg-white/25 dash-stack:h-11"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70"
        aria-hidden
      />
    </div>
  );
}
