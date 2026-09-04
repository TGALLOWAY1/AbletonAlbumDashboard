import Link from "next/link";
import {
  AudioLines,
  CalendarDays,
  Clock,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CoverArt } from "@/components/cover-art";
import { TrackCardActions } from "@/components/track-card-actions";
import { DeleteTrackMenuItem } from "@/components/delete-track-menu-item";
import { sunoBadgeLabel } from "@/lib/suno";
import { STATUS_LABELS } from "@/lib/track-filters";
import type { SessionStats } from "@/lib/data/sessions";
import { TRACK_STATUSES, type TrackStatus, type TrackWithDetails } from "@/lib/types";
import { cn, formatDuration, formatMinutes } from "@/lib/utils";

// Presentational pieces shared by every way a track is drawn: the list card
// (`TrackCard`), the compact list rows, and the gallery tiles. Keeping them
// here means a track shows the same badges, bars, and menu at every density.
//
// Cards deliberately do not name their album: `/tracks` and `/albums` both
// group by album already, so repeating the title on every card underneath the
// heading was noise. The album lives on the track detail header instead.

export type { SessionStats };

export function TrackCover({
  track,
  className,
  textClassName,
  sizes,
  children,
}: {
  track: Pick<TrackWithDetails, "name" | "cover_image_url">;
  className?: string;
  /** Sizing for the initials fallback. */
  textClassName?: string;
  /**
   * CSS `sizes` for the slot this cover fills. Required because the same
   * component draws a 32px list bullet and a 640px gallery tile, and only the
   * call site knows which — see `CoverArt`.
   */
  sizes: string;
  /** Overlay content — rendered above the artwork. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/20 via-surface-2 to-accent/15",
        className,
      )}
    >
      {track.cover_image_url ? (
        <CoverArt src={track.cover_image_url} sizes={sizes} />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-foreground/30",
            textClassName,
          )}
        >
          {track.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Density for the shared meta pieces. `sm` is the long-standing card/row
 * treatment; `md` is the roomier one the large mobile card uses, where the
 * meta line is a primary read rather than a footnote. Sizing only — the same
 * stats, in the same order, either way.
 */
export type MetaSize = "sm" | "md";

const META_SIZING: Record<
  MetaSize,
  { row: string; icon: string; iconGap: string }
> = {
  sm: { row: "gap-x-3 gap-y-1 text-xs", icon: "h-3.5 w-3.5", iconGap: "gap-1.5" },
  // Four stats have to share one line on a phone, so `md` buys its larger
  // type back out of the gaps. It still wraps gracefully on narrow handsets.
  md: {
    row: "gap-x-2 gap-y-1.5 text-[12.5px]",
    icon: "h-[15px] w-[15px]",
    iconGap: "gap-1",
  },

};

export function MetaStat({
  icon: Icon,
  value,
  emphasis = false,
  warn = false,
  size = "sm",
}: {
  icon: LucideIcon;
  value: string;
  emphasis?: boolean;
  warn?: boolean;
  size?: MetaSize;
}) {
  return (
    <span
      className={cn(
        "flex items-center",
        META_SIZING[size].iconGap,
        warn
          ? "text-warning"
          : emphasis
            ? "text-foreground"
            : "text-muted-foreground",
      )}
    >
      <Icon className={cn("shrink-0", META_SIZING[size].icon)} />
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}

export function MetaRow({
  stats,
  lastWorked,
  stale,
  estMinutes,
  size = "sm",
}: {
  /** Omitted when the caller has not loaded session aggregates — the logged
   *  time and session count are then left out rather than shown as zeroes. */
  stats?: SessionStats;
  lastWorked: string;
  stale: boolean;
  estMinutes: number;
  size?: MetaSize;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center",
        META_SIZING[size].row,
      )}
    >
      {stats && (
        <>
          <MetaStat
            icon={Clock}
            value={formatDuration(stats.seconds)}
            size={size}
          />
          <MetaStat
            icon={AudioLines}
            value={`${stats.count} ${stats.count === 1 ? "session" : "sessions"}`}
            size={size}
          />
        </>
      )}
      <MetaStat
        icon={CalendarDays}
        value={lastWorked}
        warn={stale}
        size={size}
      />
      {estMinutes > 0 && (
        <MetaStat
          icon={Hourglass}
          value={`${formatMinutes(estMinutes)} left`}
          emphasis
          size={size}
        />
      )}
    </div>
  );
}

// Lightweight signal only — the Suno controls live on the track detail page.
export function SunoChip({ suno }: { suno: TrackWithDetails["sunoExperiment"] }) {
  if (!suno) return null;
  const label = sunoBadgeLabel(suno);
  if (!label) return null;
  return (
    <Badge variant={suno.unreviewedCount > 0 ? "warning" : "accent"}>
      {label}
    </Badge>
  );
}

// A status badge for everything except "active": active is the default,
// working state every track starts in, so flagging it on every card would be
// noise. Backlog/completed/archived are the states worth a glance — muted so
// they read as a label, not an alert.
const STATUS_BADGE_VARIANT: Partial<Record<TrackStatus, BadgeProps["variant"]>> = {
  backlog: "default",
  completed: "default",
  archived: "default",
};

export function TrackStatusBadge({
  status,
  className,
}: {
  // `TrackRow["status"]` is a plain `string` in the generated Supabase types
  // (a text column, not a Postgres enum), so this narrows the same way
  // `trackSunoStatus` does rather than assuming the union.
  status: string;
  className?: string;
}) {
  if (!TRACK_STATUSES.includes(status as TrackStatus)) return null;
  const known = status as TrackStatus;
  if (known === "active") return null;
  return (
    <Badge
      variant={STATUS_BADGE_VARIANT[known] ?? "default"}
      className={cn("shrink-0", className)}
    >
      {STATUS_LABELS[known]}
    </Badge>
  );
}

/** Read-only tag pills for a card — up to `max`, with a "+N" overflow. */
export function TrackTagChips({
  tags,
  max = 3,
  className,
}: {
  tags: string[];
  max?: number;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((tag) => (
        <span
          key={tag}
          className="truncate rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export function TaskBar({
  completed,
  total,
  className,
  size = "sm",
}: {
  completed: number;
  total: number;
  className?: string;
  size?: MetaSize;
}) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  const md = size === "md";
  return (
    <div className={cn("flex items-center", md ? "gap-3" : "gap-2", className)}>
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-surface-2",
          md ? "h-2" : "h-1.5",
        )}
      >
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span
        className={cn(
          "shrink-0 font-medium tabular-nums text-muted-foreground",
          md ? "text-[13px]" : "text-xs",
        )}
      >
        {completed} of {total}
      </span>
    </div>
  );
}

/** Thin progress strip pinned to the bottom of a cover tile. */
export function ProgressStrip({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="absolute inset-x-0 bottom-0 h-1 bg-foreground/15">
      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function NextAction({ description }: { description?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Next Action
      </div>
      {description ? (
        <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">
          {description}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No next action set</p>
      )}
    </div>
  );
}

/** The per-track overflow menu. `children` is the trigger element. */
export function TrackActionsMenu({
  track,
  children,
}: {
  track: Pick<TrackWithDetails, "id" | "name" | "status">;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/tracks/${track.id}`}>Open detail</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/tracks/${track.id}/edit`}>Edit metadata</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <TrackCardActions trackId={track.id} status={track.status} />
        <DropdownMenuSeparator />
        <DeleteTrackMenuItem trackId={track.id} trackName={track.name} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
