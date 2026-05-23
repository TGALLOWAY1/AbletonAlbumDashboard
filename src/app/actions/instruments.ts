"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  instrument_type: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().default(""),
});

export async function createInstrument(
  formData: FormData,
): Promise<{ id: string }> {
  const parsed = schema.parse({
    name: formData.get("name"),
    instrument_type: formData.get("instrument_type") || null,
    notes: formData.get("notes") ?? "",
  });

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("instruments")
    .insert({
      owner_id: OWNER_ID,
      name: parsed.name,
      instrument_type: parsed.instrument_type ?? null,
      notes: parsed.notes,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/library");
  return { id: data.id };
}
