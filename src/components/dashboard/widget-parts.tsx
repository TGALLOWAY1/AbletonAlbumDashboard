import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The pieces a widget's interior is built from.
 *
 * A widget component renders what goes *inside* the card — the frame (border,
 * surface, grid cell, edit controls) belongs to the dashboard. These parts
 * give every widget the same header height, gutters and empty state, so a
 * dozen widgets by different hands still read as one surface. No hooks and no
 * "use client": they work in server and client widgets alike.
 *
 * SIZING — a widget is never told its size. It sits in a box that is a CSS
 * size container named `widget`, and decides what to show with container
 * queries against that box:
 *
 *   width    `@xs/widget:` (20rem) `@sm/widget:` (24rem) `@md/widget:` (28rem)
 *            `@lg/widget:` (32rem) … Tailwind's container scale.
 *   height   `widget-h3:` `widget-h4:` `widget-h5:` — at least that many grid
 *            rows tall (see globals.css).
 *   stacked  `dash-stack:` — the single-column phone arrangement, where the
 *            box is as tall as the content and the height variants do not
 *            match.
 *
 * Write the smallest version first and add to it: a widget dragged larger
 * should show *more* (another column of figures, the next task, a legend),
 * not the same thing scaled up. Because it is all CSS it responds while the
 * user is still dragging the resize handle, with no round trip.
 */

/** The widget's title row. `action` sits at the right edge — a "+" or a link. */
export function WidgetHeader({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  /** Secondary text after the title: a count, the window being measured. */
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center justify-between gap-2 px-4",
        className,
      )}
    >
      <h2 className="flex min-w-0 items-baseline gap-1.5 text-sm font-semibold tracking-tight">
        <span className="truncate">{title}</span>
        {meta != null && (
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            {meta}
          </span>
        )}
      </h2>
      {action != null && (
        <div className="flex shrink-0 items-center gap-1">{action}</div>
      )}
    </div>
  );
}

/**
 * The widget's content area. Fills what the header leaves and, where the box
 * has a fixed height, scrolls inside it (`scroll={false}` for content that
 * fits itself to the box, like a chart).
 */
export function WidgetBody({
  children,
  className,
  scroll = true,
}: {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 px-4 pb-4",
        scroll && "dash-scroll",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * What a widget shows when there is nothing to show yet. Says what would be
 * here and how to put it there — never a bare "No data".
 */
export function WidgetEmpty({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-24 flex-col items-center justify-center gap-1.5 px-2 py-3 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {hint != null && (
        <p className="max-w-[28ch] text-xs text-muted-foreground">{hint}</p>
      )}
      {action != null && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

/** The placeholder a widget shows while its data is on the way. */
export function WidgetSkeleton({ name }: { name: string }) {
  return (
    <div
      className="flex h-full min-h-28 flex-col"
      role="status"
      aria-label={`Loading ${name}`}
    >
      <div className="flex h-11 shrink-0 items-center px-4">
        <span className="h-3.5 w-28 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4">
        <span className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
        <span className="h-3 w-3/5 animate-pulse rounded bg-surface-2" />
        <span className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}
