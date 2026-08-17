import Link from "next/link";
import { LayoutGrid, List, type LucideIcon } from "lucide-react";
import {
  VIEW_LAYOUTS,
  VIEW_LAYOUT_LABELS,
  VIEW_SIZES,
  VIEW_SIZE_ABBREVIATIONS,
  VIEW_SIZE_LABELS,
  viewHref,
  type ViewLayout,
  type ViewPreference,
} from "@/lib/view-mode";
import { cn } from "@/lib/utils";

const LAYOUT_ICONS: Record<ViewLayout, LucideIcon> = {
  gallery: LayoutGrid,
  list: List,
};

// Plain links rather than a client control: the preference lives in the URL, so
// switching views is just a navigation and the pages stay server components.
export function ViewModeToggle({
  basePath,
  value,
  defaults,
  preserveQuery,
  className,
}: {
  basePath: string;
  value: ViewPreference;
  defaults: ViewPreference;
  /** Query string owned by other controls (filters) — carried through. */
  preserveQuery?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Segments label="Layout">
        {VIEW_LAYOUTS.map((layout) => {
          const Icon = LAYOUT_ICONS[layout];
          return (
            <Segment
              key={layout}
              href={viewHref(
                basePath,
                { ...value, layout },
                defaults,
                preserveQuery,
              )}
              active={value.layout === layout}
              label={`${VIEW_LAYOUT_LABELS[layout]} view`}
            >
              <Icon className="h-4 w-4" />
            </Segment>
          );
        })}
      </Segments>

      <Segments label="Size">
        {VIEW_SIZES.map((size) => (
          <Segment
            key={size}
            href={viewHref(basePath, { ...value, size }, defaults, preserveQuery)}
            active={value.size === size}
            label={`${VIEW_SIZE_LABELS[size]} ${VIEW_LAYOUT_LABELS[
              value.layout
            ].toLowerCase()}`}
          >
            <span className="text-xs font-semibold">
              {VIEW_SIZE_ABBREVIATIONS[size]}
            </span>
          </Segment>
        ))}
      </Segments>
    </div>
  );
}

function Segments({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-9 items-center rounded-md border border-border bg-surface-2 p-0.5"
    >
      {children}
    </div>
  );
}

function Segment({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-label={label}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
        active
          ? "bg-surface text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
