"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { Database } from "@/lib/database.types";

type SessionTypeUpdate =
  Database["public"]["Tables"]["session_types"]["Update"];

const REVALIDATE = () => {
  revalidatePath("/settings/session-types");
};

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().max(40).optional().nullable(),
  requiresTrack: z.boolean().optional(),
});

export async function createSessionType(input: {
  name: string;
  color: string;
  icon?: string | null;
  requiresTrack?: boolean;
}) {
  const parsed = upsertSchema.parse(input);
  const supabase = getServerSupabase();
  const { data: maxRow } = await supabase
    .from("session_types")
    .select("sort_order")
    .eq("owner_id", OWNER_ID)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (maxRow?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("session_types").insert({
    owner_id: OWNER_ID,
    name: parsed.name,
    color: parsed.color,
    icon: parsed.icon ?? null,
    requires_track: parsed.requiresTrack ?? false,
    sort_order: nextOrder,
  });
  if (error) throw error;
  REVALIDATE();
}

export async function updateSessionType(input: {
  id: string;
  name?: string;
  color?: string;
  icon?: string | null;
  requiresTrack?: boolean;
}) {
  const supabase = getServerSupabase();
  const update: SessionTypeUpdate = {};
  if (input.name) update.name = input.name;
  if (input.color) update.color = input.color;
  if (input.icon !== undefined) update.icon = input.icon;
  if (input.requiresTrack !== undefined)
    update.requires_track = input.requiresTrack;

  const { error } = await supabase
    .from("session_types")
    .update(update)
    .eq("id", input.id)
    .eq("owner_id", OWNER_ID);
  if (error) throw error;
  REVALIDATE();
}

export async function archiveSessionType(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("session_types")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) throw error;
  REVALIDATE();
}

export async function unarchiveSessionType(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("session_types")
    .update({ is_archived: false })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) throw error;
  REVALIDATE();
}

export async function reorderSessionTypes(orderedIds: string[]) {
  const supabase = getServerSupabase();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("session_types")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("owner_id", OWNER_ID),
    ),
  );
  REVALIDATE();
}
