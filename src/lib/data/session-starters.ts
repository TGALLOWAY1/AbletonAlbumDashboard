import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { isMissingColumn, isMissingTable } from "@/lib/migration-errors";
import type { Database, Json } from "@/lib/database.types";
import {
  seedSessionStarters, starterSchema,
  type SessionStarter, type StarterMedia,
} from "@/lib/session-starters";

type TemplateRow = Database["public"]["Tables"]["session_templates"]["Row"];
type MediaRow = Database["public"]["Tables"]["session_starter_media"]["Row"];
export type StarterSnapshot = {starters:SessionStarter[];available:boolean};
export function starterData(starter:SessionStarter): Json {
  // Files and signed URLs belong to the media table, never to editable JSON.
  const {id: _id, media: _media,isFavorite:_favorite,archived:_archived,createdAt:_created,updatedAt:_updated,...data}=starter;
  void _id;void _media;void _favorite;void _archived;void _created;void _updated;
  return data as unknown as Json;
}

export async function starterFromRow(row:TemplateRow, media:MediaRow[]):Promise<SessionStarter> {
  const visuals:StarterMedia[]=media.map((m)=>({
    id:m.id,path:m.storage_path,name:m.name,kind:m.kind as StarterMedia["kind"],
    sortOrder:m.sort_order,url:`/api/session-starters/media/${m.id}`,
  }));
  return starterSchema.parse({
    ...(row.starter_data as object),id:row.id,name:row.name,defaultDuration:row.default_duration_minutes,
    media:visuals,isFavorite:row.is_favorite,archived:!!row.archived_at,createdAt:row.created_at,updatedAt:row.updated_at,
    featuredMediaId: ((row.starter_data as Record<string,Json>)?.featuredMediaId && visuals.some(m=>m.id===(row.starter_data as Record<string,Json>).featuredMediaId))
      ? (row.starter_data as Record<string,Json>).featuredMediaId : null,
  });
}

/** Seeds are inserted once and never overwrite a user's edits or archive choices. */
export async function ensureStarterSeeds():Promise<void> {
  const supabase=getServerSupabase();
  const seeds=seedSessionStarters();
  const {error}=await supabase.from("session_templates").upsert(seeds.map((s)=>({
    id:s.id,owner_id:OWNER_ID,name:s.name,default_duration_minutes:s.defaultDuration,
    starter_data:starterData(s),starter_seed_key:s.visualStyle,is_favorite:false,
  })),{onConflict:"id",ignoreDuplicates:true});
  if(error) throw error;
}

export async function getSessionStarters():Promise<StarterSnapshot> {
  if(process.env.NODE_ENV!=="production" && process.env.SESSION_STARTERS_FIXTURES==="1") return {starters:seedSessionStarters(),available:false};
  const supabase=getServerSupabase();
  try {
    // Probe the optional columns before bootstrapping so a pre-migration build
    // remains a useful, explicitly read-only gallery.
    const probe=await supabase.from("session_templates").select("id,starter_data").eq("owner_id",OWNER_ID).limit(1);
    if(probe.error) throw probe.error;
    await ensureStarterSeeds();
    const [templates,media]=await Promise.all([
      supabase.from("session_templates").select("*").eq("owner_id",OWNER_ID).not("starter_data","is",null).order("created_at",{ascending:true}),
      supabase.from("session_starter_media").select("*").eq("owner_id",OWNER_ID).order("sort_order",{ascending:true}),
    ]);
    if(templates.error) throw templates.error;
    if(media.error) throw media.error;
    const starters=await Promise.all((templates.data??[]).map(row=>starterFromRow(row,(media.data??[]).filter(m=>m.template_id===row.id))));
    return {starters,available:true};
  } catch(error) {
    if(isMissingColumn(error)||isMissingTable(error)) {
      console.warn("[session-starters] Apply supabase/migrations/0037_session_starters.sql to enable editing and saved sessions.");
      return {starters:seedSessionStarters(),available:false};
    }
    throw error;
  }
}
export async function getSessionStarter(id:string):Promise<SessionStarter|null> {
  return (await getSessionStarters()).starters.find(s=>s.id===id)??null;
}
