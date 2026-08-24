"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast";
import { readNavStack, replaceTop, writeNavStack } from "@/lib/nav-stack";
import { cn } from "@/lib/utils";
import {
  RESOURCE_CATEGORIES,
  type ResourceCategoryId,
  type ResourceItem,
} from "@/lib/data/resources";
import {
  deleteResource,
  toggleResourceBookmark,
  updateResourceCategory,
} from "@/app/actions/resources";

/**
 * Category, bookmark and delete for a single resource, on its own page. Seed
 * entries have no row behind them, so they get none of the three.
 */
export function ResourceDetailActions({
  resource,
}: {
  resource: ResourceItem;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  // The picker shows the new category while the move is in flight; React drops
  // back to the prop if the action fails.
  const [categoryId, setCategoryId] = React.useOptimistic<ResourceCategoryId>(
    resource.categoryId,
  );

  if (resource.id.startsWith("seed-")) return null;

  const bookmarked = resource.bookmarked ?? false;

  // Both actions below navigate off a page that no longer resolves, so they
  // replace rather than push. `router.replace` leaves browser history alone,
  // so the nav stack has to swap the dead entry out instead of letting the
  // tracker append one — an appended entry would tell the destination's
  // BackLink there is history to return to when the browser has none.
  function replaceWith(destination: string) {
    writeNavStack(replaceTop(readNavStack(), pathname, destination));
    router.replace(destination);
  }

  function handleCategoryChange(next: string) {
    if (next === resource.categoryId) return;
    startTransition(async () => {
      setCategoryId(next as ResourceCategoryId);
      const result = await updateResourceCategory(resource.id, next);
      if (result?.error) {
        toast(result.error);
        return;
      }
      // The category is part of this page's path, so the URL the user is on
      // no longer resolves.
      replaceWith(result.destination ?? `/resources/${next}/${resource.id}`);
    });
  }

  function handleBookmark() {
    startTransition(async () => {
      const result = await toggleResourceBookmark(resource.id);
      if (result?.error) toast(result.error);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this resource? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteResource(resource.id);
      if (result?.error) {
        toast(result.error);
        return;
      }
      // The row is gone — this page would 404 on refresh.
      replaceWith(`/resources/${resource.categoryId}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={categoryId}
        onValueChange={handleCategoryChange}
        disabled={pending}
      >
        <SelectTrigger
          aria-label="Category"
          className="h-8 w-auto min-w-44 gap-2 text-xs"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <FolderOpen
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {RESOURCE_CATEGORIES.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleBookmark}
        disabled={pending}
        aria-pressed={bookmarked}
      >
        <Bookmark className={cn("h-3.5 w-3.5", bookmarked && "fill-current")} />
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={pending}
        className="text-danger hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}
