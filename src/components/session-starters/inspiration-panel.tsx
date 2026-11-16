"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Clapperboard, ExternalLink, Film, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { saveSessionStarter } from "@/app/actions/session-starters";
import { videoEmbedUrl, videoReferenceSchema, type SessionStarter, type VideoReference } from "@/lib/session-starters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function InspirationPanel({ starter, onChange, disabled = false, readOnly = false }: {
  starter: SessionStarter; onChange: (starter: SessionStarter) => void; disabled?: boolean; readOnly?: boolean;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<VideoReference | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const locked = disabled || readOnly || pending;
  const save = (videos: VideoReference[], after?: () => void) => {
    setError("");
    startTransition(async () => {
      try {
        const result = await saveSessionStarter({ ...starter, videos });
        if (result.error || !result.starter) setError(result.error ?? "Your inspiration could not be saved.");
        else { onChange(result.starter); after?.(); }
      } catch { setError("Your inspiration could not be saved. Check your connection and retry."); }
    });
  };
  const move = (index: number, delta: number) => {
    const next = [...starter.videos];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    save(next);
  };

  return <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm" aria-label="TikTok inspiration">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-white"><Film className="size-5" /></span><div><h2 className="text-base font-semibold tracking-tight">TikTok Inspiration</h2><p className="mt-0.5 text-xs text-muted-foreground">Video ideas for this session</p></div></div>
      {!readOnly && <Button type="button" variant="ghost" size="icon" disabled={locked || starter.videos.length >= 30} aria-label="Add TikTok reference" onClick={() => { setEditing(null); setError(""); setEditorOpen(true); }}><Plus className="size-4" /></Button>}
    </div>
    {starter.videos.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-primary/20 bg-primary/[0.025] px-4 py-6 text-center"><Clapperboard className="mx-auto size-7 text-primary/60" /><h3 className="mt-3 text-sm font-medium">A spark for your next video</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Save a TikTok that inspires a technique, a camera angle, or a creative transformation.</p>{!readOnly && <Button type="button" variant="outline" size="sm" className="mt-4 bg-surface" disabled={locked} onClick={() => { setEditing(null); setError(""); setEditorOpen(true); }}><Plus className="size-3.5" />Add a reference</Button>}</div> : <div className="mt-4 space-y-4">{starter.videos.map((video, index) => <div key={video.id} className="min-w-0 border-b border-border pb-4 last:border-0 last:pb-0">
      <VideoCard video={video} />
      {!readOnly && <div className="mt-1 flex justify-end gap-0.5">
        <Button type="button" size="icon" variant="ghost" disabled={locked || index === 0} aria-label={`Move reference ${index + 1} up`} onClick={() => move(index, -1)}><ArrowUp className="size-3.5" /></Button>
        <Button type="button" size="icon" variant="ghost" disabled={locked || index === starter.videos.length - 1} aria-label={`Move reference ${index + 1} down`} onClick={() => move(index, 1)}><ArrowDown className="size-3.5" /></Button>
        <Button type="button" size="icon" variant="ghost" disabled={locked} aria-label={`Edit ${video.title || "TikTok reference"}`} onClick={() => { setEditing(video); setError(""); setEditorOpen(true); }}><Pencil className="size-3.5" /></Button>
        <Button type="button" size="icon" variant="ghost" disabled={locked} aria-label={`Remove ${video.title || "TikTok reference"}`} onClick={() => save(starter.videos.filter((item) => item.id !== video.id))}><Trash2 className="size-3.5" /></Button>
      </div>}
    </div>)}</div>}
    {error && !editorOpen && <p role="alert" className="mt-3 rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit TikTok reference" : "Save some inspiration"}</DialogTitle><DialogDescription>Link a video and note the idea you want to try.</DialogDescription></DialogHeader>
      {editorOpen && <VideoForm key={editing?.id ?? "new"} video={editing} pending={pending} error={error} onSave={(video) => save(editing ? starter.videos.map((item) => item.id === video.id ? video : item) : [...starter.videos, video], () => setEditorOpen(false))} />}
    </DialogContent></Dialog>
  </section>;
}

function VideoCard({ video }: { video: VideoReference }) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerFailed, setPlayerFailed] = useState(false);
  const embed = videoEmbedUrl(video.url);
  return <>
    <div className="flex min-w-0 items-start gap-3">
      <button type="button" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-950 via-fuchsia-900 to-slate-950 text-white shadow-inner transition-opacity hover:opacity-85" aria-label={`View ${video.title || "TikTok reference"}`} onClick={() => setPlayerOpen(!playerOpen)} aria-expanded={playerOpen}><span className="flex size-9 items-center justify-center rounded-full border border-white/30 bg-white/10"><Play className="size-4 fill-current" /></span></button>
      <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold leading-snug">{video.title || "Saved TikTok reference"}</h3>{video.description && <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{video.description}</p>}<a className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline" href={video.url} target="_blank" rel="noopener noreferrer">Open in TikTok<ExternalLink className="size-3" /></a></div>
    </div>
    {video.notes && <p className="mt-2 break-words rounded-md bg-surface-2/70 p-2 text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Your note:</span> {video.notes}</p>}
    {playerOpen && <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface-2">
      {embed && !playerFailed ? <iframe src={embed} title={video.title || "TikTok inspiration player"} className="aspect-[9/13] w-full max-h-[460px]" loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" onError={() => setPlayerFailed(true)} /> : <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-4 text-center"><Film className="size-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">{embed ? "This video could not be embedded." : "This TikTok link opens in the original app."}</p></div>}
      <p className="p-3 text-center text-xs leading-relaxed text-muted-foreground">Player unavailable or video private? <a href={video.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">Open in TikTok</a>.</p>
    </div>}
  </>;
}

function VideoForm({ video, pending, error, onSave }: { video: VideoReference | null; pending: boolean; error: string; onSave: (video: VideoReference) => void }) {
  const [draft, setDraft] = useState<VideoReference>(() => video ?? { id: crypto.randomUUID(), url: "", title: "", description: "", notes: "" });
  const [validation, setValidation] = useState("");
  const patch = (next: Partial<VideoReference>) => setDraft({ ...draft, ...next });
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); const parsed = videoReferenceSchema.safeParse(draft); if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? "Check the video link."); return; } setValidation(""); onSave(parsed.data); }}>
    <fieldset disabled={pending} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium">TikTok video URL<Input required type="url" maxLength={2000} autoFocus placeholder="https://www.tiktok.com/@creator/video/…" value={draft.url} onChange={(event) => patch({ url: event.target.value })} /></label>
      <label className="block space-y-2 text-sm font-medium">Title <span className="font-normal text-muted-foreground">(optional)</span><Input maxLength={200} placeholder="e.g. Raw vocal to processed hook" value={draft.title} onChange={(event) => patch({ title: event.target.value })} /></label>
      <label className="block space-y-2 text-sm font-medium">Creative idea<Textarea maxLength={3000} rows={2} placeholder="What would you like to try from this video?" value={draft.description} onChange={(event) => patch({ description: event.target.value })} /></label>
      <label className="block space-y-2 text-sm font-medium">Your notes <span className="font-normal text-muted-foreground">(optional)</span><Textarea maxLength={3000} rows={2} value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} /></label>
    </fieldset>
    {(validation || error) && <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">{validation || error}</p>}
    <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save reference"}</Button>
  </form>;
}
