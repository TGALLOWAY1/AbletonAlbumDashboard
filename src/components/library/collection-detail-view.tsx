"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { LibraryPlayTile } from "@/components/library/library-play-tile";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { LibraryConfirmDialog } from "@/components/library/library-confirm-dialog";
import { CollectionFormDialog } from "@/components/library/collection-form-dialog";
import { AddToCollectionDialog } from "@/components/library/add-to-collection-dialog";
import { useSyncPlayerQueue } from "@/components/library/library-player-provider";
import {
  deleteCollection,
  moveCollectionItem,
  removeFromCollection,
} from "@/app/actions/library";
import type { CollectionDetail } from "@/lib/data/library-db";
import {
  PRESET_CATEGORY_LABELS,
  loopStackSubtitle,
  toPlayableLoopStack,
  toPlayablePreset,
  type PlayableAsset,
} from "@/lib/data/library";

/**
 * A collection is a view onto assets, never a copy of them. Removing an item
 * here deletes only the membership row; deleting the collection leaves every
 * asset in the library.
 */
export function CollectionDetailView({ detail }: { detail: CollectionDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const { collection, items } = detail;

  const [editOpen, setEditOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<{
    itemId: string;
    name: string;
  } | null>(null);
  const [pending, setPending] = React.useState(false);

  const queue: PlayableAsset[] = React.useMemo(
    () =>
      items.map((item) =>
        item.type === "loopStack"
          ? toPlayableLoopStack(item.asset)
          : toPlayablePreset(item.asset),
      ),
    [items],
  );

  // This view owns the visible result set while it is mounted, so the player's
  // previous/next walks the collection in its own order.
  useSyncPlayerQueue(queue);

  const move = async (itemId: string, direction: "up" | "down") => {
    setPending(true);
    try {
      await moveCollectionItem(itemId, direction);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't reorder that item.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/library"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Library
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
              {collection.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length === 1 ? "1 item" : `${items.length} items`}
              {collection.description ? ` · ${collection.description}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add from library
        </Button>
      </div>

      {items.length === 0 ? (
        <LibraryEmptyState
          icon={Layers}
          title="Nothing in here yet"
          body="Add the Loop Stacks and presets you reach for together."
          actionLabel="Add from library"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {items.map((item, index) => {
            const asset = item.asset;
            const playable = queue[index];
            const subtitle =
              item.type === "loopStack"
                ? loopStackSubtitle(item.asset) || "Loop Stack"
                : [
                    item.asset.plugin,
                    PRESET_CATEGORY_LABELS[item.asset.category],
                  ]
                    .filter(Boolean)
                    .join(" · ");

            return (
              <li key={item.itemId} className="flex items-center gap-3 p-3">
                <LibraryPlayTile
                  asset={playable}
                  queue={queue}
                  className="w-14 shrink-0"
                  waveformBars={10}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                    {subtitle}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label={`Move ${asset.name} up`}
                    disabled={index === 0 || pending}
                    onClick={() => move(item.itemId, "up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`Move ${asset.name} down`}
                    disabled={index === items.length - 1 || pending}
                    onClick={() => move(item.itemId, "down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${asset.name} from this collection`}
                    onClick={() =>
                      setRemoveTarget({ itemId: item.itemId, name: asset.name })
                    }
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CollectionFormDialog
        open={editOpen}
        collection={collection}
        onOpenChange={setEditOpen}
      />

      <AddToCollectionDialog
        open={addOpen}
        collection={collection}
        loopStacks={detail.allLoopStacks}
        presets={detail.allPresets}
        onOpenChange={setAddOpen}
      />

      <LibraryConfirmDialog
        open={removeTarget !== null}
        title={`Remove “${removeTarget?.name ?? ""}”?`}
        body="It comes out of this collection but stays in your library."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeFromCollection(removeTarget.itemId);
          router.refresh();
          toast(`Removed “${removeTarget.name}” from ${collection.name}`);
        }}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      />

      <LibraryConfirmDialog
        open={deleteOpen}
        title={`Delete “${collection.name}”?`}
        body="The collection goes away. Every Loop Stack and preset in it stays in your library."
        confirmLabel="Delete collection"
        onConfirm={async () => {
          await deleteCollection(collection.id);
          toast(`Deleted “${collection.name}”`);
          router.push("/library");
        }}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
