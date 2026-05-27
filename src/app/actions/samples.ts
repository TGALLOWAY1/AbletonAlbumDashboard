"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { SampleRow } from "@/lib/types";

const schema = z.object({
  sampleKey: z.string().min(1).max(1024),
  originalPath: z.string().min(1).max(1024),
  originalFileName: z.string().min(1).max(512),
  reviewStatus: z.enum([
    "not_reviewed",
    "reviewed_not_added",
    "added_to_favorites",
  ]),
  favoriteDest: z.string().max(1024).nullable().optional(),
});

export async function upsertSampleStatus(input: {
  sampleKey: string;
  originalPath: string;
  originalFileName: string;
  reviewStatus: "not_reviewed" | "reviewed_not_added" | "added_to_favorites";
  favoriteDest?: string | null;
}): Promise<SampleRow> {
  const parsed = schema.parse(input);
  const supabase = getServerSupabase();
  const favorited = parsed.reviewStatus === "added_to_favorites";
  const { data, error } = await supabase
    .from("samples")
    .upsert(
      {
        owner_id: OWNER_ID,
        sample_key: parsed.sampleKey,
        original_path: parsed.originalPath,
        original_file_name: parsed.originalFileName,
        review_status: parsed.reviewStatus,
        favorite_dest: favorited ? (parsed.favoriteDest ?? null) : null,
        favorited_at: favorited ? new Date().toISOString() : null,
      },
      { onConflict: "owner_id,sample_key" },
    )
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/samples");
  return data;
}
