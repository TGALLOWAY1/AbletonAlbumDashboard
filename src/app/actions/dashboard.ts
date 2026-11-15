"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/log-error";
import { OWNER_ID } from "@/lib/owner";
import {
  MIGRATION_0037_MISSING_MESSAGE,
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
 * Writes for named dashboard layouts (migration 0037).
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

export type DashboardActionResult = { error?: string; id?: string };

const idSchema = z.string().uuid();

function failure(label: string, error: unknown, fallback: string): DashboardActionResult {
  if (isMissingTable(error)) return { error: MIGRATION_0037_MISSING_MESSAGE };
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
 */
export async function saveDashboardLayout(input: {
  id: string | null;
  name: string;
  layout: unknown;
}): Promise<DashboardActionResult> {
  const layout = acceptLayout(input.layout);
  if (!layout) return { error: "That layout could not be read. Reload and try again." };
  const name = layoutNameSchema.safeParse(input.name);
  if (!name.success) return { error: name.error.issues[0].message };
  const supabase = getServerSupabase();

  if (input.id === null) {
    const existing = await countLayouts();
    if (existing.error) {
      return failure("saveDashboardLayout", existing.error, "Could not save the layout. Try again.");
    }
    const { data, error } = await supabase
      .from("dashboard_layouts")
      .insert({
        owner_id: OWNER_ID,
        name: name.data,
        layout: layout as unknown as Json,
        is_default: existing.count === 0,
        sort_order: existing.count,
      })
      .select("id")
      .single();
    if (error) {
      return failure("saveDashboardLayout", error, "Could not save the layout. Try again.");
    }
    revalidatePath("/");
    return { id: data.id };
  }

  if (!idSchema.safeParse(input.id).success) return { error: "Unknown layout." };
  const { data, error } = await supabase
    .from("dashboard_layouts")
    .update({
      layout: layout as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID)
    .select("id");
  if (error) {
    return failure("saveDashboardLayout", error, "Could not save the layout. Try again.");
  }
  if (!data || data.length === 0) {
    // Deleted in another tab while this one was being edited.
    return { error: "This layout no longer exists. Reload to see your layouts." };
  }
  revalidatePath("/");
  return { id: input.id };
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
 * statements — see 0037 for why that is not guarded by a unique index, and
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
