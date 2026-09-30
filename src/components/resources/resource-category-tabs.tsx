"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, GripVertical, LayoutGrid, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { reorderResourceCategories } from "@/app/actions/resources";
import type { ResourceCategoryId } from "@/lib/data/resources";
import { moveItemTo } from "@/lib/task-order";
import { cn } from "@/lib/utils";
import { RESOURCE_CATEGORY_ICONS } from "./resource-category-icons";

type TabCategory = { id: ResourceCategoryId; title: string };

const TAB_CLASS =
  // -mb-px lets the active underline sit on top of the row's divider.
  "-mb-px flex shrink-0 flex-col items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 transition-colors";

/**
 * The category switcher. Normally a row of links; "Rearrange" turns the
 * categories (not "All", which is the landing page and stays first) into
 * draggable tabs, with the same Pointer Events drag and arrow-key path as the
 * pinned-track rows, then "Done" goes back to links. The order is saved on
 * every move, so there is nothing to confirm.
 */
export function ResourceCategoryTabs({
  categories,
  activeCategoryId,
}: {
  categories: TabCategory[];
  activeCategoryId: ResourceCategoryId | null;
}) {
  const [optimistic, applyOptimistic] = useOptimistic<TabCategory[], string[]>(
    categories,
    (state, ids) => {
      const byId = new Map(state.map((c) => [c.id, c]));
      return ids.map((id) => byId.get(id as ResourceCategoryId)!).filter(Boolean);
    },
  );
  const [, startTransition] = useTransition();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const tabRefs = useRef(new Map<string, HTMLElement>());
  // Keeps the tab you are moving with the keyboard focused across the re-render.
  const focusAfter = useRef<string | null>(null);

  const commitOrder = (ordered: TabCategory[]) => {
    const ids = ordered.map((c) => c.id);
    startTransition(async () => {
      applyOptimistic(ids);
      const { error } = await reorderResourceCategories({ orderedIds: ids });
      if (error) toast(error);
    });
  };

  const tabIdAtPoint = (clientX: number): string | null => {
    for (const [id, el] of tabRefs.current) {
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return id;
    }
    return null;
  };

  const endDrag = () => {
    if (dragId && overId && dragId !== overId) {
      commitOrder(moveItemTo(optimistic, dragId, overId));
    }
    setDragId(null);
    setOverId(null);
  };

  const nudge = (id: string, delta: -1 | 1) => {
    const from = optimistic.findIndex((c) => c.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= optimistic.length) return;
    focusAfter.current = id;
    commitOrder(moveItemTo(optimistic, id, optimistic[to].id));
  };

  const dragIndex = dragId ? optimistic.findIndex((c) => c.id === dragId) : -1;
  const overIndex = overId ? optimistic.findIndex((c) => c.id === overId) : -1;

  return (
    <div className="flex items-start gap-2">
      <nav
        aria-label="Resource categories"
        className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1"
      >
        <div className="flex min-w-max items-stretch gap-1 border-b border-border">
          <Link
            href="/resources"
            aria-current={activeCategoryId === null ? "page" : undefined}
            className={cn(
              TAB_CLASS,
              activeCategoryId === null
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
              editing && "opacity-50",
            )}
          >
            <LayoutGrid className="h-5 w-5" aria-hidden />
            <span className="whitespace-nowrap text-xs font-medium">All</span>
          </Link>

          {optimistic.map((category, index) => {
            const Icon = RESOURCE_CATEGORY_ICONS[category.id];
            const active = activeCategoryId === category.id;

            if (!editing) {
              return (
                <Link
                  key={category.id}
                  href={`/resources/${category.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    TAB_CLASS,
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="whitespace-nowrap text-xs font-medium">
                    {category.title}
                  </span>
                </Link>
              );
            }

            const dropEdge =
              dragId && overId === category.id && dragId !== category.id
                ? dragIndex < overIndex
                  ? "right"
                  : "left"
                : null;

            return (
              <button
                key={category.id}
                type="button"
                ref={(el) => {
                  if (el) {
                    tabRefs.current.set(category.id, el);
                    if (focusAfter.current === category.id) {
                      focusAfter.current = null;
                      el.focus();
                    }
                  } else {
                    tabRefs.current.delete(category.id);
                  }
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragId(category.id);
                  setOverId(category.id);
                }}
                onPointerMove={(e) => {
                  if (!dragId) return;
                  const id = tabIdAtPoint(e.clientX);
                  if (id) setOverId(id);
                }}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    nudge(category.id, -1);
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    nudge(category.id, 1);
                  }
                }}
                aria-label={`Reorder ${category.title}, position ${index + 1} of ${optimistic.length}. Use the left and right arrow keys to move it.`}
                title="Drag to rearrange"
                // `touch-action: none` stops the drag from scrolling the row
                // (or the page) on a phone.
                className={cn(
                  TAB_CLASS,
                  "relative cursor-grab touch-none border-transparent text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
                  dragId === category.id && "opacity-40",
                  dropEdge === "left" && "border-l-2 border-l-primary",
                  dropEdge === "right" && "border-r-2 border-r-primary",
                )}
              >
                <GripVertical
                  className="absolute left-0 top-1 h-3.5 w-3.5 text-muted-foreground/50"
                  aria-hidden
                />
                <Icon className="h-5 w-5" aria-hidden />
                <span className="whitespace-nowrap text-xs font-medium">
                  {category.title}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {categories.length > 1 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground"
          onClick={() => setEditing((v) => !v)}
          aria-pressed={editing}
        >
          {editing ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Done
            </>
          ) : (
            <>
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
              Rearrange
            </>
          )}
        </Button>
      )}
    </div>
  );
}
