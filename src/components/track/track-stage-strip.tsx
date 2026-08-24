"use client";

import { useRef, useState, useTransition } from "react";
import { setStagePercent } from "@/app/actions/stages";
import { useToast } from "@/components/toast";
import {
  STAGE_KEYS,
  STAGE_LABELS,
  STAGE_SHORT_LABELS,
  type StageRow,
  progressFromStages,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The five production stages as one horizontal band.
 *
 * This lives in the track page's header chrome rather than in a card in the
 * body, which is the whole point: stages are a status readout you glance at,
 * so they cost a strip of header instead of a full section competing with the
 * work surfaces. The bars stay directly editable — click or arrow-key to set a
 * percent, exactly as the old stacked checklist did.
 */
export function TrackStageStrip({
  trackId,
  stages,
  variant = "desktop",
}: {
  trackId: string;
  stages: StageRow[];
  variant?: "desktop" | "mobile";
}) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const byKey = new Map(stages.map((s) => [s.stage_key, s]));
  const ordered = STAGE_KEYS.map((key) => {
    const row = byKey.get(key);
    const stored = row?.percent ?? (row?.complete ? 100 : 0);
    return { key, percent: optimistic[key] ?? stored };
  });
  const overall = progressFromStages(
    ordered.map((s) => ({
      track_id: trackId,
      stage_key: s.key,
      percent: s.percent,
      complete: s.percent === 100,
    })) as StageRow[],
  );

  const commit = (key: string, percent: number) => {
    setOptimistic((o) => ({ ...o, [key]: percent }));
    start(async () => {
      try {
        await setStagePercent(trackId, key, percent);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const mobile = variant === "mobile";

  return (
    <div className="flex items-end gap-3 md:gap-4">
      <div className="grid min-w-0 flex-1 grid-cols-5 gap-1.5 md:gap-2.5">
        {ordered.map(({ key, percent }) => (
          <StageSegment
            key={key}
            label={STAGE_LABELS[key]}
            shortLabel={STAGE_SHORT_LABELS[key]}
            percent={percent}
            disabled={pending}
            compact={mobile}
            onCommit={(next) => commit(key, next)}
          />
        ))}
      </div>
      <div
        className={cn(
          "flex shrink-0 items-baseline gap-1.5 border-l border-border pl-3 md:pl-4",
        )}
      >
        <span
          className={cn(
            "font-semibold tabular-nums",
            mobile ? "text-base" : "text-lg",
          )}
        >
          {overall}%
        </span>
        {!mobile && (
          <span className="text-[10px] text-muted-foreground">overall</span>
        )}
      </div>
    </div>
  );
}

function StageSegment({
  label,
  shortLabel,
  percent,
  disabled,
  compact,
  onCommit,
}: {
  label: string;
  shortLabel: string;
  percent: number;
  disabled: boolean;
  compact: boolean;
  onCommit: (percent: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onCommit(Math.max(0, Math.min(100, Math.round(ratio * 100))));
  };

  return (
    // The whole column is the control, label included. A 6px bar is far too
    // small a tap target on a phone, and padding the bar itself is what broke
    // this strip before: the bar carried the track background, so the padding
    // painted as a fat lozenge that swallowed the fill. The hit area grows
    // here, the background lives on the bar, and `barRef` keeps the click
    // ratio measured against the bar rather than the column.
    <div
      role="slider"
      aria-label={`${label} progress`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${label} ${percent}%`}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onCommit(Math.min(100, percent + 5));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          onCommit(Math.max(0, percent - 5));
        } else if (e.key === "Home") {
          e.preventDefault();
          onCommit(0);
        } else if (e.key === "End") {
          e.preventDefault();
          onCommit(100);
        }
      }}
      className={cn(
        "flex min-w-0 cursor-pointer select-none flex-col gap-1 rounded-md outline-none ring-ring focus-visible:ring-2",
        compact && "py-1",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {!compact && (
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
            {percent}%
          </span>
        </div>
      )}

      <div
        ref={barRef}
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-2",
          compact ? "h-2" : "h-[7px]",
        )}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {compact && (
        <span className="truncate text-center text-[10px] font-medium leading-tight text-muted-foreground">
          {shortLabel}
        </span>
      )}
    </div>
  );
}
