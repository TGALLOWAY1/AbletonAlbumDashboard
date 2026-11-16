"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, LayoutGrid, Plus, SlidersHorizontal } from "lucide-react";
import { saveDashboardLayout } from "@/app/actions/dashboard";
import { renderWidgetPreview } from "@/app/actions/dashboard-preview";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { LayoutMenu, type LayoutSummary } from "@/components/dashboard/layout-menu";
import { WidgetGallery } from "@/components/dashboard/widget-gallery";
import { WidgetEmpty, WidgetSkeleton } from "@/components/dashboard/widget-parts";
import {
  WidgetSettingsDialog,
  type SettingsTrack,
} from "@/components/dashboard/widget-settings-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import type { LayoutsStatus } from "@/lib/data/dashboard";
import { stackOrder } from "@/lib/dashboard/grid";
import {
  addWidget,
  duplicateWidget,
  removeWidget,
  sameLayout,
  setWidgetConfig,
  type DashboardLayout,
  type LayoutItem,
  type SavedLayout,
} from "@/lib/dashboard/layout";
import { widgetDefinition, type WidgetType } from "@/lib/dashboard/widgets";
import { MIGRATION_0038_MISSING_MESSAGE } from "@/lib/migration-errors";
import { ANALYTICS_PATH } from "@/lib/progress-tab";

/**
 * Toolbar buttons, a notch tighter than `size="sm"` and with the label
 * dropped on a phone, so the title and all three fit one row down to a 375px
 * screen. The dashboard has always spent the space above its content
 * carefully — on a phone that row decides what makes the first screen.
 */
const TOOLBAR_BUTTON_CLASS = "gap-1.5 px-2.5 [&_svg]:size-3.5";

/** Selectors for the elements keyboard focus is handed to — see `focusNext`. */
const FOCUS = {
  customize: '[data-dash-focus="customize"]',
  add: '[data-dash-focus="add"]',
  grip: (id: string) => `[data-widget-id="${CSS.escape(id)}"] [data-widget-grip]`,
};

/**
 * The dashboard: a toolbar, the widget grid, and the edit mode that
 * rearranges it.
 *
 * WHAT IS SERVER AND WHAT IS CLIENT. The page renders every widget on the
 * server and passes them in as `nodes`, keyed by instance id. This component
 * only decides where they go and whether they can be moved, so the widgets
 * themselves never join the browser bundle and each can read its own data.
 *
 * VIEW AND DRAFT. Outside edit mode the grid draws the saved layout. "Customize"
 * copies it into a draft; every move, resize, add, remove and settings change
 * edits the draft only. Save writes the draft; Cancel throws it away. Nothing
 * reaches the database until Save, which is what makes Cancel honest.
 *
 * WIDGETS THAT ARE NOT SAVED YET. A widget added or re-configured mid-edit has
 * no server-rendered node — it is not in the saved layout. `renderWidgetPreview`
 * fetches one: the real widget with live data for a type and settings that so
 * far exist only in the draft. Those previews are dropped once the page has
 * re-rendered from the saved layout and supplies the nodes itself.
 */
