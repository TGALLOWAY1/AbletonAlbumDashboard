import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedSessionStarters } from "@/lib/session-starters";

const mocks=vi.hoisted(()=>({client:vi.fn(), revalidate:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({getServerSupabase:mocks.client}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
import { getSessionStarters, ensureStarterSeeds } from "@/lib/data/session-starters";
import { saveSessionStarter, uploadStarterVisual } from "@/app/actions/session-starters";

type QueryResult={data:unknown;error:unknown};
/** A thenable query records filters exactly as PostgREST's builder does. */
function fakeClient(resolve:(table:string,method:string,filters:Array<[string,unknown]>,payload?:unknown)=>QueryResult) {
  const queries:Array<{table:string;method:string;filters:Array<[string,unknown]>;payload?:unknown;options?:unknown}>=[];
  const storage={from:vi.fn()};
  return {queries,storage,from:(table:string)=>{
    const q={table,method:"select",filters:[] as Array<[string,unknown]>,payload:undefined as unknown,options:undefined as unknown};
    queries.push(q);
    const builder={
      select:()=>builder,eq:(k:string,v:unknown)=>{q.filters.push([k,v]);return builder;},
      not:()=>builder,limit:()=>builder,order:()=>builder,
      upsert:(p:unknown,o:unknown)=>{q.method="upsert";q.payload=p;q.options=o;return builder;},
      insert:(p:unknown)=>{q.method="insert";q.payload=p;return builder;},
      update:(p:unknown)=>{q.method="update";q.payload=p;return builder;},
      maybeSingle:()=>Promise.resolve(resolve(table,q.method,q.filters,q.payload)),
      then:(yes:(v:QueryResult)=>unknown,no:(e:unknown)=>unknown)=>Promise.resolve(resolve(table,q.method,q.filters,q.payload)).then(yes,no),
    };
    return builder;
  }};
}

beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("SESSION_STARTERS_FIXTURES","");});

describe("Session Starter read resilience",()=>{
  it("serves explicit read-only seeds when migration columns do not exist",async()=>{
    const fake=fakeClient(()=>({data:null,error:{code:"42703",message:"missing column"}}));
    mocks.client.mockReturnValue(fake);
    const result=await getSessionStarters();
    expect(result.available).toBe(false);expect(result.starters).toHaveLength(6);
    expect(fake.queries).toHaveLength(1); // No writes to an older schema.
  });
  it("propagates outages instead of presenting invented empty state",async()=>{
    const outage={code:"08006",message:"connection unavailable"};
    mocks.client.mockReturnValue(fakeClient(()=>({data:null,error:outage})));
    await expect(getSessionStarters()).rejects.toEqual(outage);
  });
  it("initializes defaults with ignoreDuplicates so later edits survive",async()=>{
    const fake=fakeClient(()=>({data:null,error:null}));mocks.client.mockReturnValue(fake);
    await ensureStarterSeeds();
    expect(fake.queries[0].method).toBe("upsert");
    expect(fake.queries[0].options).toEqual({onConflict:"id",ignoreDuplicates:true});
    const payload=fake.queries[0].payload as Array<Record<string,unknown>>;
    expect(payload).toHaveLength(6);
    expect(payload.every(r=>!!r.owner_id&&!!r.starter_data&&!!r.starter_seed_key)).toBe(true);
  });
});

describe("owner-scoped writes and media validation",()=>{
  it("rejects a request attempting to overwrite another owner's template",async()=>{
    const fake=fakeClient((table,method)=>({data:table==="session_templates"&&method==="select"?{id:seedSessionStarters()[0].id,owner_id:"someone-else"}:null,error:null}));
    mocks.client.mockReturnValue(fake);
    const result=await saveSessionStarter(seedSessionStarters()[0]);
    expect(result.error).toContain("unavailable");
    expect(fake.queries.some(q=>q.method==="update")).toBe(false);
  });
  it("rejects an image id that does not belong to this template",async()=>{
    const fake=fakeClient((table,method)=>({data:table==="session_starter_media"?[]:method==="select"?null:null,error:null}));
    mocks.client.mockReturnValue(fake);
    const starter=seedSessionStarters()[0];
    const result=await saveSessionStarter({...starter,media:[{id:starter.id,url:"https://evil.example/image.png",path:"other-owner/image.png",name:"image.png",kind:"cover",sortOrder:0}]});
    expect(result.error).toContain("belonging to this starter");
    expect(fake.queries.some(q=>q.method==="insert"||q.method==="update")).toBe(false);
  });
  it("rejects empty upload before reaching storage or reading metadata",async()=>{
    const fake=fakeClient(()=>({data:null,error:null}));mocks.client.mockReturnValue(fake);
    const form=new FormData();form.set("starterId",seedSessionStarters()[0].id);form.set("file",new File([],"empty.png",{type:"image/png"}));
    const result=await uploadStarterVisual(form);
    expect(result.error).toContain("smaller than 8 MB");
    expect(fake.queries).toEqual([]);expect(fake.storage.from).not.toHaveBeenCalled();
  });
});

describe("upload failure recovery",()=>{
  const starter=seedSessionStarters()[0];
  const row={id:starter.id,owner_id:"00000000-0000-0000-0000-000000000001",starter_data:{...starter},default_duration_minutes:20,name:starter.name};
  const imageForm=(bytes:number[],replaceId?:string)=>{
    const form=new FormData();form.set("starterId",starter.id);form.set("kind","infographic");
    form.set("file",new File([new Uint8Array(bytes)],"workflow.png",{type:"image/png"}));
    if(replaceId) form.set("replaceId",replaceId);
    return form;
  };
  it("rejects a stale replacement before uploading a file",async()=>{
    const fake=fakeClient((table,method)=>({data:method==="select"?(table==="session_templates"?row:[]):null,error:null}));mocks.client.mockReturnValue(fake);
    const result=await uploadStarterVisual(imageForm([137,80,78,71,13,10,26,10],starter.id));
    expect(result.error).toContain("replace no longer exists");expect(fake.storage.from).not.toHaveBeenCalled();
  });
  it("rejects spoofed MIME data before touching storage",async()=>{
    const fake=fakeClient((table,method)=>({data:method==="select"?(table==="session_templates"?row:[]):null,error:null}));mocks.client.mockReturnValue(fake);
    const result=await uploadStarterVisual(imageForm([60,115,118,103,62]));
    expect(result.error).toContain("valid PNG");expect(fake.storage.from).not.toHaveBeenCalled();
  });
  it("keeps metadata untouched when storage rejects the upload",async()=>{
    const fake=fakeClient((table,method)=>({data:method==="select"?(table==="session_templates"?row:[]):null,error:null}));
    const upload=vi.fn().mockResolvedValue({error:new Error("Storage upload unavailable")});
    const remove=vi.fn().mockResolvedValue({error:null});fake.storage.from.mockReturnValue({upload,remove});mocks.client.mockReturnValue(fake);
    const result=await uploadStarterVisual(imageForm([137,80,78,71,13,10,26,10]));
    expect(result.error).toContain("Storage upload unavailable");
    expect(fake.queries.filter(q=>q.table==="session_starter_media"&&q.method==="insert")).toEqual([]);
    expect(upload).toHaveBeenCalledOnce();
  });
  it("cleans the uploaded object if its metadata cannot be saved",async()=>{
    const fake=fakeClient((table,method)=>({data:method==="select"?(table==="session_templates"?row:[]):null,error:table==="session_starter_media"&&method==="insert"?new Error("Could not save visual metadata"):null}));
    const upload=vi.fn().mockResolvedValue({error:null});const remove=vi.fn().mockResolvedValue({error:null});
    fake.storage.from.mockReturnValue({upload,remove});mocks.client.mockReturnValue(fake);
    const result=await uploadStarterVisual(imageForm([137,80,78,71,13,10,26,10]));
    expect(result.error).toContain("Could not save visual metadata");
    const uploadedPath=upload.mock.calls[0][0];expect(remove).toHaveBeenCalledWith([uploadedPath]);
  });
});
