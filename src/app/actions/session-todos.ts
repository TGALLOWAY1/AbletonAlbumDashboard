"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const REVALIDATE = () => {
  revalidatePath("/calendar");
  revalidatePath("/analytics");
};

const addSchema = z.object({
  sessionId: z.string().uuid(),
  description: z.string().min(1).max(500),
});

export async function addSessionTodo(input: {
  sessionId: string;
  description: string;
}) {
  const parsed = addSchema.parse(input);
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from("session_todos")
    .select("sort_order")
    .eq("session_id", parsed.sessionId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
  const { error } = await supabase.from("session_todos").insert({
    session_id: parsed.sessionId,
    description: parsed.description,
    sort_order: nextOrder,
  });
  if (error) throw error;
  REVALIDATE();
}

export async function toggleSessionTodo(id: string, done: boolean) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("session_todos")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  REVALIDATE();
}

export async function updateSessionTodo(id: string, description: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("session_todos")
    .update({ description })
    .eq("id", id);
  if (error) throw error;
  REVALIDATE();
}

export async function deleteSessionTodo(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("session_todos").delete().eq("id", id);
  if (error) throw error;
  REVALIDATE();
}

export async function replaceSessionTodos(
  sessionId: string,
  descriptions: string[],
) {
  const supabase = getServerSupabase();
  const cleaned = descriptions
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  const { data: existing } = await supabase
    .from("session_todos")
    .select("id, description, sort_order, done, done_at")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true });

  const existingByDesc = new Map(
    (existing ?? []).map((t) => [t.description, t]),
  );
  const seen = new Set<string>();
  const upserts = cleaned.map((description, i) => {
    const match = existingByDesc.get(description);
    if (match) {
      seen.add(match.id);
      return supabase
        .from("session_todos")
        .update({ sort_order: i })
        .eq("id", match.id);
    }
    return supabase
      .from("session_todos")
      .insert({ session_id: sessionId, description, sort_order: i });
  });
  await Promise.all(upserts);

  const toDelete = (existing ?? [])
    .filter((t) => !seen.has(t.id))
    .map((t) => t.id);
  if (toDelete.length > 0) {
    await supabase.from("session_todos").delete().in("id", toDelete);
  }
  REVALIDATE();
}
