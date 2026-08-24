"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import type { ResourceItem } from "@/lib/data/resources";
import {
  deleteResource,
  toggleResourceBookmark,
} from "@/app/actions/resources";

/**
 * Bookmark and delete for a single resource, on its own page. Seed entries have
 * no row behind them, so they get neither.
 */
export function ResourceDetailActions({
  resource,
}: {
  resource: ResourceItem;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();

  if (resource.id.startsWith("seed-")) return null;

  const bookmarked = resource.bookmarked ?? false;

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
      router.replace(`/resources/${resource.categoryId}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
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
