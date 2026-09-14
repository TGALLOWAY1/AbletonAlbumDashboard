"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Bookmark,
  FolderOpen,
  Pin,
  Trash2,
} from "lucide-react";
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
  setResourceArchived,
  setResourcePinned,
  toggleResourceBookmark,
  updateResourceCategory,
} from "@/app/actions/resources";
import { EditResourceDialog } from "./edit-resource-dialog";

/**
 * Everything you can do to a resource from its own page: move it, edit it,
 * pin it, bookmark it, mark it learned, delete it. Seed entries have no row
 * behind them, so they get none of it.
 *
 * Pin and Archive are opposites and sit next to each other on purpose. A pin
 * says "keep this in front of me"; archiving says "I've taken what I need" —
 * and archiving is the only thing that writes the learning log the activity
 * map on /resources is drawn from, so it clears the pin as it goes (see
 * `setResourceArchived`).
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
  const archived = Boolean(resource.archivedAt);
  const pinned = Boolean(resource.pinnedAt);

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

  function handlePin() {
    startTransition(async () => {
      const result = await setResourcePinned(resource.id, !pinned);
      if (result?.error) toast(result.error);
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await setResourceArchived(resource.id, !archived);
      if (result?.error) {
        toast(result.error);
        return;
      }
      // Worth saying out loud: archiving moves the resource off the gallery
      // and onto the learned shelf, and the number on /resources moves with
      // it. Silently vanishing from the category would look like a bug.
      toast(
        archived
          ? "Back in the library."
          : "Marked learned — it's on the Learned shelf now.",
      );
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
      <EditResourceDialog resource={resource} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePin}
        disabled={pending || archived}
        aria-pressed={pinned}
        title={
          archived
            ? "Restore it to the library to pin it"
            : "Show this cover on the shelf at the top of Resources"
        }
      >
        <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
        {pinned ? "Pinned" : "Pin"}
      </Button>
      <Button
        type="button"
        variant={archived ? "outline" : "default"}
        size="sm"
        onClick={handleArchive}
        disabled={pending}
      >
        {archived ? (
          <ArchiveRestore className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
        {archived ? "Restore" : "Mark learned"}
      </Button>
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
