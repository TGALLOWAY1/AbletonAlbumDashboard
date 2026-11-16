import type { WidgetType } from "@/lib/dashboard/widgets";

/**
 * A schematic of each widget for the gallery — the gist of what it looks
 * like, drawn from a few shapes rather than rendered from data.
 *
 * Not a live preview on purpose: the gallery lists every widget, and
 * rendering them all for real would run every widget's queries to help
 * someone pick one. These cost nothing and say enough — a ring, bars, a
 * list, a clock face — to tell the widgets apart at a glance. A type with no
 * sketch falls back to plain lines, so adding a widget never breaks the
 * gallery.
 */

const line = "rounded-full bg-foreground/15";
const lineSoft = "rounded-full bg-foreground/8";
const green = "bg-primary";

function Rows({ count = 3, check = false }: { count?: number; check?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className={
              check
                ? `h-2.5 w-2.5 shrink-0 rounded-[3px] border border-foreground/25 ${i === count - 1 ? "border-primary bg-primary" : ""}`
                : "h-3.5 w-3.5 shrink-0 rounded-[3px] bg-foreground/15"
            }
          />
          <span className={`h-1.5 ${line}`} style={{ width: `${78 - i * 14}%` }} />
        </div>
      ))}
    </div>
  );
}

function Sketch({ type }: { type: WidgetType }) {
  switch (type) {
    case "current-track":
      return (
        <div className="flex h-full w-full flex-col justify-end gap-1.5 rounded-md bg-gradient-to-br from-foreground/75 to-foreground/45 p-2.5">
          <span className="h-2 w-2/5 rounded-full bg-white/85" />
          <span className="h-1.5 w-1/4 rounded-full bg-white/45" />
          <span className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
            <span className={`block h-full w-1/2 ${green}`} />
          </span>
        </div>
      );
    case "pinned-tracks":
      return <Rows count={4} />;
    case "tasks":
      return <Rows count={4} check />;
    case "suno-queue":
      return (
        <div className="flex w-full flex-wrap gap-1.5">
          {[38, 52, 30, 44, 36].map((w, i) => (
            <span key={i} className={`h-3.5 ${i % 2 ? lineSoft : line}`} style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    case "quick-actions":
      return (
        <div className="grid h-full w-full grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`rounded-md border border-foreground/12 ${i === 2 ? "border-primary/40 bg-primary/15" : "bg-surface"}`}
            />
          ))}
        </div>
      );
    case "focus-timer":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md bg-gradient-to-br from-foreground/75 to-foreground/45">
          <span className="font-mono text-lg font-semibold leading-none text-white/90">
            25:00
          </span>
          <span className={`h-2.5 w-14 rounded-full ${green}`} />
        </div>
      );
    case "work-heatmap":
      return (
        <div className="grid w-full grid-cols-9 gap-1">
          {Array.from({ length: 36 }, (_, i) => {
            const level = [0, 2, 1, 3, 0, 4, 2, 1, 3][(i * 5) % 9];
            return (
              <span
                key={i}
                className="aspect-square rounded-[3px] bg-primary"
                style={{ opacity: level === 0 ? 0.1 : 0.2 + level * 0.2 }}
              />
            );
          })}
        </div>
      );
    case "progress-overview":
      return (
        <div className="flex w-full items-center gap-3">
          <span
            className="h-12 w-12 shrink-0 rounded-full"
            style={{
              background:
                "conic-gradient(var(--color-primary) 0 58%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0)",
              mask: "radial-gradient(circle, transparent 54%, #000 55%)",
              WebkitMask: "radial-gradient(circle, transparent 54%, #000 55%)",
            }}
          />
          <div className="flex flex-1 flex-col gap-1.5">
            {[80, 60, 70].map((w, i) => (
              <span key={i} className={`h-1.5 ${line}`} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      );
    case "recent-sessions":
      return (
        <div className="flex w-full flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full bg-primary/25" />
              <span className={`h-1.5 flex-1 ${line}`} />
              <span className={`h-1.5 w-1/5 ${lineSoft}`} />
            </div>
          ))}
        </div>
      );
    case "weekly-activity":
      return (
        <div className="flex h-full w-full items-end gap-1.5">
          {[20, 45, 80, 55, 100, 35, 40].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t-[3px] bg-primary"
              style={{ height: `${h}%`, opacity: 0.35 + (h / 100) * 0.65 }}
            />
          ))}
        </div>
      );
    case "goals":
      return (
        <div className="flex w-full flex-col gap-2.5">
          {[70, 45, 15].map((w, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className={`h-1.5 w-1/2 ${line}`} />
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <span className={`block h-full ${green}`} style={{ width: `${w}%` }} />
              </span>
            </div>
          ))}
        </div>
      );
    default:
      return <Rows count={3} />;
  }
}

export function WidgetPreview({ type }: { type: WidgetType }) {
  return (
    <div
      aria-hidden
      className="flex h-24 items-center justify-center rounded-md border border-border bg-surface-2/60 p-3"
    >
      <Sketch type={type} />
    </div>
  );
}
