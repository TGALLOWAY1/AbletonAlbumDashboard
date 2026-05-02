import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const PALETTES: Array<[string, string, string]> = [
  ["#1f2540", "#3b3a78", "#7a4ed1"],
  ["#0f2933", "#15576a", "#3aa1a4"],
  ["#241a3a", "#523680", "#9461c9"],
  ["#1c2c1f", "#2f5c3a", "#69ad6a"],
  ["#3a1f1f", "#7a3331", "#d96a4f"],
  ["#1f2842", "#324781", "#5b8df0"],
  ["#2a1f3a", "#5d3a72", "#b97ad9"],
  ["#252b1c", "#525a2c", "#a3b04a"],
];

function paletteFor(seed: string): [string, string, string] {
  return PALETTES[hashString(seed) % PALETTES.length];
}

function bars(seed: number, count: number): number[] {
  const out: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < count; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out.push(0.2 + (s / 0xffffffff) * 0.8);
  }
  return out;
}

export function TemplateThumbnail({
  seed,
  showPlay = true,
  className,
}: {
  seed: string;
  showPlay?: boolean;
  className?: string;
}) {
  const [c1, c2, c3] = paletteFor(seed);
  const heights = bars(hashString(seed), 64);

  return (
    <div
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden rounded-md",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 320 64"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-1/2 h-1/2 w-full -translate-y-1/2 opacity-70"
        aria-hidden
      >
        {heights.map((h, i) => {
          const barW = 320 / heights.length;
          const barH = h * 64;
          return (
            <rect
              key={i}
              x={i * barW}
              y={(64 - barH) / 2}
              width={barW * 0.6}
              height={barH}
              rx={1}
              fill="white"
              opacity={0.55}
            />
          );
        })}
      </svg>
      {showPlay && (
        <span className="pointer-events-none absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-transform group-hover:scale-105">
          <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
        </span>
      )}
    </div>
  );
}
