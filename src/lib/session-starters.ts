import { z } from "zod";

export const STARTER_DURATIONS = [20, 40, 60] as const;
export type StarterDuration = (typeof STARTER_DURATIONS)[number];
export const STARTER_CATEGORY_LABELS = {
  "music-production": "Music Production",
  "sound-design": "Sound Design",
  performance: "Performance",
  content: "Content",
} as const;
export type StarterCategory = keyof typeof STARTER_CATEGORY_LABELS;
export const CONTENT_STATUS_LABELS = {
  "not-planned": "Not Planned",
  "idea-saved": "Idea Saved",
  "ready-to-film": "Ready to Film",
  filmed: "Filmed",
  edited: "Edited",
  published: "Published",
} as const;
export type ContentStatus = keyof typeof CONTENT_STATUS_LABELS;
export const STARTER_MEDIA_BUCKET = "session-starter-visuals";
export const STARTER_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const STARTER_MIGRATION_MESSAGE =
  "Session Starters needs supabase/migrations/0037_session_starters.sql. Apply it with supabase db push, then reload.";

export function isSafeResourceUrl(value: string): boolean {
  if (/^\/(?!\/)/.test(value)) return !/[\u0000-\u001f]/.test(value);
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

/** Official player for full TikTok video URLs; short links use the external fallback. */
export function videoEmbedUrl(value: string): string | null {
  if (!isTikTokUrl(value)) return null;
  const id = new URL(value).pathname.match(/^\/@[^/]+\/video\/(\d+)\/?$/)?.[1];
  return id ? `https://www.tiktok.com/player/v1/${id}` : null;
}
export function isTikTokUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password &&
      ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(u.hostname) &&
      (/^\/@[^/]+\/video\/\d+\/?$/.test(u.pathname) ||
        (["vm.tiktok.com", "vt.tiktok.com"].includes(u.hostname) && /^\/[a-zA-Z0-9]+\/?$/.test(u.pathname)) ||
        /^\/t\/[a-zA-Z0-9]+\/?$/.test(u.pathname));
  } catch { return false; }
}
const text = z.string().trim();
export const starterResourceSchema = z.object({
  id: z.string().uuid(), title: text.min(1).max(160),
  url: text.max(2000).refine(isSafeResourceUrl, "Use an http(s) URL or an absolute file path."),
});
export type StarterResource = z.infer<typeof starterResourceSchema>;
export const starterStepSchema = z.object({
  id: z.string().uuid(), title: text.min(1).max(160), description: text.max(3000),
  resourceIds: z.array(z.string().uuid()).optional(),
  resources: z.array(starterResourceSchema).max(20),
});
export type StarterStep = z.infer<typeof starterStepSchema>;
export const videoReferenceSchema = z.object({
  id: z.string().uuid(), url: text.max(2000).refine(isTikTokUrl, "Enter a valid https TikTok video URL."),
  title: text.max(200), description: text.max(3000), notes: text.max(3000),
});
export type VideoReference = z.infer<typeof videoReferenceSchema>;
export const starterMediaSchema = z.object({
  id: z.string().uuid(), url: z.string(), path: z.string().max(1000), name: text.max(255),
  kind: z.enum(["cover", "infographic", "reference"]), sortOrder: z.number().int().min(0),
});
export type StarterMedia = z.infer<typeof starterMediaSchema>;
export const starterSchema = z.object({
  id: z.string().uuid(), name: text.min(1).max(160), description: text.max(2000),
  category: z.enum(["music-production", "sound-design", "performance", "content"]),
  defaultDuration: z.union([z.literal(20), z.literal(40), z.literal(60)]),
  steps: z.array(starterStepSchema).min(1).max(30), outcomes: z.array(text.max(500)).max(20),
  isFilmable: z.boolean(), videoConcepts: z.array(text.max(1000)).max(20),
  filmingInstructions: text.max(5000), captureChecklist: z.array(text.max(500)).max(30),
  resources: z.array(starterResourceSchema).max(40), videos: z.array(videoReferenceSchema).max(30),
  media: z.array(starterMediaSchema).max(30), featuredMediaId: z.string().uuid().nullable(),
  isFavorite: z.boolean(), archived: z.boolean(), visualStyle: text.max(40),
  createdAt: z.string(), updatedAt: z.string(),
}).superRefine((value, ctx) => {
  for (const [key, items] of [["steps", value.steps], ["media", value.media], ["videos", value.videos]] as const) {
    if (new Set(items.map((item) => item.id)).size !== items.length) {
      ctx.addIssue({code:"custom", path:[key], message:"Each item must have a unique identifier."});
    }
  }
  if (value.featuredMediaId && !value.media.some((m) => m.id === value.featuredMediaId)) {
    ctx.addIssue({code:"custom", path:["featuredMediaId"], message:"Choose a visual belonging to this starter."});
  }
});
export type SessionStarter = z.infer<typeof starterSchema>;

