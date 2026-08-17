"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Star, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import { LibraryPlayTile } from "@/components/library/library-play-tile";
import {
  setLoopStackFavorite,
  setPresetCore,
  setPresetFavorite,
} from "@/app/actions/library";
import {
  PRESET_CATEGORY_LABELS,
  collectionsContaining,
  loopStackSubtitle,
  toPlayableLoopStack,
  toPlayablePreset,
  type LibraryCollection,
  type LoopStack,
  type PlayableAsset,
  type Preset,
} from "@/lib/data/library";

export type DetailTarget =
  | { type: "loopStack"; stack: LoopStack }
  | { type: "preset"; preset: Preset };

/**
 * Everything that would have cluttered the browsing card: full metadata,
 * file paths, notes, collection membership, and the destructive actions.
 * Opening a card gets you here; the card itself stays sparse.
 */
export function AssetDetailSheet({
  target,
  collections,
  queue,
  onOpenChange,
  onEdit,
  onDelete,
  onAddToCollection,
}: {
  target: DetailTarget | null;
  collections: LibraryCollection[];
  queue: PlayableAsset[];
  onOpenChange: (open: boolean) => void;
  onEdit: (target: DetailTarget) => void;
  onDelete: (target: DetailTarget) => void;
  onAddToCollection: (target: DetailTarget) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  if (!target) return null;

  const isStack = target.type === "loopStack";
  const asset = isStack ? target.stack : target.preset;
  const playable: PlayableAsset = isStack
    ? toPlayableLoopStack(target.stack)
    : toPlayablePreset(target.preset);
  const memberOf = collectionsContaining(collections, asset.id);

  const run = async (work: () => Promise<void>, message: string) => {
    setPending(true);
    try {
      await work();
      router.refresh();
      toast(message);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied`);
    } catch {
      toast("Couldn't copy to the clipboard.");
    }
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] overflow-y-auto rounded-t-xl p-5 md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[26rem] md:rounded-none"
      >
        <div className="flex gap-4">
          <LibraryPlayTile
            asset={playable}
            queue={queue}
            className="w-32 shrink-0"
            waveformBars={26}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 pr-8">
            <SheetTitle className="truncate text-lg">{asset.name}</SheetTitle>
            <SheetDescription className="tabular-nums">
              {isStack
                ? loopStackSubtitle(target.stack) || "No key or tempo set"
                : [
                    target.preset.plugin,
                    PRESET_CATEGORY_LABELS[target.preset.category],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </SheetDescription>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {asset.favorite && <Badge variant="warning">Favorite</Badge>}
              {!isStack && target.preset.core && (
                <Badge variant="primary">Core</Badge>
              )}
              {!playable.previewUrl && <Badge>No preview</Badge>}
            </div>
          </div>
        </div>

        <dl className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border">
          {isStack ? (
            <>
              <DetailRow label="Key" value={target.stack.key} />
              <DetailRow
                label="Tempo"
                value={
                  target.stack.bpm != null
                    ? `${target.stack.bpm} BPM`
                    : undefined
                }
              />
              <DetailRow
                label="Length"
                value={
                  target.stack.bars != null
                    ? `${target.stack.bars} bars`
                    : undefined
                }
              />
              <DetailRow
                label="Source project"
                value={target.stack.sourceProject}
              />
              <DetailRow
                label="Source path"
                value={target.stack.sourcePath}
                onCopy={
                  target.stack.sourcePath
                    ? () => copy(target.stack.sourcePath!, "Source path")
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <DetailRow label="Plugin" value={target.preset.plugin} />
              <DetailRow
                label="Category"
                value={PRESET_CATEGORY_LABELS[target.preset.category]}
              />
              <DetailRow
                label="Source project"
                value={target.preset.sourceProject}
              />
              <DetailRow
                label="Preset path"
                value={target.preset.presetPath}
                onCopy={
                  target.preset.presetPath
                    ? () => copy(target.preset.presetPath!, "Preset path")
                    : undefined
                }
              />
            </>
          )}
        </dl>

        {isStack && target.stack.components.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              What&apos;s inside
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {target.stack.components.map((component, index) => (
                <li key={`${component.name}-${index}`}>
                  <Badge>{component.name}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        {asset.notes && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {asset.notes}
            </p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Collections
          </h3>
          {memberOf.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {memberOf.map((collection) => (
                <li key={collection.id}>
                  <Badge variant="primary">{collection.name}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not in a collection yet.
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => onAddToCollection(target)}
          >
            Manage collections
          </Button>
        </section>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  isStack
                    ? setLoopStackFavorite(asset.id, !asset.favorite)
                    : setPresetFavorite(asset.id, !asset.favorite),
                asset.favorite
                  ? "Removed from favorites"
                  : "Added to favorites",
              )
            }
          >
            <Star
              className="h-4 w-4"
              fill={asset.favorite ? "currentColor" : "none"}
            />
            {asset.favorite ? "Unfavorite" : "Favorite"}
          </Button>

          {!isStack && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => setPresetCore(target.preset.id, !target.preset.core),
                  target.preset.core ? "Removed from Core" : "Marked as Core",
                )
              }
            >
              {target.preset.core ? "Remove Core" : "Mark Core"}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => onEdit(target)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-danger"
            onClick={() => onDelete(target)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <dt className="w-28 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
