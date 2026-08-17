"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { LibraryCarousel } from "@/components/library/library-carousel";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { LibrarySearchRow } from "@/components/library/library-search-row";
import { LibrarySectionHeader } from "@/components/library/library-section-header";
import {
  LibraryTypeSelector,
  type LibraryTypeFocus,
} from "@/components/library/library-type-selector";
import { PresetCategoryChips } from "@/components/library/preset-category-chips";
import { LoopStackCard } from "@/components/library/loop-stack-card";
import { PresetCard } from "@/components/library/preset-card";
import { CollectionCard } from "@/components/library/collection-card";
import {
  AssetDetailSheet,
  type DetailTarget,
} from "@/components/library/asset-detail-sheet";
import {
  LibraryCaptureDialog,
  type CaptureTarget,
} from "@/components/library/library-capture-dialog";
import { LibraryConfirmDialog } from "@/components/library/library-confirm-dialog";
import { ManageCollectionsDialog } from "@/components/library/manage-collections-dialog";
import { CollectionFormDialog } from "@/components/library/collection-form-dialog";
import { useSyncPlayerQueue } from "@/components/library/library-player-provider";
import {
  deleteLoopStack,
  deletePreset,
  setPresetFavorite,
} from "@/app/actions/library";
import {
  DEFAULT_LIBRARY_FILTERS,
  buildCollectionMembership,
  filterLoopStacks,
  filterPresets,
  toPlayableLoopStack,
  toPlayablePreset,
  type LibraryCollection,
  type LibraryFilters,
  type LoopStack,
  type Preset,
  type PresetCategory,
} from "@/lib/data/library";

const CARD_GRID =
  "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

/**
 * The Library browse surface.
 *
 * This component owns the visible result set: it holds the search text, the
 * type focus and the preset category, derives the filtered lists, and publishes
 * them to the player so previous/next always walks exactly what is on screen.
 * Everything below it is presentational.
 */
