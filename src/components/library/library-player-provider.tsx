"use client";

import * as React from "react";
import { signLibraryPreview } from "@/app/actions/library";
import { useToast } from "@/components/toast";
import {
  advanceQueue,
  hasPlayableNeighbour,
  queueSignature,
  type PlayableAsset,
} from "@/lib/data/library";

export type LibraryPlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export type LibraryPlayerValue = {
  current: PlayableAsset | null;
  status: LibraryPlayerStatus;
  /** 0–1 through the current preview, for the mini-player progress line. */
  progress: number;
  hasNext: boolean;
  hasPrevious: boolean;

  /** True only for the one asset actually producing sound right now. */
  isPlaying: (id: string) => boolean;
  /** True for the asset loaded into the player, playing or paused. */
  isCurrent: (id: string) => boolean;

  /** Start an asset. Pass the visible result set to scope previous/next. */
  play: (asset: PlayableAsset, queue?: PlayableAsset[]) => void;
  /** What cards call: start, or pause/resume if already loaded. */
  toggle: (asset: PlayableAsset, queue?: PlayableAsset[]) => void;
  toggleCurrent: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;

  /**
   * Published by whichever browse surface is mounted whenever its rendered,
   * ordered result set changes, so previous/next always walks what the user
   * is actually looking at.
   */
  syncQueue: (assets: PlayableAsset[]) => void;
};

const LibraryPlayerContext = React.createContext<LibraryPlayerValue | null>(
  null,
);

export function useLibraryPlayer(): LibraryPlayerValue {
  const ctx = React.useContext(LibraryPlayerContext);
  if (!ctx) {
    throw new Error(
      "useLibraryPlayer must be used inside <LibraryPlayerProvider>",
    );
  }
  return ctx;
}

/**
 * Owns the Library's one and only audio element.
 *
 * Everything on the page routes playback through here. That is not a
 * convention but the concurrency guarantee: with a single element, assigning a
 * new `src` aborts whatever was playing, so "two previews at once" is a state
 * the app cannot represent rather than a race to be managed.
 */
