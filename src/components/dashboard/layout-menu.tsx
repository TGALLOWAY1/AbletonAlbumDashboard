"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  createDashboardLayout,
  deleteDashboardLayout,
  renameDashboardLayout,
  saveDashboardLayout,
  setDefaultDashboardLayout,
  type DashboardActionResult,
} from "@/app/actions/dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import {
  MAX_LAYOUTS,
  MAX_LAYOUT_NAME_LENGTH,
  layoutHref,
  type SavedLayout,
} from "@/lib/dashboard/layout";
import { cn } from "@/lib/utils";

export type LayoutSummary = Pick<SavedLayout, "id" | "name" | "isDefault">;

type Start = "copy" | "default" | "empty";
type DialogState =
  | { kind: "new"; start: Start }
  | { kind: "rename" }
  | { kind: "delete" }
  | null;

/**
 * The dashboard's title, which is also its layout switcher.
 *
 * A layout is a named arrangement of widgets; this menu lists them, switches
 * between them, and creates, duplicates, renames, deletes and re-defaults
 * them. Which layout is showing lives in the URL (`/?layout=<id>`, omitted
 * for the default) — the convention every other view preference in this app
 * follows, and what keeps the page a server component and a layout linkable.
 *
 * It manages layouts as wholes. Changing what is *on* a layout is the edit
 * mode's job, which is why this menu is disabled while customizing: switching
 * layouts mid-edit would have to either discard or silently save the draft.
 */
export function LayoutMenu({
  layouts,
  active,
  disabled,
  disabledReason,
}: {
  /** Saved layouts; empty while only the built-in one exists. */
  layouts: LayoutSummary[];
  active: SavedLayout;
  disabled: boolean;
  /** Why layouts cannot be managed right now, when it is not just edit mode. */
  disabledReason?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const nameId = useId();
  const startId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // The built-in layout has no row, but it is still what is on screen, so it
  // is listed like any other.
  const listed: LayoutSummary[] = layouts.length > 0 ? layouts : [active];
  const atCap = layouts.length >= MAX_LAYOUTS;

  const open = (state: NonNullable<DialogState>, initialName: string) => {
    setName(initialName);
    setDialog(state);
  };

  const run = (
    action: () => Promise<DashboardActionResult>,
    then: (result: DashboardActionResult) => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast(result.error);
        return;
      }
      setDialog(null);
      then(result);
    });

  const submit = () => {
    if (!dialog) return;
    if (dialog.kind === "new") {
      run(
        () =>
          createDashboardLayout({
            name,
            start: dialog.start,
            from: dialog.start === "copy" ? active.layout : undefined,
          }),
        (result) => router.push(result.id ? `/?layout=${result.id}` : "/"),
      );
    } else if (dialog.kind === "rename") {
      run(
        // Renaming the built-in layout is what first writes it down.
        () =>
          active.id
            ? renameDashboardLayout({ id: active.id, name })
            : saveDashboardLayout({
                id: null,
                name,
                layout: active.layout,
                expectedUpdatedAt: null,
              }),
        () => router.refresh(),
      );
    } else if (active.id) {
      const id = active.id;
      run(
        () => deleteDashboardLayout({ id }),
        () => router.push("/"),
      );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            ref={triggerRef}
            type="button"
            title={disabled ? disabledReason : "Switch or manage layouts"}
            className="group flex min-w-0 items-center gap-1.5 rounded-md py-1 pl-1 pr-1.5 text-left outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:hover:bg-transparent"
          >
            <span className="truncate text-xl font-semibold tracking-tight md:text-2xl">
              {active.name}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground group-disabled:opacity-0"
              aria-hidden
            />
            <span className="sr-only">— switch or manage layouts</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-60">
          <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Layouts
          </div>
          {listed.map((layout) => {
            const current = layout.id === active.id;
            return (
              <DropdownMenuItem
                key={layout.id ?? "built-in"}
                onSelect={() => !current && router.push(layoutHref(layout))}
              >
                <Check
                  className={cn("h-4 w-4", current ? "opacity-100" : "opacity-0")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{layout.name}</span>
                {layout.isDefault && (
                  <span className="text-[11px] text-muted-foreground">Default</span>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={atCap}
            onSelect={() => open({ kind: "new", start: "default" }, "")}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New layout…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={atCap}
            onSelect={() =>
              open(
                { kind: "new", start: "copy" },
                `${active.name} copy`.slice(0, MAX_LAYOUT_NAME_LENGTH),
              )
            }
          >
            <Copy className="h-4 w-4" aria-hidden />
            Duplicate “{active.name}”…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => open({ kind: "rename" }, active.name)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Rename…
          </DropdownMenuItem>
          {active.id && !active.isDefault && (
            <DropdownMenuItem
              onSelect={() => {
                const id = active.id;
                if (id) run(() => setDefaultDashboardLayout({ id }), () => router.push("/"));
              }}
            >
              <Star className="h-4 w-4" aria-hidden />
              Make this the default
            </DropdownMenuItem>
          )}
          {active.id && (
            <DropdownMenuItem
              className="text-danger"
              onSelect={() => open({ kind: "delete" }, active.name)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(next) => !next && setDialog(null)}>
        {dialog && (
          <DialogContent
            // Opened from a menu item, so there is no trigger for Radix to
            // return focus to; send it back to the layout title.
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              triggerRef.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog.kind === "new"
                  ? "New layout"
                  : dialog.kind === "rename"
                    ? "Rename layout"
                    : `Delete “${active.name}”?`}
              </DialogTitle>
              <DialogDescription>
                {dialog.kind === "new"
                  ? "A layout is a named arrangement of widgets. Switch between them from the dashboard title."
                  : dialog.kind === "rename"
                    ? "The name shows as the dashboard's title."
                    : "This removes the arrangement only. Your tracks, tasks and sessions are not part of a layout and are not affected."}
              </DialogDescription>
            </DialogHeader>

            {dialog.kind !== "delete" && (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={nameId} className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id={nameId}
                    value={name}
                    maxLength={MAX_LAYOUT_NAME_LENGTH}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mixing week"
                    autoFocus
                    className="h-10"
                  />
                </div>
                {dialog.kind === "new" && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={startId} className="text-sm font-medium">
                      Start from
                    </label>
                    <select
                      id={startId}
                      value={dialog.start}
                      onChange={(e) =>
                        setDialog({ kind: "new", start: e.target.value as Start })
                      }
                      className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="default">The standard arrangement</option>
                      <option value="copy">A copy of “{active.name}”</option>
                      <option value="empty">An empty dashboard</option>
                    </select>
                  </div>
                )}
              </form>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog(null)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={dialog.kind === "delete" ? "danger" : "default"}
                onClick={submit}
                disabled={pending || (dialog.kind !== "delete" && name.trim() === "")}
              >
                {pending
                  ? "Working…"
                  : dialog.kind === "new"
                    ? "Create layout"
                    : dialog.kind === "rename"
                      ? "Rename"
                      : "Delete layout"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
