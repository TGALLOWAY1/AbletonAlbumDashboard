"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { CollectionCheckboxes } from "@/components/library/collection-checkboxes";
import { addToCollection, removeFromCollection } from "@/app/actions/library";
import {
  collectionsContaining,
  type LibraryCollection,
} from "@/lib/data/library";

/**
 * Files one asset into (or out of) collections. Only membership rows change —
 * unchecking a collection never deletes the asset.
 */
export function ManageCollectionsDialog({
  asset,
  collections,
  onOpenChange,
}: {
  asset: { id: string; name: string; type: "loopStack" | "preset" } | null;
  collections: LibraryCollection[];
  onOpenChange: (open: boolean) => void;
}) {
  if (!asset) return null;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so the checkbox selection is initialised fresh per asset. */}
        <ManageCollectionsForm
          key={asset.id}
          asset={asset}
          collections={collections}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function ManageCollectionsForm({
  asset,
  collections,
  onOpenChange,
}: {
  asset: { id: string; name: string; type: "loopStack" | "preset" };
  collections: LibraryCollection[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<string[]>(() =>
    collectionsContaining(collections, asset.id).map((c) => c.id),
  );
  const [pending, setPending] = React.useState(false);

  const save = async () => {
    setPending(true);
    try {
      const before = collectionsContaining(collections, asset.id);
      const beforeIds = new Set(before.map((c) => c.id));
      const afterIds = new Set(selected);

      await Promise.all([
        ...selected
          .filter((id) => !beforeIds.has(id))
          .map((id) =>
            addToCollection(id, [{ type: asset.type, id: asset.id }]),
          ),
        ...before
          .filter((c) => !afterIds.has(c.id))
          .flatMap((c) => {
            const item = c.items.find((i) => i.id === asset.id);
            return item ? [removeFromCollection(item.itemId)] : [];
          }),
      ]);

      router.refresh();
      toast(`Updated collections for “${asset.name}”`);
      onOpenChange(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Collections</DialogTitle>
        <DialogDescription>
          Choose where “{asset.name}” lives. Removing it from a collection keeps
          it in your library.
        </DialogDescription>
      </DialogHeader>

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No collections yet — create one from the Collections shelf first.
        </p>
      ) : (
        <CollectionCheckboxes
          collections={collections}
          selected={selected}
          onChange={setSelected}
        />
      )}

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button onClick={save} disabled={pending || collections.length === 0}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