export function DashboardShell({
  layouts,
  active,
  status,
  nodes,
  tracks,
}: {
  layouts: LayoutSummary[];
  active: SavedLayout;
  status: LayoutsStatus;
  /** Server-rendered widget bodies for the saved layout, by instance id. */
  nodes: Record<string, ReactNode>;
  /** For settings that pick a track. */
  tracks: SettingsTrack[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, startSaving] = useTransition();

  // The layout on screen outside edit mode. Normally just the saved one; kept
  // in state so a successful save can show its result at once instead of the
  // old arrangement flashing back until the refreshed page arrives.
  //
  // `rowId` and `revision` ride along for the same reason: a save returns the
  // row it wrote and its new revision, and the next save must be based on
  // those even if it happens before the refreshed page has delivered them.
  const savedKey = `${active.id ?? "built-in"}:${active.updatedAt ?? ""}:${JSON.stringify(active.layout)}`;
  const [syncedKey, setSyncedKey] = useState(savedKey);
  const [view, setView] = useState(active.layout);
  const [rowId, setRowId] = useState(active.id);
  const [revision, setRevision] = useState(active.updatedAt);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setView(active.layout);
    setRowId(active.id);
    setRevision(active.updatedAt);
  }

  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const editing = draft !== null;
  const layout = draft ?? view;
  const dirty = draft !== null && !sameLayout(draft, view);

  // Previews stand in for nodes the server has not rendered. A fresh `nodes`
  // prop means the page re-rendered; outside edit mode it now covers
  // everything, so the previews are stale and go.
  const [previews, setPreviews] = useState<Record<string, ReactNode>>({});
  const [seenNodes, setSeenNodes] = useState(nodes);
  if (seenNodes !== nodes) {
    setSeenNodes(nodes);
    if (!editing) setPreviews({});
  }

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const readOnly = status === "failed";

  // Leaving with unsaved changes asks first — otherwise an arrangement that
  // took a minute of dragging is gone without a word. Two ways out need two
  // guards: `beforeunload` covers a reload, a closed tab and leaving the
  // site, but an in-app link is a client-side route change and never fires
  // it — and the sidebar and bottom nav stay live while customizing. So link
  // clicks are intercepted too, in the capture phase, ahead of the router.
  // (The browser's Back button cannot be intercepted; that one still leaves.)
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      // Let modified clicks through: they open another tab and leave this one.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const samePage =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;
      if (samePage) return;
      if (!window.confirm("You have unsaved changes to this layout. Leave and discard them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  // Where keyboard focus goes after the control that held it disappears.
  // Saving removes the Save button; removing a widget removes its menu;
  // closing a dialog opened from a menu has no trigger to return to. Left
  // alone, focus falls to <body> and a keyboard user starts again from the
  // top of the page. A handler names the next sensible element here and the
  // effect below moves focus once the render that removes the old one lands.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusNext.current;
    if (!selector) return;
    focusNext.current = null;
    document.querySelector<HTMLElement>(selector)?.focus();
  });

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Which edit a preview request belongs to. A preview is fetched over the
  // network, so its answer can arrive after the edit it was for has ended —
  // and a late answer written into `previews` would repaint a widget with
  // settings the user just cancelled, outside edit mode, where previews win
  // over the saved nodes. Ending an edit (cancel or save) moves this on, and
  // an answer whose number no longer matches is dropped.
  const editSession = useRef(0);

  const requestPreview = (item: LayoutItem) => {
    const name = widgetDefinition(item.type).name;
    const session = editSession.current;
    const settle = (node: ReactNode) => {
      if (editSession.current !== session) return;
      setPreviews((prev) => ({ ...prev, [item.id]: node }));
    };
    setPreviews((prev) => ({ ...prev, [item.id]: <WidgetSkeleton name={name} /> }));
    renderWidgetPreview({ type: item.type, config: item.config, instanceId: item.id })
      .then(settle)
      .catch(() =>
        settle(
          <WidgetEmpty
            title={`${name} will appear when you save`}
            hint="A preview could not be loaded just now."
          />,
        ),
      );
  };

  const startEditing = () => {
    if (readOnly) return;
    setDraft(view);
    setAnnouncement(
      "Customizing. Drag a widget by its top bar, or focus its grip and use the arrow keys.",
    );
  };

  const cancel = () => {
    editSession.current += 1;
    focusNext.current = FOCUS.customize;
    setDraft(null);
    setPreviews({});
    setGalleryOpen(false);
    setSettingsFor(null);
    setAnnouncement("Changes discarded.");
  };

  const save = () => {
    if (!draft) return;
    if (!dirty) {
      focusNext.current = FOCUS.customize;
      setDraft(null);
      return;
    }
    const next = draft;
    startSaving(async () => {
      const attempt = (force: boolean) =>
        saveDashboardLayout({
          id: rowId,
          name: active.name,
          layout: next,
          expectedUpdatedAt: revision,
          force,
        });

      let result = await attempt(false);
      // Someone else saved this layout since it was loaded here. Neither
      // version is thrown away without being asked: the draft stays on
      // screen, and replacing the other change is the user's call.
      if (result.conflict && rowId !== null) {
        const overwrite = window.confirm(
          `${result.error}\n\nSave your version anyway? It will replace the changes made elsewhere.`,
        );
        if (!overwrite) {
          toast("Not saved. Reload to see the latest version of this layout.");
          return;
        }
        result = await attempt(true);
      }
      if (result.error) {
        toast(result.error);
        return;
      }
      // The saved page is about to supply every node itself; a preview
      // still in flight would only arrive after them and go stale.
      editSession.current += 1;
      focusNext.current = FOCUS.customize;
      setView(next);
      setRowId(result.id ?? rowId);
      setRevision(result.updatedAt ?? null);
      setDraft(null);
      setAnnouncement("Layout saved.");
      router.refresh();
    });
  };

  const add = (type: WidgetType) => {
    if (!draft) return;
    const { layout: next, id } = addWidget(draft, type);
    if (!id) return;
    setDraft(next);
    setGalleryOpen(false);
    setHighlightId(id);
    const added = next.items.find((item) => item.id === id);
    if (added) requestPreview(added);
    setAnnouncement(`${widgetDefinition(type).name} added.`);
  };

  const duplicate = (id: string) => {
    if (!draft) return;
    const { layout: next, id: copyId } = duplicateWidget(draft, id);
    if (!copyId) return;
    setDraft(next);
    setHighlightId(copyId);
    const copy = next.items.find((item) => item.id === copyId);
    if (copy) {
      requestPreview(copy);
      setAnnouncement(`${widgetDefinition(copy.type).name} duplicated.`);
    }
  };

  const remove = (id: string) => {
    if (!draft) return;
    const item = draft.items.find((i) => i.id === id);
    const next = removeWidget(draft, id);
    // Focus was on the removed widget's menu. Hand it to the widget that
    // follows in reading order — or, if that was the last one, to Add widget.
    const order = stackOrder(draft.items, draft.order ?? undefined);
    const neighbour = order[order.indexOf(id) + 1] ?? order[order.indexOf(id) - 1];
    focusNext.current = neighbour ? FOCUS.grip(neighbour) : FOCUS.add;
    setDraft(next);
    if (item) setAnnouncement(`${widgetDefinition(item.type).name} removed.`);
  };

  const configure = (id: string, config: Record<string, unknown>) => {
    if (!draft) return;
    const next = setWidgetConfig(draft, id, config);
    focusNext.current = FOCUS.grip(id);
    setDraft(next);
    setSettingsFor(null);
    const item = next.items.find((i) => i.id === id);
    if (item) requestPreview(item);
  };

  const openGallery = () => {
    if (readOnly) return;
    if (!draft) setDraft(view);
    setGalleryOpen(true);
  };

  const closeSettings = () => {
    if (settingsFor) focusNext.current = FOCUS.grip(settingsFor);
    setSettingsFor(null);
  };

  const closeGallery = (open: boolean) => {
    // Closed without adding: back to the button that opened it. (Adding
    // closes it too, and focuses the new widget instead — see `add`.)
    if (!open) focusNext.current = FOCUS.add;
    setGalleryOpen(open);
  };

  const settingsItem = settingsFor
    ? (layout.items.find((item) => item.id === settingsFor) ?? null)
    : null;

  return (
    <div className="dash-root flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="flex min-w-0 items-center">
          <LayoutMenu
            layouts={layouts}
            active={active}
            disabled={editing || status !== "ok"}
            disabledReason={
              editing
                ? "Save or cancel your changes to switch layouts."
                : status === "missing"
                  ? MIGRATION_0038_MISSING_MESSAGE
                  : "Your saved layouts could not be loaded."
            }
          />
        </h1>

        {editing ? (
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
              onClick={() => setGalleryOpen(true)}
              disabled={saving}
              data-dash-focus="add"
            >
              <Plus aria-hidden />
              <span className="hidden sm:inline">Add widget</span>
              <span className="sr-only sm:hidden">Add widget</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
              onClick={cancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : dirty ? "Save layout" : "Done"}
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <Button asChild variant="ghost" size="sm" className={TOOLBAR_BUTTON_CLASS}>
              <Link href={ANALYTICS_PATH}>
                <BarChart3 aria-hidden />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sr-only sm:hidden">Analytics</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
              onClick={startEditing}
              disabled={readOnly}
              data-dash-focus="customize"
            >
              <SlidersHorizontal aria-hidden />
              <span className="hidden sm:inline">Customize</span>
              <span className="sr-only sm:hidden">Customize</span>
            </Button>
            <Button
              size="sm"
              className={TOOLBAR_BUTTON_CLASS}
              onClick={openGallery}
              disabled={readOnly}
              data-dash-focus="add"
            >
              <Plus aria-hidden />
              <span className="hidden sm:inline">Add widget</span>
              <span className="sr-only sm:hidden">Add widget</span>
            </Button>
          </div>
        )}
      </header>

      {readOnly && (
        <p
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
        >
          Your saved layouts could not be loaded, so this is the standard
          arrangement and it cannot be changed right now. Reload to try again.
        </p>
      )}
      {!readOnly && active.fallback && (
        <p
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
        >
          “{active.name}” was saved in a form this version cannot read, so the
          standard arrangement is shown instead. Nothing has been overwritten —
          saving a change here will replace it.
        </p>
      )}

      {editing && (
        <p className="-mt-1 text-xs text-muted-foreground">
          <span className="dash-grid-only">
            Drag a widget by its top bar and resize it from the bottom-right
            corner. With the keyboard, focus a grip: arrow keys move, Shift +
            arrows resize.
          </span>
          <span className="dash-stack-only">
            Use the arrows on each widget to change the order. Sizes and
            free placement are arranged on a wider screen.
          </span>
          {status === "missing" && ` ${MIGRATION_0038_MISSING_MESSAGE}`}
        </p>
      )}

      {layout.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/60 p-6">
          <WidgetEmpty
            icon={LayoutGrid}
            title="This dashboard is empty"
            hint="Add a widget to start building it — the shortlist, a task list, the timer, your heatmap."
            action={
              <Button size="sm" onClick={openGallery} disabled={readOnly}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add widget
              </Button>
            }
          />
        </div>
      ) : (
        // Locked while a save is in flight: the save carries the draft as it
        // was when Save was pressed, and it replaces the draft when it lands
        // — so a widget removed in that second would silently come back.
        <div inert={saving} aria-busy={saving || undefined}>
        <DashboardGrid
          layout={layout}
          editing={editing}
          renderWidget={(item) =>
            previews[item.id] ??
            nodes[item.id] ?? <WidgetSkeleton name={widgetDefinition(item.type).name} />
          }
          onChange={setDraft}
          onAnnounce={setAnnouncement}
          onConfigure={setSettingsFor}
          onDuplicate={duplicate}
          onRemove={remove}
          highlightId={highlightId}
        />
        </div>
      )}

      {/* Where drags, keyboard moves and saves are spoken. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {draft && (
        <WidgetGallery
          open={galleryOpen}
          onOpenChange={closeGallery}
          layout={draft}
          onAdd={add}
        />
      )}

      {editing && settingsItem && (
        <WidgetSettingsDialog
          key={settingsItem.id}
          item={settingsItem}
          tracks={tracks}
          onClose={closeSettings}
          onSave={(config) => configure(settingsItem.id, config)}
        />
      )}
    </div>
  );
}
