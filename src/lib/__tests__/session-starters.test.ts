import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CONTENT_STATUS_LABELS, STARTER_DURATIONS, STARTER_MEDIA_MAX_BYTES,
  seedSessionStarters, starterSchema, filterSessionStarters,
  isSafeResourceUrl, isTikTokUrl, videoEmbedUrl, validateStarterImage,
} from "@/lib/session-starters";

describe("Session Starter templates", () => {
  it("seeds six editable workflows with stable unique template and step ids", () => {
    const seeds=seedSessionStarters();
    expect(seeds).toHaveLength(6);
    expect(seeds.map(s=>s.id)).toEqual(seedSessionStarters().map(s=>s.id));
    expect(new Set(seeds.map(s=>s.id)).size).toBe(6);
    expect(new Set(seeds.flatMap(s=>s.steps.map(x=>x.id))).size).toBe(seeds.reduce((n,s)=>n+s.steps.length,0));
    for(const starter of seeds) {
      expect(starterSchema.safeParse(starter).success).toBe(true);
      expect(starter.steps.length).toBeGreaterThanOrEqual(3);
      expect(starter.outcomes.length).toBeGreaterThan(0);
      expect(starter.videoConcepts.length).toBeGreaterThan(0);
    }
  });
  it("supports all three launch durations without rewriting templates", () => {
    const starter=seedSessionStarters()[0];
    for(const defaultDuration of STARTER_DURATIONS) expect(starterSchema.safeParse({...starter,defaultDuration}).success).toBe(true);
    expect(starterSchema.safeParse({...starter,defaultDuration:30}).success).toBe(false);
  });
  it("combines search, category, duration, filmability and favorite filters", () => {
    const seeds=seedSessionStarters().map(s=>({...s,isFavorite:s.visualStyle==="vocal"}));
    expect(filterSessionStarters(seeds,{search:"VOCAL",category:"sound-design",duration:40,filmableOnly:true,favoritesOnly:true}).map(s=>s.name)).toEqual(["Vocal Riff"]);
    expect(filterSessionStarters(seeds,{search:"vocal",duration:20,favoritesOnly:true})).toEqual([]);
    expect(filterSessionStarters(seeds,{filmableOnly:true})).toHaveLength(5);
    expect(filterSessionStarters([{...seeds[0],archived:true}],{})).toHaveLength(0);
    expect(filterSessionStarters([{...seeds[0],archived:true}],{archived:true})).toHaveLength(1);
  });
  it("rejects duplicate step identifiers and a featured image outside the template", () => {
    const starter=seedSessionStarters()[0];
    expect(starterSchema.safeParse({...starter,steps:[starter.steps[0],starter.steps[0]]}).success).toBe(false);
    expect(starterSchema.safeParse({...starter,featuredMediaId:starter.id}).success).toBe(false);
  });
});

describe("safe resource and TikTok references", () => {
  it("accepts web links and absolute paths without permitting executable URLs", () => {
    for(const url of ["https://example.com/preset", "http://localhost:3000/resources", "/resources/sound-design", "/Users/producer/Drum Rack.als"]) expect(isSafeResourceUrl(url)).toBe(true);
    for(const url of ["javascript:alert(1)","data:text/html,<script>","//evil.example", "https://user:secret@example.com", "/bad\u0000path"]) expect(isSafeResourceUrl(url)).toBe(false);
  });
  it("uses the official player for numeric video URLs and external fallback for shortlinks", () => {
    const url="https://www.tiktok.com/@producer/video/1234567890";
    expect(isTikTokUrl(url)).toBe(true);
    expect(videoEmbedUrl(url)).toBe("https://www.tiktok.com/player/v1/1234567890");
    expect(isTikTokUrl("https://vm.tiktok.com/AbCdEf/")).toBe(true);
    expect(videoEmbedUrl("https://vm.tiktok.com/AbCdEf/")).toBe(null);
    for(const bad of ["https://www.tiktok.com.evil.example/@a/video/12", "https://eviltiktok.com/@a/video/12", "http://www.tiktok.com/@a/video/12", "https://www.tiktok.com/@a", "javascript:alert(1)", "https://user:secret@www.tiktok.com/@a/video/12"]) expect(isTikTokUrl(bad)).toBe(false);
  });
});

describe("server image validation", () => {
  it("checks file signatures as well as declared types", () => {
    expect(validateStarterImage(new Uint8Array([0xff,0xd8,0xff,0x00]),"image/jpeg")).toEqual({extension:"jpg",contentType:"image/jpeg"});
    expect(validateStarterImage(new Uint8Array([0x89,80,78,71,13,10,26,10]),"image/png").extension).toBe("png");
    expect(()=>validateStarterImage(new TextEncoder().encode("<svg><script>"),"image/png")).toThrow("valid PNG");
    expect(()=>validateStarterImage(new Uint8Array([0xff,0xd8,0xff]),"image/png")).toThrow("valid PNG");
  });
  it("rejects empty and oversized uploads", () => {
    expect(()=>validateStarterImage(new Uint8Array(),"image/jpeg")).toThrow("smaller than 8 MB");
    expect(()=>validateStarterImage(new Uint8Array(STARTER_MEDIA_MAX_BYTES+1),"image/jpeg")).toThrow("smaller than 8 MB");
  });
});

describe("Session Starter migration", () => {
  const sql=readFileSync(path.resolve(__dirname,"../../../supabase/migrations/0037_session_starters.sql"),"utf8");
  it("extends the existing template and session tables rather than introducing a parallel log", () => {
    expect(sql).toContain("alter table public.session_templates");
    expect(sql).toContain("alter table public.sessions");
    for(const col of ["starter_snapshot","starter_run_id","worked_seconds","starter_output"]) expect(sql).toContain(`add column if not exists ${col}`);
    expect(sql).toContain("on public.sessions(starter_run_id)");
  });
  it("keeps media private and enforces size/type/ownership constraints", () => {
    expect(sql).toContain("alter table public.session_starter_media enable row level security");
    expect(sql).toContain("'session-starter-visuals',false,8388608");
    expect(sql).not.toContain("image/svg+xml");
    expect(sql).toContain("references public.session_templates(id) on delete cascade");
    expect(Object.keys(CONTENT_STATUS_LABELS)).toEqual(["not-planned","idea-saved","ready-to-film","filmed","edited","published"]);
  });
});
