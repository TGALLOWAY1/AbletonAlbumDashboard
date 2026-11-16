import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { STARTER_MEDIA_BUCKET } from "@/lib/session-starters";

export const dynamic = "force-dynamic";
const headers={"Cache-Control":"private, no-store", "Referrer-Policy":"no-referrer", "X-Content-Type-Options":"nosniff"};

/** Stable private media URL. Persisted run snapshots never store expiring tokens.
 * Each request checks the server-side owner and obtains a short-lived storage
 * redirect. This follows the app's single-user server boundary, not public RLS.
 */
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}):Promise<Response> {
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success) return new Response("Visual not found",{status:404,headers});
  try {
    const supabase=getServerSupabase();
    const {data:media,error}=await supabase.from("session_starter_media").select("storage_path,template_id").eq("id",id).eq("owner_id",OWNER_ID).maybeSingle();
    if(error) throw error;
    if(!media) return new Response("Visual not found",{status:404,headers});
    const {data:template,error:templateError}=await supabase.from("session_templates").select("id").eq("id",media.template_id).eq("owner_id",OWNER_ID).not("starter_data","is",null).maybeSingle();
    if(templateError) throw templateError;
    if(!template) return new Response("Visual not found",{status:404,headers});
    const {data,error:storageError}=await supabase.storage.from(STARTER_MEDIA_BUCKET).createSignedUrl(media.storage_path,60);
    if(storageError || !data?.signedUrl) {
      // Deleted or unavailable objects get the UI's missing-image fallback.
      return new Response("Visual unavailable",{status:404,headers});
    }
    return new Response(null,{status:307,headers:{...headers,Location:data.signedUrl}});
  } catch(error) {
    console.error("[starter-media] load failed",error);
    return new Response("Visual temporarily unavailable",{status:503,headers});
  }
}
