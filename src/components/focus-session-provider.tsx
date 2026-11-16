"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChecklistItem } from "@/components/session-todo-checklist";
import { readTargetMs } from "@/lib/focus-timer";
import { starterRunSchema, type StarterRun } from "@/lib/starter-run";

const STORAGE_KEY = "finish-five.focus-session";

export type FocusPhase = "idle" | "running" | "paused" | "stopped";

type FocusSessionState = {
  starter: StarterRun | null;
  stoppedAtMs: number | null;
  phase: FocusPhase;
  trackId: string | null;
  trackName: string | null;
  sessionTypeId: string | null;
  startedAtMs: number | null;
  accumulatedMs: number;
  todos: ChecklistItem[];
  notes: string;
  // The one thing this session is trying to achieve. Checked at log time.
  goal: string;
  // Which track `goal` was last seeded from — lets a track switch mid-session
  // re-seed the goal from the new track's top task, see `shouldReseedGoal`.
  goalTrackId: string | null;
  // Sticky for the rest of the session once the user types their own goal, so
  // a later track switch never clobbers it.
  goalEdited: boolean;
  // The length the session was started against, or null for an open-ended
  // one. It is a way of *reading* the stopwatch, not a second clock: nothing
  // stops when it is reached and the logged duration is still the elapsed
  // time. The dashboard's Focus Timer widget sets it; the focus runner starts
  // open-ended sessions and never does. See `src/lib/focus-timer.ts`.
  targetMs: number | null;
};

const INITIAL_STATE: FocusSessionState = {
  starter: null,
  stoppedAtMs: null,
  phase: "idle",
  trackId: null,
  trackName: null,
  sessionTypeId: null,
  startedAtMs: null,
  accumulatedMs: 0,
  todos: [],
  notes: "",
  goal: "",
  goalTrackId: null,
  goalEdited: false,
  targetMs: null,
};

export type StartInput = {
  starter?: StarterRun;
  trackId: string | null;
  trackName: string | null;
  sessionTypeId?: string | null;
  initialTodos?: ChecklistItem[];
  goal?: string;
  /** Count down from this many milliseconds. Omit (or null) for open-ended. */
  targetMs?: number | null;
};

type FocusSessionContextValue = FocusSessionState & {
  isHydrated: boolean;
  updateStarter: (patch: Partial<Pick<StarterRun, "completedStepIds" | "assetsCreated" | "footageCaptured" | "contentStatus" | "nextAction">>) => void;
  elapsedMs: number;
  start: (input: StartInput) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setTodos: (next: ChecklistItem[]) => void;
  setNotes: (next: string) => void;
  /** User-driven goal edit — marks `goalEdited` so a later track switch won't overwrite it. */
  setGoal: (next: string) => void;
  /** Re-seeds the goal from a (new) track's top task without marking it user-edited. */
  seedGoal: (trackId: string | null, next: string) => void;
  /** Re-attaches a running/paused session to a different track (or none) in place. */
  setTrack: (trackId: string | null, trackName: string | null) => void;
  /** Changes the session type mid-session. */
  setSessionType: (sessionTypeId: string | null) => void;
  /**
   * True while something on the page is already drawing this session's clock
   * and controls — the dashboard's Focus Timer widget, when it is on screen.
   * `FloatingFocusBar` stands down then, so the same timer is not shown twice.
   */
  timerSurfaceShown: boolean;
  /**
   * Declares such a surface. Returns the function that withdraws it; call it
   * from the effect's cleanup. Counted rather than flagged so two surfaces,
   * or React re-running an effect, cannot leave the bar hidden for good.
   */
  showTimerSurface: () => () => void;
};

const FocusSessionContext = createContext<FocusSessionContextValue | null>(null);

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext);
  if (!ctx) {
    throw new Error("useFocusSession must be used inside FocusSessionProvider");
  }
  return ctx;
}

