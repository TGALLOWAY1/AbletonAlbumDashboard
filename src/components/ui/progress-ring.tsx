import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "warning" | "danger" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  primary: "text-primary",
  accent: "text-accent",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-muted-foreground",
};

export function toneForProgress(value: number): Tone {
  if (value >= 80) return "primary";
  if (value >= 50) return "accent";
  if (value >= 25) return "warning";
  return "muted";
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  tone,
  className,
  showLabel = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const resolvedTone = tone ?? toneForProgress(clamped);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        TONE_CLASS[resolvedTone],
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
          strokeOpacity={0.18}
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
          style={{ transition: "stroke-dashoffset 300ms ease" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold text-foreground tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