/** Signature validation happens on the server too; SVG/HTML never enter storage. */
export function validateStarterImage(bytes: Uint8Array, declaredType: string): { extension: string; contentType: string } {
  if (!bytes.length || bytes.length > STARTER_MEDIA_MAX_BYTES) throw new Error("Choose an image smaller than 8 MB.");
  const sig = String.fromCharCode(...bytes.slice(0, 12));
  let detected: {extension:string;contentType:string} | null = null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) detected = {extension:"jpg",contentType:"image/jpeg"};
  if (bytes[0] === 0x89 && sig.slice(1, 4) === "PNG" && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) detected = {extension:"png",contentType:"image/png"};
  if (sig.startsWith("GIF87a") || sig.startsWith("GIF89a")) detected = {extension:"gif",contentType:"image/gif"};
  if (sig.startsWith("RIFF") && sig.slice(8, 12) === "WEBP") detected = {extension:"webp",contentType:"image/webp"};
  if (!detected || detected.contentType !== declaredType) throw new Error("Upload a valid PNG, JPEG, WebP, or GIF image.");
  return detected;
}

const seedId = (n: number) => `ff550000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const seedStep = (n:number, title:string, description:string): StarterStep => ({id:seedId(n),title,description,resources:[]});
export function seedSessionStarters(): SessionStarter[] {
  const base = {
    description:"", category:"sound-design" as StarterCategory, defaultDuration:40 as StarterDuration,
    isFilmable:true, filmingInstructions:"Capture the starting point, a few key decisions, and the finished result. Record clean audio alongside your screen or camera.",
    captureChecklist:["Capture a before clip", "Record clean audio", "Capture the finished result"],
    resources:[],videos:[],media:[],featuredMediaId:null,isFavorite:false,archived:false,
    createdAt:"2026-01-01T00:00:00.000Z",updatedAt:"2026-01-01T00:00:00.000Z",
  } satisfies Partial<SessionStarter>;
  return [
    {...base,id:seedId(1),name:"Drum Rack Only",visualStyle:"drums",defaultDuration:20,
      description:"Build your own palette of drums. One rack, endless possibilities.",
      steps:[seedStep(101,"Choose your starting rack","Start with an empty drum rack or load an existing saved rack. Link its location in Resources so it is ready next time."),seedStep(102,"Build & refine","Design or layer your kicks, snares and hats. Shape transients, tune the sounds, and dial in your macros."),seedStep(103,"Save to your library","Name the finished drum rack, save it to your library, and record a short pattern to hear it in context.")],
      outcomes:["A reusable custom drum rack","A short pattern to audition it"],videoConcepts:["Finger-drumming performance", "From empty rack to a custom drum kit"]},
    {...base,id:seedId(2),name:"Vocal Riff",visualStyle:"vocal",description:"Generate, shape, and process vocal ideas into reusable hooks, layers, and textures.",
      steps:[seedStep(201,"Record ideas","Open a vocal recording template with 1–3 channels. Freestyle or write a phrase, then capture 3–5 dry variations over an optional backing track."),seedStep(202,"Process & shape","Clean up, add EQ and compression, then explore reverb, delay, distortion and formant effects. Try a chain inspired by Bon Iver, The 1975, Travis Scott, or brakence."),seedStep(203,"Build layers","Create doubles, harmonies, chops, and textures. Compare a few effect-chain variations and keep the strongest ideas."),seedStep(204,"Export & save","Save your best dry recordings, processed hooks, stems, and a reusable FX chain or preset. Add template, backing-track, and preset links in Resources.")],
      outcomes:["1–2 strong vocal hooks","Layered variations and vocal textures","A reusable FX chain or preset","Stems ready for a drop or new track"],videoConcepts:["Raw vocal to processed hook transformation","Build a vocal hook in four layers"]},
    {...base,id:seedId(3),name:"Drop-Focused Preset Arrangement",visualStyle:"preset",category:"music-production",defaultDuration:60,
      description:"Turn a small sound palette into a focused drop. Make the sounds yours.",
      steps:[seedStep(301,"Pick an idea & sounds","Choose a musical idea and a handful of starting presets. Decide on the bass, lead, rhythm, and texture roles."),seedStep(302,"Design & arrange a drop","Modify the sounds and arrange a short, focused drop. Build contrast, movement, and one memorable moment."),seedStep(303,"Save four useful sounds","Save four designed or modified sounds, label their roles, and bounce the arrangement for next time.")],
      outcomes:["A focused drop arrangement","Four reusable sounds or presets"],videoConcepts:["Four sounds transformed into a complete drop"]},
    {...base,id:seedId(4),name:"Drop-Focused Sample Arrangement",visualStyle:"sample",category:"music-production",
      description:"Find a spark in a sample and turn it into a drop with your own identity.",
      steps:[seedStep(401,"Select your samples","Choose existing samples or create a few new ones. Look for a strong vocal, texture, or loop as your starting point."),seedStep(402,"Transform & arrange","Chop, pitch, stretch, and resample the material. Arrange the strongest transformations into a short musical idea."),seedStep(403,"Develop the drop","Add rhythm, bass, and contrast around your sample. Develop one cohesive drop rather than a full track."),seedStep(404,"Save the useful pieces","Save the best samples, loops, and arrangement ideas. Bounce a draft and note what you would develop next.")],
      outcomes:["A sample-based drop","Useful transformed samples and arrangement ideas"],videoConcepts:["Sample-to-drop transformation"]},
    {...base,id:seedId(5),name:"Play Along",visualStyle:"performance",category:"performance",defaultDuration:20,
      description:"Get out of your head and into the groove. Practice, improvise, and keep the good takes.",
      steps:[seedStep(501,"Load a simple beat","Start with a kick, snare, and hi-hat beat. Keep the groove simple enough to leave room to play."),seedStep(502,"Choose a backing track","Load a loop or backing track that invites improvisation. Set a comfortable tempo."),seedStep(503,"Play & develop variations","Play along on your controller or instrument. Explore fills, dynamics, and 4–8 bar variations."),seedStep(504,"Record useful takes","Record the strongest performances and label the good sections. Keep both audio and MIDI when useful.")],
      outcomes:["A performance take","New rhythmic or melodic variations"],videoConcepts:["Live finger-drumming performance","Controller performance over a favorite loop"]},
    {...base,id:seedId(6),name:"Reflect & Archive",visualStyle:"archive",category:"content",defaultDuration:20,isFilmable:false,
      description:"Turn this week’s experiments into a library your future self will thank you for.",
      steps:[seedStep(601,"Review recent sessions","Listen back to recent work and read your session notes. Notice the ideas that still feel exciting."),seedStep(602,"Find the reusable material","Identify useful sounds, loops, presets, racks, and promising fragments. Pick the assets worth keeping."),seedStep(603,"Organize & archive","Name, tag, and save the reusable material in your library. Remove duplicates and link useful projects."),seedStep(604,"Leave a next action","Document ideas for future sessions and write one concrete next step for the work you want to return to.")],
      outcomes:["An organized set of reusable assets","Clear ideas and next actions"],videoConcepts:["Behind-the-scenes creative workflow","An asset-library walkthrough"]},
  ];
}

export function filterSessionStarters(starters:SessionStarter[], filters:{search?:string;category?:StarterCategory|"all";filmableOnly?:boolean;duration?:StarterDuration|"all";favoritesOnly?:boolean;archived?:boolean}): SessionStarter[] {
  const q=(filters.search??"").trim().toLowerCase();
  return starters.filter((s)=>s.archived===!!filters.archived && (!filters.category || filters.category==="all" || s.category===filters.category) && (!filters.duration || filters.duration==="all" || s.defaultDuration===filters.duration) && (!filters.filmableOnly || s.isFilmable) && (!filters.favoritesOnly || s.isFavorite) && (!q || [s.name,s.description,...s.outcomes,...s.steps.map(x=>x.title)].join(" ").toLowerCase().includes(q)));
}
