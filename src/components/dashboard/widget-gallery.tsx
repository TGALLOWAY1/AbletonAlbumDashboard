"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { WidgetPreview } from "@/components/dashboard/widget-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_WIDGETS,
  canAddWidget,
  countOfType,
  type DashboardLayout,
} from "@/lib/dashboard/layout";
import {
  WIDGET_CATEGORIES,
  WIDGET_SIZES,
  WIDGET_TYPES,
  widgetDefinition,
  type WidgetCategory,
  type WidgetType,
} from "@/lib/dashboard/widgets";
import { cn } from "@/lib/utils";

/**
 * The widget gallery: everything that can go on the dashboard, to browse and
 * add.
 *
 * It is drawn entirely from the registry — name, blurb, category, sizes — so
 * a widget registered there appears here with no change to this file. Each
 * card says what the widget is *for* in a sentence and sketches what it looks
 * like; nothing here names a component or a data source.
 *
 * A card also says what is already on the dashboard. Widgets that only make
 * sense once (the shortlist, the timer) show "On your dashboard" in place of
 * the button; widgets that can repeat say how many copies there are and stay
 * addable, because a second Tasks widget pointed at a different track is the
 * point of having instances.
 */
export function WidgetGallery({
  open,
  onOpenChange,
  layout,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The draft being edited — decides what is already present. */
  layout: DashboardLayout;
  onAdd: (type: WidgetType) => void;
}) {
  const [category, setCategory] = useState<WidgetCategory | "all">("all");
  const full = layout.items.length >= MAX_WIDGETS;
  const shown = WIDGET_TYPES.filter(
    (type) => category === "all" || widgetDefinition(type).category === category,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 p-0 sm:p-0">
        <DialogHeader className="border-b border-border p-4 pr-14 sm:p-6 sm:pr-16">
          <DialogTitle>Add a widget</DialogTitle>
          <DialogDescription>
            {full
              ? `This dashboard is full (${MAX_WIDGETS} widgets). Remove one to add another.`
              : "Pick what you want on your dashboard. You can move and resize it afterwards."}
          </DialogDescription>
          <div
            role="tablist"
            aria-label="Widget categories"
            className="-mx-1 mt-2 flex flex-wrap gap-1.5 px-1"
          >
            {[{ id: "all" as const, label: "All" }, ...WIDGET_CATEGORIES].map((c) => {
              const active = c.id === category;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {shown.map((type) => {
            const definition = widgetDefinition(type);
            const Icon = definition.icon;
            const present = countOfType(layout, type);
            const addable = canAddWidget(layout, type);
            return (
              <li
                key={type}
                className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3"
              >
                <WidgetPreview type={type} />
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {definition.name}
                  </h3>
                </div>
                <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                  {definition.description}
                </p>
                <ul className="flex flex-wrap gap-1" aria-label="Sizes">
                  {definition.sizes.map((size) => (
                    <li
                      key={size}
                      title={`${WIDGET_SIZES[size].label} — ${WIDGET_SIZES[size].blurb}`}
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                        size === definition.defaultSize
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {WIDGET_SIZES[size].label}
                    </li>
                  ))}
                </ul>
                <div className="flex min-h-8 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    {present > 0 && (
                      <>
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">
                          {definition.multiple
                            ? `${present} on your dashboard`
                            : "On your dashboard"}
                        </span>
                      </>
                    )}
                    {present === 0 && !addable && "Dashboard full"}
                  </span>
                  {addable && (
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => onAdd(type)}
                      aria-label={`Add ${definition.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      {present > 0 ? "Add another" : "Add"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
