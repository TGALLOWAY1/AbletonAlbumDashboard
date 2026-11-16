import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({client:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({getServerSupabase:mocks.client}));
import { GET } from "@/app/api/session-starters/media/[id]/route";
import { OWNER_ID } from "@/lib/owner";

const mediaId="ff550000-0000-4000-8000-000000000123";
function fakeClient(media:unknown,template:unknown,{fail=false,storageMissing=false}={}) {
  const filters:Array<[string,string,unknown]>=[];
  const createSignedUrl=vi.fn().mockResolvedValue(storageMissing?{data:null,error:{message:"not found"}}:{data:{signedUrl:"https://example.supabase.co/storage/v1/object/sign/private.png?token=short-lived"},error:null});
  const from=vi.fn((table:string)=>{
    const builder={select:()=>builder,eq:(key:string,value:unknown)=>{filters.push([table,key,value]);return builder;},not:()=>builder,maybeSingle:()=>Promise.resolve({data:table==="session_starter_media"?media:template,error:fail?{code:"08006"}:null})};
    return builder;
  });
  return {from,filters,createSignedUrl,storage:{from:()=>({createSignedUrl})}};
}
const request=()=>new Request(`http://localhost/api/session-starters/media/${mediaId}`);
const params=()=>({params:Promise.resolve({id:mediaId})});
beforeEach(()=>vi.clearAllMocks());

describe("private Session Starter visual endpoint",()=>{
  it("rejects malformed ids before accessing storage",async()=>{
    const response=await GET(request(),{params:Promise.resolve({id:"not-an-id"})});
    expect(response.status).toBe(404);expect(mocks.client).not.toHaveBeenCalled();
  });
  it("returns a cache-disabled missing visual for a removed metadata row",async()=>{
    const fake=fakeClient(null,null);mocks.client.mockReturnValue(fake);
    const response=await GET(request(),params());
    expect(response.status).toBe(404);expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fake.createSignedUrl).not.toHaveBeenCalled();
  });
  it("checks both media and template ownership then redirects with a fresh short-lived URL",async()=>{
    const fake=fakeClient({storage_path:"owner/template/image.png",template_id:"template"},{id:"template"});mocks.client.mockReturnValue(fake);
    const response=await GET(request(),params());
    expect(response.status).toBe(307);expect(response.headers.get("location")).toContain("token=short-lived");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fake.filters).toContainEqual(["session_starter_media","owner_id",OWNER_ID]);
    expect(fake.filters).toContainEqual(["session_templates","owner_id",OWNER_ID]);
    expect(fake.createSignedUrl).toHaveBeenCalledWith("owner/template/image.png",60);
  });
  it("does not sign a file when its parent template is outside the owner scope",async()=>{
    const fake=fakeClient({storage_path:"owner/template/image.png",template_id:"template"},null);mocks.client.mockReturnValue(fake);
    expect((await GET(request(),params())).status).toBe(404);expect(fake.createSignedUrl).not.toHaveBeenCalled();
  });
  it("allows the missing-image fallback for unavailable storage objects",async()=>{
    const fake=fakeClient({storage_path:"owner/template/image.png",template_id:"template"},{id:"template"},{storageMissing:true});mocks.client.mockReturnValue(fake);
    expect((await GET(request(),params())).status).toBe(404);
  });
  it("reports temporary query failures without exposing database details",async()=>{
    mocks.client.mockReturnValue(fakeClient(null,null,{fail:true}));
    const response=await GET(request(),params());expect(response.status).toBe(503);expect(await response.text()).toBe("Visual temporarily unavailable");
  });
});
