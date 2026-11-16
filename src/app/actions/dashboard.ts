"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { OWNER_ID } from "@/lib/owner";
import {
  MIGRATION_0038_MISSING_MESSAGE,
  isMissingTable,
} from "@/lib/migration-errors";
import type { Json } from "@/lib/database.types";
import {
  BUILT_IN_LAYOUT_NAME,
  MAX_LAYOUTS,
  defaultLayout,
  emptyLayout,
  layoutNameSchema,
  readLayout,
  type DashboardLayout,
} from "@/lib/dashboard/layout";

/**
 * Writes for named dashboard layouts (migration 0038).
 *
 * Every action returns `{ error }` instead of throwing: a failed save is
 * something the user acts on (apply the migration, try again), and a thrown
 * server-action error is redacted to a generic message in production. They
 * all refresh `/`, the only route that draws a layout.
 *
 * The layout document is validated here by the same `readLayout` that guards
 * reads, so what is stored is always something the reader will accept — a
 * client cannot save a widget type that does not exist, a box off the grid or
 * settings that fail the widget's schema. Unknown pieces are dropped, not
 * rejected, exactly as they would be on the way back out.
 */

export type DashboardActionResult = {
  error?: string;
  id?: string;
  /** The row's new revision after a successful save. */
  updatedAt?: string;
  /**
   * The save was refused because the layout changed since the caller read
   * it. Nothing was written. The caller may ask the user and retry with
   * `force`.
   */
  conflict?: boolean;
};

const idSchema = z.string().uuid();

const CHANGED_ELSEWHERE_MESSAGE =
  "This layout was changed somewhere else — another tab or another device — " +
  "since you opened it, so your changes were not saved.";

function failure(label: string, error: unknown, fallback: string): DashboardActionResult {
  if (isMissingTable(error)) return { error: MIGRATION_0038_MISSING_MESSAGE };
  logSupabaseError(label, error);
  return { error: fallback };
}

/** Sanitize a layout sent from the browser, or null if it is not a layout at all. */
function acceptLayout(raw: unknown): DashboardLayout | null {
  const { layout, fallback } = readLayout(raw);
  return fallback ? null : layout;
}

async function countLayouts(): Promise<{ count: number; error: unknown }> {
  const { count, error } = await getServerSupabase()
    .from("dashboard_layouts")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", OWNER_ID);
  return { count: count ?? 0, error };
}

/**
 * Save the arrangement of a layout.
 *
 * `id: null` is the built-in layout, which has no row until now: the first
 * save creates it (as the default, under `name`). Anything else updates the
 * row in place.
 *
 * A SAVE IS CONDITIONAL. The whole document is written at once, so a save
 * from a page that loaded before someone else's save would put back
 * everything they changed — the widget removed in the other tab reappears,
 * with no warning to either side. So the caller sends the revision it loaded
 * (`expectedUpdatedAt`) and the update only matches a row still at that
 * revision; when it does not, nothing is written and the result says
 * `conflict`, so the user is asked rather than overruled. `force` is their
 * answer "save mine anyway".
 *
 * The built-in layout has the same hazard in a different shape: two tabs
 * that both loaded it would each insert their own "My Studio". Once any row
 * exists the built-in is no longer what a fresh page would show, so a save
 * of it is refused as a conflict instead of inserted beside the first.
 */
export async function saveDashboardLayout(input: {
  id: string | null;
  name: string;
  layout: unknown;
  expectedUpdatedAt: string | null;
  force?: boolean;
}): Promise<DashboardActionResult> {
  const layout = acceptLayout(input.layout);
  if (!layout) return { error: "That layout could not be read. Reload and try again." };
  const name = layoutNameSchema.safeParse(input.name);
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = getServerSupabase();
  const updatedAt = new Date().toISOString();

  if (input.id === null) {
    const existing = await countLayouts();
    if (existing.error) {
      return failure("saveDashboardLayout", existing.error, "Could not save the layout. Try again.");
    }
    if (existing.count > 0) {
      return {
        conflict: true,
        error:
          "A layout was saved somewhere else — another tab or another device — " +
          "since you opened this page, so your changes were not saved. Reload " +
          "to see it, then make your changes there.",
      };
    }
    const { data, error } = await supabase
      .from("dashboard_layouts")
      .insert({
        owner_id: OWNER_ID,
        name: name.data,
        layout: layout as unknown as Json,
        is_default: true,
        sort_order: 0,
        updated_at: updatedAt,
      })
      .select("id, updated_at")
      .single();
    if (error) {
      return failure("saveDashboardLayout", error, "Could not save the layout. Try again.");
    }
    revalidatePath("/");
    return { id: data.id, updatedAt: data.updated_at };
  }

  if (!idSchema.safeParse(input.id).success) return { error: "Unknown layout." };
  let update = supabase
    .from("dashboard_layouts")
    .update({ layout: layout as unknown as Json, updated_at: updatedAt })
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID);
  if (!input.force && input.expectedUpdatedAt) {
    update = update.eq("updated_at", input.expectedUpdatedAt);
  }
  const { data, error } = await update.select("id, updated_at");
  if (error) {
    return failure("saveDashboardLayout", error, "Could not save the layout. Try again.");
  }
  if (data && data.length > 0) {
    revalidatePath("/");
    return { id: input.id, updatedAt: data[0].updated_at };
  }

  // Nothing matched: the row is gone, or it has moved on from the revision
  // this save was based on. Tell the two apart — only one can be retried.
  const current = await supabase
    .from("dashboard_layouts")
    .select("id")
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID);
  if (current.error) {
    return failure("saveDashboardLayout", current.error, "Could not save the layout. Try again.");
  }
  if (!current.data || current.data.length === 0) {
    // Deleted in another tab while this one was being edited.
    return { error: "This layout no longer exists. Reload to see your layouts." };
  }
  return { conflict: true, error: CHANGED_ELSEWHERE_MESSAGE };
}

