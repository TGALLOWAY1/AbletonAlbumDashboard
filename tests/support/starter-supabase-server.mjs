/** Isolated PostgREST/Storage test double for browser integration tests.
 * Exercises application reads/actions; does NOT emulate PostgreSQL constraints,
 * RLS, migrations, or real object-storage authorization. Never use user keys.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

export const QA_TRACK_ID = 'aa550000-0000-4000-8000-000000000001';
const owner = '00000000-0000-0000-0000-000000000001';
const now = new Date().toISOString();
const tables = {
  session_templates: [], session_starter_media: [], sessions: [], session_todos: [], session_activities: [],
  tracks: [{ id: QA_TRACK_ID, name: 'QA Unfinished Track', owner_id: owner, status: 'active', created_at: now, updated_at: now, last_worked_at: null, tags: [], notes: '', notes_md: '', pinned_at: null, pin_order: null, album_id: null, cover_image_url: null, genre: null, bpm: 120, song_key: 'C', suno_status: 'todo', als_path: null }],
  session_types: [{id:'aa550000-0000-4000-8000-000000000002',owner_id:owner,name:'Organization',requires_track:false,is_archived:false,sort_order:0,color:'#999999',created_at:now}],
  track_stages: ['idea','sound_design','arrangement','mixing','mastering'].map((stage_key)=>({id:randomUUID(),track_id:QA_TRACK_ID,stage_key,percent:0,complete:false,created_at:now})),
};
const objects = new Map();
const initialTables=structuredClone(tables);
let fault = null;
function respond(res, data, status = 200, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers });
  res.end(data === undefined ? undefined : JSON.stringify(data));
}
function compare(raw, value) {
  if(raw.startsWith('not.')) return !compare(raw.slice(4),value);
  const dot=raw.indexOf('.'), op=raw.slice(0,dot), query=raw.slice(dot+1);
  if(op==='is') return query==='null' ? value==null : value===JSON.parse(query);
  if(op==='eq') return String(value)===query;
  if(op==='neq') return String(value)!==query;
  if(op==='in') return query.slice(1,-1).split(',').map(x=>x.replace(/^"|"$/g,'')).includes(String(value));
  if(op==='gte') return value!=null && value>=query;
  if(op==='gt') return value!=null && value>query;
  if(op==='lte') return value!=null && value<=query;
  if(op==='lt') return value!=null && value<query;
  return true;
}
function matches(row,params) {
  return [...params.entries()].every(([key,query])=>{
    if(['select','order','limit','offset','on_conflict','or','and'].includes(key)) return true;
    if(key==='tracks.owner_id') return tables.tracks.some(t=>t.id===row.track_id && compare(query,t.owner_id));
    return compare(query,row[key]);
  });
}
function decorate(row,table) {
  if(table==='sessions') {
    const track=tables.tracks.find(t=>t.id===row.track_id)??null;
    const type=tables.session_types.find(t=>t.id===row.session_type_id)??null;
    return {...row,track,tracks:track,session_type:type,session_activities:(tables.session_activities??[]).filter(a=>a.session_id===row.id)};
  }
  return row;
}
export async function startStarterSupabase(port = 54331) {
  const server=http.createServer(async (req,res)=>{
    try {
      const url=new URL(req.url,`http://127.0.0.1:${port}`);
      if(req.method==='OPTIONS') return respond(res,undefined,204,{'access-control-allow-headers':'*','access-control-allow-methods':'*'});
      if(url.pathname==='/__qa/reset') {for(const key of Object.keys(tables))delete tables[key];Object.assign(tables,structuredClone(initialTables));objects.clear();fault=null;return respond(res,{ok:true});}
      if(url.pathname==='/__qa/state') return respond(res,{tables,objects:[...objects.keys()]});
      let raw=Buffer.alloc(0);
      for await(const chunk of req) raw=Buffer.concat([raw,chunk]);
      let body;
      try { body=raw.length ? JSON.parse(raw.toString()) : null; } catch { body=raw; }
      if(url.pathname==='/__qa/fault') { fault=body; return respond(res,{ok:true}); }
      if(fault && url.pathname.includes(fault.match)) { const f=fault; fault=null; return respond(res,{code:'QA_FAILURE',message:f.message??'Injected QA failure'},f.status??500); }
      if(url.pathname.startsWith('/rest/v1/')) {
        const table=url.pathname.split('/').pop();
        tables[table]??=[];
        let rows=tables[table].filter(row=>matches(row,url.searchParams));
        if(req.method==='POST') {
          const inserted=[];
          for(const input of Array.isArray(body)?body:[body]) {
            const conflictKey=url.searchParams.get('on_conflict')??'id';
            const existing=tables[table].find(row=>input[conflictKey]!=null && row[conflictKey]===input[conflictKey]);
            if(existing && String(req.headers.prefer).includes('resolution=ignore-duplicates')) continue;
            if(existing && String(req.headers.prefer).includes('resolution=merge-duplicates')) {Object.assign(existing,input,{updated_at:new Date().toISOString()}); inserted.push(existing);continue;}
            const row={id:randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),archived_at:null,...input};
            if(table==='sessions' && row.started_at && row.ended_at) row.duration_seconds=Math.max(0,Math.round((new Date(row.ended_at)-new Date(row.started_at))/1000));
            tables[table].push(row);inserted.push(row);
          }
          rows=inserted;
        } else if(req.method==='PATCH') { for(const row of rows) Object.assign(row,body,{updated_at:new Date().toISOString()}); }
        else if(req.method==='DELETE') {tables[table]=tables[table].filter(row=>!rows.includes(row));}
        const order=url.searchParams.get('order');
        if(order) {
          const [key,direction]=order.split('.');
          rows.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(direction==='desc'?-1:1));
        }
        const count=rows.length;
        if(url.searchParams.has('offset')) rows=rows.slice(Number(url.searchParams.get('offset')));
        if(url.searchParams.has('limit')) rows=rows.slice(0,Number(url.searchParams.get('limit')));
        const single=String(req.headers.accept).includes('application/vnd.pgrst.object+json');
        const headers={'content-range':`0-${Math.max(0,rows.length-1)}/${count}`};
        if(req.method==='HEAD') return respond(res,undefined,200,headers);
        if(single && rows.length!==1) return respond(res,{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned',details:`The result contains ${rows.length} rows`},406,headers);
        return respond(res,single?decorate(rows[0],table):rows.map(row=>decorate(row,table)),req.method==='POST'?201:200,headers);
      }
      if(url.pathname.startsWith('/storage/v1/object/sign/')) {
        const bucket=url.pathname.split('/')[5];
        if(req.method==='POST') return respond(res,body.paths ? body.paths.map(path=>({path,signedURL:`/object/sign/${bucket}/${path}?token=qa`})) : {signedURL:`/object/sign/${url.pathname.slice('/storage/v1/object/sign/'.length)}?token=qa`});
        const key=decodeURIComponent(url.pathname.slice('/storage/v1/object/sign/'.length));
        const object=objects.get(key);
        if(!object) return respond(res,{message:'Object not found'},404);
        res.writeHead(200,{'content-type':object.type});res.end(object.bytes);return;
      }
      if(url.pathname==='/storage/v1/object/copy') {
        const source=objects.get(`${body.bucketId}/${body.sourceKey}`);
        if(source) objects.set(`${body.bucketId}/${body.destinationKey}`,source);
        return respond(res,{Key:body.destinationKey});
      }
      if(url.pathname.startsWith('/storage/v1/object/')) {
        const key=decodeURIComponent(url.pathname.slice('/storage/v1/object/'.length));
        if(req.method==='DELETE') {for(const path of body.prefixes??[])objects.delete(`${key}/${path}`);return respond(res,[]);}
        objects.set(key,{bytes:raw,type:req.headers['content-type']??'image/png'});
        return respond(res,{Key:key,Id:randomUUID()});
      }
      respond(res,{message:'QA route not implemented'},404);
    } catch(error) {console.error('QA API failure',error);respond(res,{message:error.message},500);}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return server;
}
if(import.meta.url===`file://${process.argv[1]}`) {
  await startStarterSupabase(Number(process.env.QA_SUPABASE_PORT??54331));
  console.log('Isolated QA Supabase test double listening on 54331');
}
