"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChecklistItem } from "@/components/calendar/session-todo-checklist";

const STORAGE_KEY = "finish-five.focus-session";

export type FocusPhase = "idle" | "running" | "paused" | "stopped";

type FocusSessionState = {
  phase: FocusPhase;
  trackId: string | null;
  trackName: string | null;
  sessionTypeId: string | null;
  plannedSessionId: string | null;
  startedAtMs: number | null;
  accumulatedMs: number;
  todos: ChecklistItem[];
  notes: string;
  // The one thing this session is trying to achieve. Checked at log time.
  goal: string;
};

const INITIAL_STATE: FocusSessionState = {
  phase: "idle",
  trackId: null,
  trackName: null,
  sessionTypeId: null,
  plannedSessionId: null,
  startedAtMs: null,
  accumulatedMs: 0,
  todos: [],
  notes: "",
  goal: "",
};

export type StartInput = {
  trackId: string | null;
  trackName: string | null;
  sessionTypeId?: string | null;
  plannedSessionId?: string | null;
  initialTodos?: ChecklistItem[];
  goal?: string;
};

type FocusSessionContextValue = FocusSessionState & {
  elapsedMs: number;
  start: (input: StartInput) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setTodos: (next: ChecklistItem[]) => void;
  setNotes: (next: string) => void;
  setGoal: (next: string) => void;
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
  const [, forceTick] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      // `goal` was added after launch; older persisted sessions won't have it.
      const parsed = {
        ...INITIAL_STATE,
        ...(JSON.parse(raw) as Partial<FocusSessionState>),
      };
      /* eslint-disable react-hooks/set-state-in-effect */
      setState(parsed);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // ignore corrupt storage
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
      phase: "running",
      trackId: input.trackId,
      trackName: input.trackName,
      sessionTypeId: input.sessionTypeId ?? null,
      plannedSessionId: input.plannedSessionId ?? null,
      startedAtMs: Date.now(),
      accumulatedMs: 0,
      todos: input.initialTodos ?? [],
      notes: "",
      goal: input.goal ?? "",
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
      return { ...prev, phase: "stopped", accumulatedMs: acc, startedAtMs: null };
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
    setState((prev) => ({ ...prev, goal: next }));
  }, []);

  const value: FocusSessionContextValue = {
    ...state,
    elapsedMs,
    start,
    pause,
    resume,
    stop,
    reset,
    setTodos,
    setNotes,
    setGoal,
  };

  return (
    <FocusSessionContext.Provider value={value}>
      {children}
    </FocusSessionContext.Provider>
  );
}