/**
 * Create a named layout, starting from a copy of `from`, the default
 * arrangement, or nothing.
 *
 * If nothing has been saved yet the built-in layout is written first, as the
 * default. Otherwise creating a second layout would make it the only row —
 * and "My Studio" would vanish from the switcher the moment the user added
 * something beside it.
 */
export async function createDashboardLayout(input: {
  name: string;
  start: "copy" | "default" | "empty";
  from?: unknown;
}): Promise<DashboardActionResult> {
  const name = layoutNameSchema.safeParse(input.name);
  if (!name.success) return { error: name.error.issues[0].message };

  let layout: DashboardLayout;
  if (input.start === "copy") {
    const copied = acceptLayout(input.from);
    if (!copied) return { error: "That layout could not be copied. Reload and try again." };
    layout = copied;
  } else {
    layout = input.start === "empty" ? emptyLayout() : defaultLayout();
  }

  const existing = await countLayouts();
  if (existing.error) {
    return failure("createDashboardLayout", existing.error, "Could not create the layout. Try again.");
  }
  if (existing.count >= MAX_LAYOUTS) {
    return { error: `You can keep up to ${MAX_LAYOUTS} layouts. Delete one first.` };
  }

  const supabase = getServerSupabase();
  let nextOrder = existing.count;
  if (existing.count === 0) {
    const builtIn = await supabase.from("dashboard_layouts").insert({
      owner_id: OWNER_ID,
      name: BUILT_IN_LAYOUT_NAME,
      layout: defaultLayout() as unknown as Json,
      is_default: true,
      sort_order: 0,
    });
    if (builtIn.error) {
      return failure("createDashboardLayout", builtIn.error, "Could not create the layout. Try again.");
    }
    nextOrder = 1;
  }

  const { data, error } = await supabase
    .from("dashboard_layouts")
    .insert({
      owner_id: OWNER_ID,
      name: name.data,
      layout: layout as unknown as Json,
      is_default: false,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error) {
    return failure("createDashboardLayout", error, "Could not create the layout. Try again.");
  }
  revalidatePath("/");
  return { id: data.id };
}

export async function renameDashboardLayout(input: {
  id: string;
  name: string;
}): Promise<DashboardActionResult> {
  if (!idSchema.safeParse(input.id).success) return { error: "Unknown layout." };
  const name = layoutNameSchema.safeParse(input.name);
  if (!name.success) return { error: name.error.issues[0].message };

  const { error } = await getServerSupabase()
    .from("dashboard_layouts")
    .update({ name: name.data, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID);
  if (error) {
    return failure("renameDashboardLayout", error, "Could not rename the layout. Try again.");
  }
  revalidatePath("/");
  return { id: input.id };
}

/**
 * Make one layout the one a bare `/` opens on. Clear-then-set, as two
 * statements — see 0038 for why that is not guarded by a unique index, and
 * `getDashboardLayouts` for why a lost race between them is harmless.
 */
export async function setDefaultDashboardLayout(input: {
  id: string;
}): Promise<DashboardActionResult> {
  if (!idSchema.safeParse(input.id).success) return { error: "Unknown layout." };
  const supabase = getServerSupabase();

  const cleared = await supabase
    .from("dashboard_layouts")
    .update({ is_default: false })
    .eq("owner_id", OWNER_ID)
    .neq("id", input.id);
  if (cleared.error) {
    return failure("setDefaultDashboardLayout", cleared.error, "Could not change the default. Try again.");
  }
  const set = await supabase
    .from("dashboard_layouts")
    .update({ is_default: true })
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID);
  if (set.error) {
    return failure("setDefaultDashboardLayout", set.error, "Could not change the default. Try again.");
  }
  revalidatePath("/");
  return { id: input.id };
}

/**
 * Delete a named layout. Only the arrangement goes — widgets are views onto
 * tracks, tasks and sessions, none of which live in a layout. Deleting the
 * last one is allowed: the built-in layout stands in again.
 */
export async function deleteDashboardLayout(input: {
  id: string;
}): Promise<DashboardActionResult> {
  if (!idSchema.safeParse(input.id).success) return { error: "Unknown layout." };
  const { error } = await getServerSupabase()
    .from("dashboard_layouts")
    .delete()
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID);
  if (error) {
    return failure("deleteDashboardLayout", error, "Could not delete the layout. Try again.");
  }
  revalidatePath("/");
  return {};
}
