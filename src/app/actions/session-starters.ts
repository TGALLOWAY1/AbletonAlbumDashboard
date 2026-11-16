"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { isMissingColumn, isMissingTable } from "@/lib/migration-errors";
import { ensureStarterSeeds, starterData, starterFromRow } from "@/lib/data/session-starters";
import {
  starterSchema, STARTER_MEDIA_BUCKET, STARTER_MEDIA_MAX_BYTES,
  STARTER_MIGRATION_MESSAGE, validateStarterImage, type SessionStarter,
} from "@/lib/session-starters";

type Result = {starter?:SessionStarter;error?:string};
function failure(error:unknown):{error:string} {
  if(isMissingTable(error)||isMissingColumn(error)) return {error:STARTER_MIGRATION_MESSAGE};
  if(error instanceof z.ZodError) return {error:error.issues[0]?.message??"Check your session starter."};
  console.error("[session-starters]",error);
  return {error:error instanceof Error ? error.message : "Could not save your starter. Please try again."};
}
function refresh(id:string) {revalidatePath("/session-starters");revalidatePath(`/session-starters/${id}`);}
async function owned(id:string) {
  z.string().uuid().parse(id);
  const {data,error}=await getServerSupabase().from("session_templates").select("*").eq("id",id).eq("owner_id",OWNER_ID).not("starter_data","is",null).maybeSingle();
  if(error) throw error;
  if(!data) throw new Error("That Session Starter no longer exists.");
  return data;
}
async function load(id:string):Promise<SessionStarter> {
  const row=await owned(id);
  const {data,error}=await getServerSupabase().from("session_starter_media").select("*").eq("template_id",id).eq("owner_id",OWNER_ID).order("sort_order");
  if(error) throw error;
  return starterFromRow(row,data??[]);
}

export async function saveSessionStarter(input:SessionStarter):Promise<Result> {
  try {
    const starter=starterSchema.parse(input);
    const supabase=getServerSupabase();
    await ensureStarterSeeds();
    // Never allow a supplied id to update or take over another owner's row.
    const {data:existing,error:readError}=await supabase.from("session_templates").select("id,owner_id").eq("id",starter.id).maybeSingle();
    if(readError) throw readError;
    if(existing && existing.owner_id!==OWNER_ID) throw new Error("That Session Starter is unavailable.");
    const {data:media,error:mediaError}=await supabase.from("session_starter_media").select("id").eq("template_id",starter.id).eq("owner_id",OWNER_ID);
    if(mediaError) throw mediaError;
    const ids=new Set((media??[]).map(m=>m.id));
    if(starter.media.some(m=>!ids.has(m.id))) throw new Error("Only uploaded visuals belonging to this starter can be saved.");
    // Removal must use the media action so the file is swept as well. This
    // also protects images added by another tab from a stale editor save.
    if(ids.size!==starter.media.length) throw new Error("Your visuals changed in another tab. Reload before saving.");
    const fields={name:starter.name,default_duration_minutes:starter.defaultDuration,
      starter_data:starterData(starter),is_favorite:starter.isFavorite,
      archived_at:starter.archived?new Date().toISOString():null};
    if(existing) {
      const {error}=await supabase.from("session_templates").update(fields).eq("id",starter.id).eq("owner_id",OWNER_ID);
      if(error) throw error;
    } else {
      const {error}=await supabase.from("session_templates").insert({...fields,id:starter.id,owner_id:OWNER_ID});
      if(error) throw error;
    }
    for(let i=0;i<starter.media.length;i++) {
      const m=starter.media[i];
      const {error}=await supabase.from("session_starter_media").update({sort_order:i,kind:m.kind}).eq("id",m.id).eq("template_id",starter.id).eq("owner_id",OWNER_ID);
      if(error) throw error;
    }
    refresh(starter.id);
    return {starter:await load(starter.id)};
  } catch(error) {return failure(error);}
}

export async function toggleStarterFavorite(id:string,isFavorite:boolean):Promise<{error?:string}> {
  try {
    z.boolean().parse(isFavorite);
    await ensureStarterSeeds();await owned(id);
    const {error}=await getServerSupabase().from("session_templates").update({is_favorite:isFavorite}).eq("id",id).eq("owner_id",OWNER_ID);
    if(error) throw error;
    refresh(id);return {};
  } catch(error) {return failure(error);}
}

export async function duplicateSessionStarter(id:string):Promise<Result> {
  const supabase=getServerSupabase();
  const copiedPaths:string[]=[];
  let duplicateId:string|null=null;
  try {
    await ensureStarterSeeds();
    const source=await load(id);
    const copy:SessionStarter={...source,id:randomUUID(),name:`${source.name} (copy)`,media:[],featuredMediaId:null,isFavorite:false,archived:false};
    const result=await saveSessionStarter(copy);
    if(result.error||!result.starter) return result;
    duplicateId=copy.id;
    const {data:sourceMedia,error:mediaError}=await supabase.from("session_starter_media").select("*").eq("template_id",id).eq("owner_id",OWNER_ID).order("sort_order");
    if(mediaError) throw mediaError;
    let featuredId:string|null=null;
    for(const item of sourceMedia??[]) {
      const mediaId=randomUUID();
      const ext=item.storage_path.split(".").pop();
      const path=`${OWNER_ID}/${copy.id}/${mediaId}.${ext}`;
      const {error}=await supabase.storage.from(STARTER_MEDIA_BUCKET).copy(item.storage_path,path);
      if(error) throw error;
      copiedPaths.push(path);
      const {error:insertError}=await supabase.from("session_starter_media").insert({
        id:mediaId,owner_id:OWNER_ID,template_id:copy.id,storage_path:path,name:item.name,
        kind:item.kind,mime_type:item.mime_type,size_bytes:item.size_bytes,sort_order:item.sort_order,
      });
      if(insertError) throw insertError;
      if(item.id===source.featuredMediaId) featuredId=mediaId;
    }
    if(featuredId) {
      const {error}=await supabase.from("session_templates").update({starter_data:starterData({...copy,featuredMediaId:featuredId})}).eq("id",copy.id).eq("owner_id",OWNER_ID);
      if(error) throw error;
    }
    refresh(copy.id);return {starter:await load(copy.id)};
  } catch(error) {
    // A copy either has its independent files or is removed; no shared files
    // can later disappear when one of the templates is customized.
    if(duplicateId) await supabase.from("session_templates").delete().eq("id",duplicateId).eq("owner_id",OWNER_ID);
    if(copiedPaths.length) await supabase.storage.from(STARTER_MEDIA_BUCKET).remove(copiedPaths);
    return failure(error);
  }
}

