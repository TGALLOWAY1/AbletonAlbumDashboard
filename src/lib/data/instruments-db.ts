import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import type { LibraryItem } from "@/lib/data/library-items";

type InstrumentRow = {
  id: string;
  name: string;
  instrument_type: string | null;
  notes: string;
  created_at: string;
};

function rowToItem(row: InstrumentRow): LibraryItem {
  return {
    id: row.id,
    name: row.name,
    category: "instrument",
    type: "instrument",
    instrumentType: row.instrument_type ?? undefined,
    key: null,
    bpm: null,
    durationSec: 0,
    sourceProject: "Instruments",
    addedAt: row.created_at,
    rating: 0,
    favorite: false,
    tags: [],
    notes: row.notes || undefined,
  };
}

export async function fetchInstruments(): Promise<LibraryItem[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("instruments")
    .select("*")
    .eq("owner_id", OWNER_ID)
    .order("created_at", { ascending: false });
  if (error) {
    // The instruments table may not exist yet (migration not applied). Don't
    // crash the Library page — just show none.
    console.error("[instruments] fetch failed", error);
    return [];
  }
  return (data ?? []).map((row) => rowToItem(row as InstrumentRow));
}
