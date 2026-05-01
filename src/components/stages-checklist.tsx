"use client";

import { useTransition, useState, useRef } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { setStagePercent, toggleStage } from "@/app/actions/stages";
import {
  STAGE_KEYS,
  STAGE_LABELS,
  type StageRow,
  progressFromStages,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function effectivePercent(s: StageRow): number {
  if (s.percent != null) return s.percent;
  return s.complete ? 100 : 0;
}

export function StagesChecklist({
  trackId,
  stages,
}: {
  trackId: string;
  stages: StageRow[];
}) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});

  const byKey = new Map(stages.map((s) => [s.stage_key, s]));
  const ordered = STAGE_KEYS.map(
    (k) =>
      byKey.get(k) ?? {
        track_id: trackId,
        stage_key: k,
        complete: false,
        percent: null,
      },
  );

  const getPct = (s: StageRow) =>
    optimistic[s.stage_key] ?? effectivePercent(s);

  const overallStages = ordered.map((s) => ({
    ...s,
    percent: getPct(s),
    complete: getPct(s) === 100,
  }));
  const overall = progressFromStages(overallStages);

  const setPercent = (key: string, percent: number) => {
    setOptimistic((o) => ({ ...o, [key]: percent }));
    start(async () => {
      try {
        await setStagePercent(trackId, key, percent);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  const toggle = (key: string, current: boolean) => {
    setOptimistic((o) => ({ ...o, [key]: current ? 0 : 100 }));
    start(async () => {
      try {
        await toggleStage(trackId, key, !current);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Production Stages
          </h3>
          <span className="text-sm font-medium tabular-nums">{overall}%</span>
        </div>
        <ul className="flex flex-col gap-3">
          {ordered.map((s) => {
            const pct = getPct(s);
            const complete = pct === 100;
            return (
              <li
                key={s.stage_key}
                className="grid grid-cols-[20px_minmax(0,1fr)_44px] items-center gap-3"
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(s.stage_key, complete)}
                  aria-label={`Mark ${STAGE_LABELS[s.stage_key as keyof typeof STAGE_LABELS]} ${complete ? "incomplete" : "complete"}`}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
                    complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface-2 hover:border-primary/50",
                  )}
                >
                  {complete && <Check className="h-3 w-3" />}
                </button>

                <StageBar
                  label={
                    STAGE_LABELS[s.stage_key as keyof typeof STAGE_LABELS] ??
                    s.stage_key
                  }
                  pct={pct}
                  disabled={pending}
                  onCommit={(next) => setPercent(s.stage_key, next)}
                />

                <span className="text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function StageBar({
  label,
  pct,
  disabled,
  onCommit,
}: {
  label: string;
  pct: number;
  disabled: boolean;
  onCommit: (pct: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const next = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    onCommit(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">{label}</span>
      <div
        ref={barRef}
        role="slider"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            onCommit(Math.min(100, pct + 5));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            onCommit(Math.max(0, pct - 5));
          } else if (e.key === "Home") {
            e.preventDefault();
            onCommit(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onCommit(100);
          }
        }}
        className={cn(
          "h-2 cursor-pointer overflow-hidden rounded-full bg-surface-2 outline-none ring-ring focus-visible:ring-2",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
