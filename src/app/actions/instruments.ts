"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  LIBRARY_CATEGORIES,
  type LibraryItem,
} from "@/lib/data/library-items";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.enum(LIBRARY_CATEGORIES),
  source: z.string().min(1, "Source is required").max(100),
  notes: z.string().max(2000).optional().default(""),
});

function parseForm(formData: FormData) {
  return schema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    source: formData.get("source"),
    notes: formData.get("notes") ?? "",
  });
}

export async function createLibraryItem(
  formData: FormData,
): Promise<LibraryItem> {
  const parsed = parseForm(formData);

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("instruments")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      category: parsed.category,
      source: parsed.source,
      notes: parsed.notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/library");
  return { id: data.id, ...parsed };
}

export async function updateLibraryItem(
  id: string,
  formData: FormData,
): Promise<LibraryItem> {
  const parsed = parseForm(formData);

  const supabase = getServerSupabase();
  const { error, count } = await supabase
    .from("instruments")
    .update(
      {
        name: parsed.name,
        category: parsed.category,
        source: parsed.source,
        notes: parsed.notes,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Item not found.");

  revalidatePath("/library");
  return { id, ...parsed };
}

export async function deleteLibraryItem(id: string): Promise<void> {
  const supabase = getServerSupabase();
  const { error, count } = await supabase
    .from("instruments")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("owner_id", OWNER_ID);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Item not found.");

  revalidatePath("/library");
}
