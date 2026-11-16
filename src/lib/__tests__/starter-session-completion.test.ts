import { beforeEach, describe, expect, it, vi } from "vitest";
import { OWNER_ID } from "@/lib/owner";
import { seedSessionStarters, STARTER_MIGRATION_MESSAGE } from "@/lib/session-starters";
import type { StarterRun } from "@/lib/starter-run";

const mocks=vi.hoisted(()=>({client:vi.fn(),revalidate:vi.fn(),revalidateTrack:vi.fn(),completeAction:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({getServerSupabase:mocks.client}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
vi.mock("@/lib/revalidate-track",()=>({revalidateTrackSurfaces:mocks.revalidateTrack}));
vi.mock("@/app/actions/actions",()=>({completeAction:mocks.completeAction}));
import { completeSession, completeStarterSession } from "@/app/actions/sessions";

type Query={table:string;method:"select"|"insert"|"upsert";filters:Array<[string,unknown]>;payload?:unknown;options?:unknown};
type QueryResult={data:unknown;error:unknown};
function fakeClient(resolve:(query:Query)=>QueryResult) {
  const queries:Query[]=[];
  return {queries,from:(table:string)=>{
    const query:Query={table,method:"select",filters:[]};queries.push(query);
    const builder={
      select:()=>builder,
      eq:(key:string,value:unknown)=>{query.filters.push([key,value]);return builder;},
      insert:(payload:unknown)=>{query.method="insert";query.payload=payload;return builder;},
      upsert:(payload:unknown,options:unknown)=>{query.method="upsert";query.payload=payload;query.options=options;return builder;},
      single:()=>Promise.resolve(resolve(query)),
      maybeSingle:()=>Promise.resolve(resolve(query)),
      then:(yes:(v:QueryResult)=>unknown,no:(e:unknown)=>unknown)=>Promise.resolve(resolve(query)).then(yes,no),
    };
    return builder;
  }};
}

const trackId="eeeeeeee-1111-4111-8111-111111111111";
const savedId="eeeeeeee-2222-4222-8222-222222222222";
const startedAt="2026-11-16T10:00:00.000Z";
const endedAt="2026-11-16T10:15:00.000Z";
function starterRun():StarterRun {
  const template=seedSessionStarters()[0];
  return {
    runId:"eeeeeeee-3333-4333-8333-333333333333",template,durationMinutes:40,
    completedStepIds:[template.steps[0].id],assetsCreated:"A drum rack saved in my library",
    footageCaptured:true,contentStatus:"filmed",nextAction:"Try the rack in a new drop",
    startedAt:"2026-11-16T09:55:00.000Z",
  };
}
function input() {
  return {starterRun:starterRun(),trackId:null,startedAt,endedAt,workedSeconds:900,notesMd:"The layered snare works well."};
}
function success(query:Query):QueryResult {
  if(query.table==="session_templates") return {data:{id:starterRun().template.id,owner_id:OWNER_ID,starter_data:{name:"A template edited after this run began",steps:[]}},error:null};
  if(query.table==="tracks") return {data:{id:trackId},error:null};
  if(query.table==="sessions") return {data:{id:savedId},error:null};
  return {data:null,error:null};
}
beforeEach(()=>vi.clearAllMocks());

describe("Starter sessions use the existing session writer",()=>{
  it("saves the original workflow, selected duration and output in one session row",async()=>{
    const fake=fakeClient(success);mocks.client.mockReturnValue(fake);
    const request=input();
    expect(await completeStarterSession(request)).toEqual({id:savedId});
    const writes=fake.queries.filter(q=>q.method!=="select");
    expect(writes).toHaveLength(1);expect(writes[0].table).toBe("sessions");expect(writes[0].method).toBe("upsert");
    expect(writes[0].payload).toMatchObject({
      track_id:null,template_id:request.starterRun.template.id,starter_run_id:request.starterRun.runId,
      status:"completed",started_at:startedAt,ended_at:endedAt,worked_seconds:900,notes_md:request.notesMd,
      starter_snapshot:{...request.starterRun.template,durationMinutes:40,startedAt:request.starterRun.startedAt},
      starter_output:{completedStepIds:request.starterRun.completedStepIds,assetsCreated:request.starterRun.assetsCreated,
        footageCaptured:true,contentStatus:"filmed",nextAction:request.starterRun.nextAction},
    });
    const payload=writes[0].payload as Record<string,unknown>;
    expect((payload.starter_snapshot as Record<string,unknown>).name).toBe("Drum Rack Only");
    expect(payload).not.toHaveProperty("duration_seconds"); // DB-generated duration remains untouched.
    expect(fake.queries.some(q=>q.table==="session_activities"||q.table==="session_todos")).toBe(false);
    expect(mocks.revalidate).toHaveBeenCalledWith("/session-starters");
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });

  it("associates an optional owned track and refreshes its existing surfaces",async()=>{
    const fake=fakeClient(success);mocks.client.mockReturnValue(fake);
    expect(await completeSession({...input(),trackId})).toEqual({id:savedId});
    const trackQuery=fake.queries.find(q=>q.table==="tracks")!;
    expect(trackQuery.filters).toEqual([["id",trackId],["owner_id",OWNER_ID]]);
    expect((fake.queries.find(q=>q.table==="sessions")!.payload as Record<string,unknown>).track_id).toBe(trackId);
    expect(mocks.revalidateTrack).toHaveBeenCalledWith(trackId);
  });

  it("returns the first saved id on retry and avoids duplicate child rows",async()=>{
    let saved=false;
    const fake=fakeClient((query)=>{
      if(query.table==="sessions"&&query.method==="upsert") {
        const data=saved?null:{id:savedId};saved=true;return {data,error:null};
      }
      if(query.table==="sessions"&&query.method==="select") return {data:{id:savedId,template_id:starterRun().template.id},error:null};
      return success(query);
    });mocks.client.mockReturnValue(fake);
    const request={...input(),activities:[{key:"sound_design" as const,minutes:15}],todos:[{description:"Save rack",done:true}]};
    expect(await completeSession(request)).toEqual({id:savedId});
    expect(await completeSession(request)).toEqual({id:savedId});
    const writes=fake.queries.filter(q=>q.method!=="select");
    expect(writes).toHaveLength(2);
    for(const write of writes) expect(write.options).toEqual({onConflict:"starter_run_id",ignoreDuplicates:true});
    const retryRead=fake.queries.find(q=>q.table==="sessions"&&q.method==="select")!;
    expect(retryRead.filters).toContainEqual(["starter_run_id",request.starterRun.runId]);
    expect(fake.queries.some(q=>q.table==="session_activities"||q.table==="session_todos")).toBe(false);
  });

  it("rejects a retry token already attached to another template",async()=>{
    const fake=fakeClient(query=>{
      if(query.table==="sessions"&&query.method==="upsert") return {data:null,error:null};
      if(query.table==="sessions"&&query.method==="select") return {data:{id:savedId,template_id:"other-template"},error:null};
      return success(query);
    });mocks.client.mockReturnValue(fake);
    const result=await completeStarterSession(input());
    expect(result.error).toContain("token is already in use");
    expect(result.id).toBeUndefined();
  });
});

describe("Starter session save validation and ownership",()=>{
  it("checks the template owner and refuses an unavailable template before writing",async()=>{
    const fake=fakeClient(query=>query.table==="session_templates"?{data:null,error:null}:success(query));mocks.client.mockReturnValue(fake);
    const result=await completeStarterSession(input());
    expect(result.error).toContain("Session Starter for this run is unavailable");
    const query=fake.queries.find(q=>q.table==="session_templates")!;
    expect(query.filters).toEqual([["id",starterRun().template.id],["owner_id",OWNER_ID]]);
    expect(fake.queries.some(q=>q.method!=="select")).toBe(false);
  });

  it("refuses a track outside the owner scope",async()=>{
    const fake=fakeClient(query=>query.table==="tracks"?{data:null,error:null}:success(query));mocks.client.mockReturnValue(fake);
    const result=await completeStarterSession({...input(),trackId});
    expect(result.error).toContain("track no longer exists");
    expect(fake.queries).toHaveLength(1);expect(fake.queries[0].filters).toContainEqual(["owner_id",OWNER_ID]);
  });

  it.each(["foreign","duplicate"])("rejects %s completed-step identifiers before querying",async(kind)=>{
    const request=input();
    request.starterRun.completedStepIds=kind==="foreign"?["not-a-step-in-this-run"]:[request.starterRun.template.steps[0].id,request.starterRun.template.steps[0].id];
    const result=await completeStarterSession(request);
    expect(result.error).toContain("Completed steps must belong");expect(mocks.client).not.toHaveBeenCalled();
  });

  it("does not require every workflow step to be completed",async()=>{
    const fake=fakeClient(success);mocks.client.mockReturnValue(fake);
    const request=input();request.starterRun.completedStepIds=[];
    expect(await completeStarterSession(request)).toEqual({id:savedId});
  });

  it("returns migration instructions when a deployed database lacks starter columns",async()=>{
    const fake=fakeClient(query=>query.table==="session_templates"?{data:null,error:{code:"42703",message:"column starter_data does not exist"}}:success(query));mocks.client.mockReturnValue(fake);
    expect(await completeStarterSession(input())).toEqual({error:STARTER_MIGRATION_MESSAGE});
    expect(fake.queries.some(q=>q.table==="sessions")).toBe(false);
  });

  it("preserves the run for retry when the session write fails",async()=>{
    const fake=fakeClient(query=>query.table==="sessions"?{data:null,error:new Error("Session storage is unavailable")}:success(query));mocks.client.mockReturnValue(fake);
    const request=input();const snapshot=structuredClone(request.starterRun);
    expect(await completeStarterSession(request)).toEqual({error:"Session storage is unavailable"});
    expect(request.starterRun).toEqual(snapshot);expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("ordinary session regression",()=>{
  it("retains the trackless insert, activity allocation and session checklist flow",async()=>{
    const fake=fakeClient(success);mocks.client.mockReturnValue(fake);
    expect(await completeSession({trackId:null,startedAt,endedAt,notesMd:"Worked on new sounds",
      activities:[{key:"sound_design",minutes:15,note:" Kept three presets "},{key:"mixing",minutes:0,note:""}],
      todos:[{description:"Save the useful presets",done:true},{description:"Make a demo loop",done:false}],
    })).toEqual({id:savedId});
    const writes=fake.queries.filter(q=>q.method!=="select");
    expect(writes.map(q=>[q.table,q.method])).toEqual([["sessions","insert"],["session_activities","insert"],["session_todos","insert"]]);
    const session=writes[0].payload as Record<string,unknown>;
    expect(session).toMatchObject({track_id:null,status:"completed",notes_md:"Worked on new sounds"});
    expect(session).not.toHaveProperty("starter_run_id");expect(session).not.toHaveProperty("starter_snapshot");
    expect(writes[1].payload).toEqual([{session_id:savedId,activity_key:"sound_design",minutes:15,note:"Kept three presets"}]);
    expect(writes[2].payload).toMatchObject([{session_id:savedId,description:"Save the useful presets",done:true,sort_order:0},{session_id:savedId,description:"Make a demo loop",done:false,done_at:null,sort_order:1}]);
    expect(mocks.completeAction).not.toHaveBeenCalled();expect(mocks.revalidateTrack).not.toHaveBeenCalled();
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });
});