export async function uploadStarterVisual(form:FormData):Promise<Result> {
  let uploadedPath:string|null=null;
  let committed=false;
  const supabase=getServerSupabase();
  try {
    const starterId=z.string().uuid().parse(form.get("starterId"));
    const kind=z.enum(["cover","infographic","reference"]).parse(form.get("kind")??"reference");
    const replaceId=z.string().uuid().nullable().parse(form.get("replaceId")||null);
    const file=form.get("file");
    if(!(file instanceof File)||!file.size||file.size>STARTER_MEDIA_MAX_BYTES) throw new Error("Choose an image smaller than 8 MB.");
    await ensureStarterSeeds();
    const row=await owned(starterId);
    const {data:existing,error:existingError}=await supabase.from("session_starter_media").select("*").eq("template_id",starterId).eq("owner_id",OWNER_ID).order("sort_order");
    if(existingError) throw existingError;
    const replaced=replaceId?(existing??[]).find(m=>m.id===replaceId):null;
    if(replaceId&&!replaced) throw new Error("The visual to replace no longer exists.");
    if(!replaceId&&(existing??[]).length>=30) throw new Error("A starter can have up to 30 visuals. Remove one before adding another.");
    const bytes=new Uint8Array(await file.arrayBuffer());
    const {extension,contentType}=validateStarterImage(bytes,file.type);
    const id=randomUUID();
    uploadedPath=`${OWNER_ID}/${starterId}/${id}.${extension}`;
    const {error:uploadError}=await supabase.storage.from(STARTER_MEDIA_BUCKET).upload(uploadedPath,bytes,{contentType,upsert:false,cacheControl:"3600"});
    if(uploadError) throw uploadError;
    const {error:insertError}=await supabase.from("session_starter_media").insert({
      id,owner_id:OWNER_ID,template_id:starterId,storage_path:uploadedPath,
      name:file.name.slice(0,255),kind,mime_type:contentType,size_bytes:file.size,
      sort_order:replaced?.sort_order??(existing??[]).length,
    });
    if(insertError) throw insertError;
    const data=row.starter_data as Record<string,unknown>;
    const shouldFeature=!data.featuredMediaId||data.featuredMediaId===replaceId;
    if(shouldFeature) {
      const {error}=await supabase.from("session_templates").update({starter_data:{...data,featuredMediaId:id} as never}).eq("id",starterId).eq("owner_id",OWNER_ID);
      if(error) {
        await supabase.from("session_starter_media").delete().eq("id",id).eq("owner_id",OWNER_ID);
        throw error;
      }
    }
    committed=true;
    if(replaced) {
      const {error}=await supabase.from("session_starter_media").delete().eq("id",replaced.id).eq("owner_id",OWNER_ID).eq("template_id",starterId);
      if(error) throw error;
      const removed=await supabase.storage.from(STARTER_MEDIA_BUCKET).remove([replaced.storage_path]);
      if(removed.error) console.error("[starter-media] orphan cleanup",removed.error);
    }
    refresh(starterId);return {starter:await load(starterId)};
  } catch(error) {
    if(uploadedPath&&!committed) await supabase.storage.from(STARTER_MEDIA_BUCKET).remove([uploadedPath]);
    return failure(error);
  }
}

export async function deleteStarterVisual(starterId:string,mediaId:string):Promise<Result> {
  try {
    z.string().uuid().parse(mediaId);
    const row=await owned(starterId);
    const supabase=getServerSupabase();
    const {data:item,error}=await supabase.from("session_starter_media").select("*").eq("id",mediaId).eq("template_id",starterId).eq("owner_id",OWNER_ID).maybeSingle();
    if(error) throw error;
    if(!item) throw new Error("That visual no longer exists.");
    const data=row.starter_data as Record<string,unknown>;
    if(data.featuredMediaId===mediaId) {
      const {error}=await supabase.from("session_templates").update({starter_data:{...data,featuredMediaId:null} as never}).eq("id",starterId).eq("owner_id",OWNER_ID);
      if(error) throw error;
    }
    const {error:deleteError}=await supabase.from("session_starter_media").delete().eq("id",mediaId).eq("template_id",starterId).eq("owner_id",OWNER_ID);
    if(deleteError) throw deleteError;
    const removed=await supabase.storage.from(STARTER_MEDIA_BUCKET).remove([item.storage_path]);
    if(removed.error) console.error("[starter-media] orphan cleanup",removed.error);
    refresh(starterId);return {starter:await load(starterId)};
  } catch(error) {return failure(error);}
}
