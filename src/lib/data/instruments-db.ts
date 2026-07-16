import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { LibraryCategory, LibraryItem } from "@/lib/data/library-items";

type InstrumentRow = {
  id: string;
  name: string;
  category: string;
  source: string;
  // Legacy column, superseded by `source` (backfilled in 0018).
  instrument_type: string | null;
  notes: string;
  created_at: string;
};

function rowToItem(row: InstrumentRow): LibraryItem {
  return {
    id: row.id,
    name: row.name,
    category: (row.category as LibraryCategory) || "instruments_presets",
    source: row.source || row.instrument_type || "Ableton",
    notes: row.notes ?? "",
  };
}

export async function fetchLibraryItems(): Promise<LibraryItem[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("instruments")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .order("created_at", { ascending: false });
  if (error) {
    // The instruments table may not exist yet (migration not applied). Don't
    // crash the Library page — just show none.
    console.error("[library] fetch failed", error);
    return [];
  }
  return (data ?? []).map((row) => rowToItem(row as InstrumentRow));
}
