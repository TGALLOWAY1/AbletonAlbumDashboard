import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { SampleRow } from "@/lib/types";

/** All touched samples for the owner, keyed by `sample_key`. */
export async function getSampleStatuses(): Promise<Record<string, SampleRow>> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("samples")
    .select("*")
    .eq("owner_id", OWNER_ID);
  if (error) throw error;
  const map: Record<string, SampleRow> = {};
  for (const row of data ?? []) map[row.sample_key] = row;
  return map;
}