export function FocusSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FocusSessionState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [, forceTick] = useState(0);
  // Not part of the session and never persisted: it describes this page, and
  // a reload starts from "nothing is showing the timer" until a surface says so.
  const [timerSurfaces, setTimerSurfaces] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      // `goal` and `targetMs` were added after launch; older persisted
      // sessions won't have them and take the defaults — for `targetMs`, null:
      // an open-ended session, which is what every one of them was.
      const stored = JSON.parse(raw) as Partial<FocusSessionState>;
      const parsed = {
        ...INITIAL_STATE,
        ...stored,
        targetMs: readTargetMs(stored.targetMs),
      };
      if (!["idle", "running", "paused", "stopped"].includes(parsed.phase) ||
          !Number.isFinite(parsed.accumulatedMs) || parsed.accumulatedMs < 0 ||
          (parsed.phase === "running" && !Number.isFinite(parsed.startedAtMs))) return;
      if (parsed.starter) {
        const starter = starterRunSchema.safeParse(parsed.starter);
        if (!starter.success) return;
        parsed.starter = starter.data;
      }
      /* eslint-disable react-hooks/set-state-in-effect */
      setState(parsed);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // ignore corrupt storage
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (state.phase === "idle") {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // ignore storage errors (quota, private mode, etc.)
    }
  }, [state]);

  useEffect(() => {
    if (state.phase !== "running") return;
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [state.phase]);

  const elapsedMs =
    state.phase === "running" && state.startedAtMs != null
      ? // eslint-disable-next-line react-hooks/purity -- ticker re-renders 4x/sec so render-time Date.now() is the timer source
        state.accumulatedMs + (Date.now() - state.startedAtMs)
      : state.accumulatedMs;

  const start = useCallback((input: StartInput) => {
    setState({
      starter: input.starter ?? null,
      stoppedAtMs: null,
      phase: "running",
      trackId: input.trackId,
      trackName: input.trackName,
      sessionTypeId: input.sessionTypeId ?? null,
      startedAtMs: Date.now(),
      accumulatedMs: 0,
      todos: input.initialTodos ?? [],
      notes: "",
      goal: input.goal ?? "",
      goalTrackId: input.trackId,
      goalEdited: false,
      targetMs: readTargetMs(input.targetMs),
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "running" || prev.startedAtMs == null) return prev;
      const acc = prev.accumulatedMs + (Date.now() - prev.startedAtMs);
      return { ...prev, phase: "paused", accumulatedMs: acc, startedAtMs: null };
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "paused") return prev;
      return { ...prev, phase: "running", startedAtMs: Date.now() };
    });
  }, []);

  const stop = useCallback(() => {
    setState((prev) => {
      let acc = prev.accumulatedMs;
      if (prev.phase === "running" && prev.startedAtMs != null) {
        acc = prev.accumulatedMs + (Date.now() - prev.startedAtMs);
      }
      if (prev.phase === "idle" || prev.phase === "stopped") return prev;
      return { ...prev, phase: "stopped", accumulatedMs: acc, startedAtMs: null, stoppedAtMs: Date.now() };
    });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const setTodos = useCallback((next: ChecklistItem[]) => {
    setState((prev) => ({ ...prev, todos: next }));
  }, []);

  const setNotes = useCallback((next: string) => {
    setState((prev) => ({ ...prev, notes: next }));
  }, []);

  const setGoal = useCallback((next: string) => {
    setState((prev) => ({ ...prev, goal: next, goalEdited: true }));
  }, []);

  const seedGoal = useCallback((trackId: string | null, next: string) => {
    setState((prev) => ({
      ...prev,
      goal: next,
      goalTrackId: trackId,
      goalEdited: false,
    }));
  }, []);

  const setTrack = useCallback((trackId: string | null, trackName: string | null) => {
    setState((prev) => ({ ...prev, trackId, trackName }));
  }, []);

  const setSessionType = useCallback((sessionTypeId: string | null) => {
    setState((prev) => ({ ...prev, sessionTypeId }));
  }, []);

  const showTimerSurface = useCallback(() => {
    let withdrawn = false;
    setTimerSurfaces((n) => n + 1);
    return () => {
      if (withdrawn) return;
      withdrawn = true;
      setTimerSurfaces((n) => Math.max(0, n - 1));
    };
  }, []);

  const updateStarter = useCallback((patch: Partial<Pick<StarterRun, "completedStepIds" | "assetsCreated" | "footageCaptured" | "contentStatus" | "nextAction">>) => {
    setState((prev) => prev.starter ? { ...prev, starter: { ...prev.starter, ...patch } } : prev);
  }, []);

  const value: FocusSessionContextValue = {
    ...state,
    elapsedMs,
    isHydrated,
    updateStarter,
    start,
    pause,
    resume,
    stop,
    reset,
    setTodos,
    setNotes,
    setGoal,
    seedGoal,
    setTrack,
    setSessionType,
    timerSurfaceShown: timerSurfaces > 0,
    showTimerSurface,
  };

  return (
    <FocusSessionContext.Provider value={value}>
      {children}
    </FocusSessionContext.Provider>
  );
}
