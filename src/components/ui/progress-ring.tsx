import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className,
  labelClassName,
  showLabel = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** Overrides the default label type scale (e.g. a bolder read on a card). */
  labelClassName?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  const glowIntensity = Math.pow(clamped / 100, 2);
  const glowRadius = 1 + glowIntensity * 7;
  const glowOpacity = 0.15 + glowIntensity * 0.65;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center text-primary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 300ms ease, filter 300ms ease",
            filter: `drop-shadow(0 0 ${glowRadius}px color-mix(in oklab, currentColor ${Math.round(
              glowOpacity * 100,
            )}%, transparent))`,
          }}
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            "absolute text-xs font-semibold text-foreground tabular-nums",
            labelClassName,
          )}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