export function LibraryBrowser({
  loopStacks,
  presets,
  collections,
}: {
  loopStacks: LoopStack[];
  presets: Preset[];
  collections: LibraryCollection[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [filters, setFilters] = React.useState<LibraryFilters>(
    DEFAULT_LIBRARY_FILTERS,
  );
  const [focus, setFocus] = React.useState<LibraryTypeFocus>(null);
  const [category, setCategory] = React.useState<PresetCategory | "All">("All");
  const [showAllCollections, setShowAllCollections] = React.useState(false);

  const [capture, setCapture] = React.useState<CaptureTarget | null>(null);
  const [detail, setDetail] = React.useState<DetailTarget | null>(null);
  const [manageFor, setManageFor] = React.useState<{
    id: string;
    name: string;
    type: "loopStack" | "preset";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DetailTarget | null>(
    null,
  );
  const [collectionFormOpen, setCollectionFormOpen] = React.useState(false);

  const membership = React.useMemo(
    () => buildCollectionMembership(collections),
    [collections],
  );

  const visibleStacks = React.useMemo(
    () => filterLoopStacks(loopStacks, filters, membership),
    [loopStacks, filters, membership],
  );
  const visiblePresets = React.useMemo(
    () => filterPresets(presets, { ...filters, category }, membership),
    [presets, filters, category, membership],
  );
  const visibleCollections = React.useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) =>
      `${c.name} ${c.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [collections, filters.query]);

  /**
   * The player queue, in exactly the order the cards are rendered. On the
   * landing view that is loop stacks then presets; in a focused view it is
   * just that type. Publishing it here is what scopes previous/next.
   */
  const queue = React.useMemo(() => {
    const stacks = visibleStacks.map(toPlayableLoopStack);
    const sounds = visiblePresets.map(toPlayablePreset);
    if (focus === "loopStacks") return stacks;
    if (focus === "presets") return sounds;
    return [...stacks, ...sounds];
  }, [visibleStacks, visiblePresets, focus]);

  useSyncPlayerQueue(queue);

  const searching = filters.query.trim().length > 0;
  const libraryIsEmpty =
    loopStacks.length === 0 && presets.length === 0 && collections.length === 0;

  const run = async (work: () => Promise<void>, message: string) => {
    try {
      await work();
      router.refresh();
      toast(message);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const openManage = (target: DetailTarget) =>
    setManageFor(
      target.type === "loopStack"
        ? { id: target.stack.id, name: target.stack.name, type: "loopStack" }
        : { id: target.preset.id, name: target.preset.name, type: "preset" },
    );

  const renderStackCard = (stack: LoopStack) => (
    <LoopStackCard
      key={stack.id}
      stack={stack}
      queue={queue}
      onOpen={(s) => setDetail({ type: "loopStack", stack: s })}
    />
  );

  const renderPresetCard = (preset: Preset) => (
    <PresetCard
      key={preset.id}
      preset={preset}
      queue={queue}
      onOpen={(p) => setDetail({ type: "preset", preset: p })}
      onEdit={(p) => setCapture({ mode: "edit", type: "preset", preset: p })}
      onAddToCollection={(p) =>
        setManageFor({ id: p.id, name: p.name, type: "preset" })
      }
      onToggleFavorite={(p) =>
        run(
          () => setPresetFavorite(p.id, !p.favorite),
          p.favorite ? "Removed from favorites" : "Added to favorites",
        )
      }
      onDelete={(p) => setDeleteTarget({ type: "preset", preset: p })}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Loop Stacks, presets, and the collections you reach for.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setCapture({ mode: "create" })}
        >
          <Plus className="h-4 w-4" />
          Capture
        </Button>
      </header>

      <LibrarySearchRow
        filters={filters}
        onFiltersChange={setFilters}
        showCoreFilter={focus !== "loopStacks"}
      />

      <LibraryTypeSelector
        value={focus}
        onChange={(next) => {
          setFocus(next);
          setShowAllCollections(false);
          if (next !== "presets") setCategory("All");
        }}
      />

      {libraryIsEmpty ? (
        <LibraryEmptyState
          icon={Sparkles}
          title="Your library is empty"
          body="Capture the loops and sounds worth coming back to, and they'll be one tap away next session."
          actionLabel="Capture your first"
          onAction={() => setCapture({ mode: "create" })}
        />
      ) : showAllCollections ? (
        <CollectionsView
          collections={visibleCollections}
          searching={searching}
          onBack={() => setShowAllCollections(false)}
          onCreate={() => setCollectionFormOpen(true)}
        />
      ) : focus === "loopStacks" ? (
        <FocusedView
          title="Loop Stacks"
          count={visibleStacks.length}
          onBack={() => setFocus(null)}
        >
          {visibleStacks.length === 0 ? (
            <NoResults
              searching={searching}
              emptyTitle="No Loop Stacks yet"
              emptyBody="Save the musical ideas worth coming back to."
              actionLabel="Capture Loop Stack"
              onAction={() => setCapture({ mode: "create", type: "loopStack" })}
            />
          ) : (
            <div className={CARD_GRID}>
              {visibleStacks.map(renderStackCard)}
            </div>
          )}
        </FocusedView>
      ) : focus === "presets" ? (
        <FocusedView
          title="Presets"
          count={visiblePresets.length}
          onBack={() => setFocus(null)}
        >
          <PresetCategoryChips
            presets={filterPresets(
              presets,
              { ...filters, category: "All" },
              membership,
            )}
            value={category}
            onChange={setCategory}
          />
          {visiblePresets.length === 0 ? (
            <NoResults
              searching={searching || category !== "All"}
              emptyTitle="No presets yet"
              emptyBody="Keep your go-to sounds one tap away."
              actionLabel="Capture preset"
              onAction={() => setCapture({ mode: "create", type: "preset" })}
            />
          ) : (
            <div className={CARD_GRID}>
              {visiblePresets.map(renderPresetCard)}
            </div>
          )}
        </FocusedView>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <LibrarySectionHeader
              title="Loop Stacks"
              onViewAll={
                visibleStacks.length > 0
                  ? () => setFocus("loopStacks")
                  : undefined
              }
            />
            {visibleStacks.length === 0 ? (
              <NoResults
                searching={searching}
                emptyTitle="No Loop Stacks yet"
                emptyBody="Save the musical ideas worth coming back to."
                actionLabel="Capture Loop Stack"
                onAction={() =>
                  setCapture({ mode: "create", type: "loopStack" })
                }
              />
            ) : (
              <LibraryCarousel label="Loop Stacks">
                {visibleStacks.map(renderStackCard)}
              </LibraryCarousel>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <LibrarySectionHeader
              title="Presets"
              onViewAll={
                visiblePresets.length > 0
                  ? () => setFocus("presets")
                  : undefined
              }
            />
            {visiblePresets.length === 0 ? (
              <NoResults
                searching={searching}
                emptyTitle="No presets yet"
                emptyBody="Keep your go-to sounds one tap away."
                actionLabel="Capture preset"
                onAction={() => setCapture({ mode: "create", type: "preset" })}
              />
            ) : (
              <LibraryCarousel label="Presets">
                {visiblePresets.map(renderPresetCard)}
              </LibraryCarousel>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <LibrarySectionHeader
              title="Collections"
              onViewAll={
                visibleCollections.length > 0
                  ? () => setShowAllCollections(true)
                  : undefined
              }
            />
            {visibleCollections.length === 0 ? (
              <NoResults
                searching={searching}
                icon={Layers}
                emptyTitle="No collections yet"
                emptyBody="Group the sounds you use together — Heavy Bass, Ambient Textures, Transitions."
                actionLabel="New collection"
                onAction={() => setCollectionFormOpen(true)}
              />
            ) : (
              <LibraryCarousel label="Collections" itemClassName="w-44 sm:w-48">
                {visibleCollections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </LibraryCarousel>
            )}
          </section>
        </>
      )}

      <LibraryCaptureDialog
        target={capture}
        collections={collections}
        onOpenChange={(open) => {
          if (!open) setCapture(null);
        }}
      />

      <AssetDetailSheet
        target={detail}
        collections={collections}
        queue={queue}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        onEdit={(target) => {
          setDetail(null);
          setCapture(
            target.type === "loopStack"
              ? { mode: "edit", type: "loopStack", stack: target.stack }
              : { mode: "edit", type: "preset", preset: target.preset },
          );
        }}
        onDelete={(target) => {
          setDetail(null);
          setDeleteTarget(target);
        }}
        onAddToCollection={(target) => {
          setDetail(null);
          openManage(target);
        }}
      />

      <ManageCollectionsDialog
        asset={manageFor}
        collections={collections}
        onOpenChange={(open) => {
          if (!open) setManageFor(null);
        }}
      />

      <CollectionFormDialog
        open={collectionFormOpen}
        onOpenChange={setCollectionFormOpen}
      />

      <LibraryConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.type === "loopStack"
            ? `Delete “${deleteTarget.stack.name}”?`
            : `Delete “${deleteTarget?.preset.name ?? ""}”?`
        }
        body="This removes it from your library and from any collections holding it. The collections themselves are kept."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const name =
            deleteTarget.type === "loopStack"
              ? deleteTarget.stack.name
              : deleteTarget.preset.name;
          await (deleteTarget.type === "loopStack"
            ? deleteLoopStack(deleteTarget.stack.id)
            : deletePreset(deleteTarget.preset.id));
          router.refresh();
          toast(`Deleted “${name}”`);
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function FocusedView({
  title,
  count,
  onBack,
  children,
}: {
  title: string;
  count: number;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {/* Not labelled "All" — the preset category chips already own that
            word, and two controls with the same name on one screen is a
            genuine ambiguity for screen readers and eyes alike. */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function CollectionsView({
  collections,
  searching,
  onBack,
  onCreate,
}: {
  collections: LibraryCollection[];
  searching: boolean;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <FocusedView title="Collections" count={collections.length} onBack={onBack}>
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          New collection
        </Button>
      </div>
      {collections.length === 0 ? (
        <NoResults
          searching={searching}
          icon={Layers}
          emptyTitle="No collections yet"
          emptyBody="Group the sounds you use together."
          actionLabel="New collection"
          onAction={onCreate}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </FocusedView>
  );
}

/**
 * A section with nothing in it means one of two things, and they need
 * different copy: the user has not captured anything yet (pitch the feature),
 * or their search just didn't match (say so and stay out of the way).
 */
function NoResults({
  searching,
  icon,
  emptyTitle,
  emptyBody,
  actionLabel,
  onAction,
}: {
  searching: boolean;
  icon?: typeof Layers;
  emptyTitle: string;
  emptyBody: string;
  actionLabel: string;
  onAction: () => void;
}) {
  if (searching) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No matches.
      </p>
    );
  }
  return (
    <LibraryEmptyState
      icon={icon}
      title={emptyTitle}
      body={emptyBody}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