export function LibraryPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  /**
   * Incremented on every play request. An async signing round trip compares
   * the token it captured against this before touching the element, so tapping
   * card B while card A is still resolving never lets A win the race.
   */
  const requestRef = React.useRef(0);
  /** Guards the one-shot re-sign so a genuinely dead object can't loop. */
  const retriedRef = React.useRef<string | null>(null);

  const [current, setCurrent] = React.useState<PlayableAsset | null>(null);
  const [status, setStatus] = React.useState<LibraryPlayerStatus>("idle");
  const [progress, setProgress] = React.useState(0);
  // State rather than a ref: hasNext/hasPrevious are derived from the queue
  // during render, and reading a ref there isn't safe.
  const [queue, setQueue] = React.useState<PlayableAsset[]>([]);

  const startAsset = React.useCallback(
    async (asset: PlayableAsset) => {
      const token = ++requestRef.current;
      setCurrent(asset);
      setProgress(0);

      if (!asset.previewUrl) {
        // Nothing to play. Leave whatever was playing alone rather than
        // silently killing the user's audition.
        setStatus((s) => (s === "playing" ? s : "idle"));
        toast(`No preview for “${asset.name}”`);
        return;
      }

      setStatus("loading");
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = asset.previewUrl;
      try {
        await audio.play();
        if (token !== requestRef.current) return;
        retriedRef.current = null;
      } catch {
        if (token !== requestRef.current) return;
        // Autoplay rejection or a bad source; onError below covers the source
        // case, so only surface a hard failure here.
        if (audio.error) return;
        setStatus("paused");
      }
    },
    [toast],
  );

  /**
   * A signed URL lasts an hour, so a tab left open longer will fail here — as
   * will an object that has genuinely gone missing. Re-sign once and retry;
   * a second failure is real.
   */
  const handleError = React.useCallback(() => {
    const audio = audioRef.current;
    const asset = current;
    if (!audio || !asset?.previewPath) {
      setStatus("error");
      return;
    }
    if (retriedRef.current === asset.id) {
      setStatus("error");
      toast(`Couldn’t play “${asset.name}”`);
      return;
    }
    retriedRef.current = asset.id;
    const token = requestRef.current;
    void signLibraryPreview(asset.previewPath)
      .then((url) => {
        if (token !== requestRef.current) return;
        audio.src = url;
        return audio.play();
      })
      .catch(() => {
        if (token !== requestRef.current) return;
        setStatus("error");
        toast(`Couldn’t play “${asset.name}”`);
      });
  }, [current, toast]);

  /**
   * Replace the queue only when something the player actually uses changed.
   *
   * Comparing ids alone isn't enough: editing an asset's preview leaves the id
   * and position untouched, so the queue would keep serving the superseded URL
   * and storage path until the layout remounted.
   */
  const syncQueue = React.useCallback((assets: PlayableAsset[]) => {
    setQueue((prev) =>
      queueSignature(prev) === queueSignature(assets) ? prev : assets,
    );
  }, []);

  const play = React.useCallback(
    (asset: PlayableAsset, nextQueue?: PlayableAsset[]) => {
      if (nextQueue) syncQueue(nextQueue);
      void startAsset(asset);
    },
    [startAsset, syncQueue],
  );

  const toggleCurrent = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current?.previewUrl) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [current]);

  const toggle = React.useCallback(
    (asset: PlayableAsset, nextQueue?: PlayableAsset[]) => {
      if (nextQueue) syncQueue(nextQueue);
      if (current?.id === asset.id && asset.previewUrl) {
        toggleCurrent();
        return;
      }
      void startAsset(asset);
    },
    [current, startAsset, syncQueue, toggleCurrent],
  );

  const step = React.useCallback(
    (direction: "next" | "previous") => {
      const target = advanceQueue(queue, current?.id ?? null, direction);
      if (target) void startAsset(target);
    },
    [current, queue, startAsset],
  );

  const stop = React.useCallback(() => {
    requestRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(null);
    setStatus("idle");
    setProgress(0);
  }, []);

  const value = React.useMemo<LibraryPlayerValue>(() => {
    const currentId = current?.id ?? null;
    return {
      current,
      status,
      progress,
      // Recomputed whenever the visible result set changes, so filtering while
      // something is playing immediately re-scopes the transport buttons.
      hasNext: hasPlayableNeighbour(queue, currentId, "next"),
      hasPrevious: hasPlayableNeighbour(queue, currentId, "previous"),
      isPlaying: (id) => currentId === id && status === "playing",
      isCurrent: (id) => currentId === id,
      play,
      toggle,
      toggleCurrent,
      next: () => step("next"),
      previous: () => step("previous"),
      stop,
      syncQueue,
    };
  }, [
    current,
    status,
    progress,
    queue,
    play,
    toggle,
    toggleCurrent,
    step,
    stop,
    syncQueue,
  ]);

  return (
    <LibraryPlayerContext.Provider value={value}>
      {children}
      {/*
        The Library's one and only audio element. Rendering it here rather than
        constructing `new Audio()` per card is the concurrency guarantee:
        assigning a new `src` aborts whatever was playing, so "two previews at
        once" is a state the app cannot represent.
      */}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setStatus("playing")}
        onPause={() => setStatus((s) => (s === "loading" ? s : "paused"))}
        onEnded={() => {
          setProgress(1);
          setStatus("paused");
        }}
        onError={handleError}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setProgress(
            Number.isFinite(el.duration) && el.duration > 0
              ? Math.min(1, el.currentTime / el.duration)
              : 0,
          );
        }}
      />
    </LibraryPlayerContext.Provider>
  );
}

/**
 * Keeps the player's previous/next queue pointed at the result set a surface
 * is currently rendering. Call it from the component that owns the visible,
 * ordered list.
 */
export function useSyncPlayerQueue(assets: PlayableAsset[]) {
  const { syncQueue } = useLibraryPlayer();
  // Depend on the content rather than the array identity, which changes on
  // every render of the parent.
  const signature = queueSignature(assets);
  React.useEffect(() => {
    syncQueue(assets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, syncQueue]);
}
