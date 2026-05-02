import { cn } from "@/lib/utils";

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function bars(seed: number, count: number): number[] {
  const out: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < count; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s >>> 0) / 0xffffffff;
    out.push(0.18 + v * 0.82);
  }
  return out;
}

export function MiniWaveform({
  id,
  bars: count = 56,
  height = 28,
  className,
}: {
  id: string;
  bars?: number;
  height?: number;
  className?: string;
}) {
  const seed = hashString(id);
  const heights = bars(seed, count);
  const gap = 1;
  const barWidth = 2;
  const totalWidth = count * (barWidth + gap);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={cn("text-muted-foreground/70", className)}
      aria-hidden
    >
      {heights.map((h, i) => {
        const barH = Math.max(2, h * height);
        const y = (height - barH) / 2;
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={y}
            width={barWidth}
            height={barH}
            rx={1}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
