"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Expand, ImagePlus, LoaderCircle, Replace, Star, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { deleteStarterVisual, saveSessionStarter, uploadStarterVisual } from "@/app/actions/session-starters";
import { STARTER_MEDIA_MAX_BYTES, type SessionStarter, type StarterMedia } from "@/lib/session-starters";
import { StarterCover } from "./starter-cover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type VisualKind = StarterMedia["kind"];

export function VisualManager({ starter, onChange, disabled = false, readOnly = false }: {
  starter: SessionStarter; onChange: (starter: SessionStarter) => void; disabled?: boolean; readOnly?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [kind, setKind] = useState<VisualKind>("infographic");
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const visuals = [...starter.media].sort((a, b) => a.sortOrder - b.sortOrder);
  const visual = visuals.find((item) => item.id === selectedId) ?? visuals.find((item) => item.id === starter.featuredMediaId) ?? visuals[0];
  const selectedIndex = visual ? visuals.findIndex((item) => item.id === visual.id) : -1;
  const locked = disabled || readOnly || pending;

  const save = (next: SessionStarter) => {
    setError("");
    startTransition(async () => {
      try {
        const result = await saveSessionStarter(next);
        if (result.error || !result.starter) setError(result.error ?? "Your visual settings could not be saved.");
        else onChange(result.starter);
      } catch { setError("Your visual settings could not be saved. Check your connection and retry."); }
    });
  };
  const chooseFile = (id: string | null) => {
    setReplaceId(id);
    setError("");
    fileInput.current?.click();
  };
  const upload = (file: File | undefined) => {
    if (!file || locked) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError("Choose a PNG, JPEG, WebP, or GIF image."); return; }
    if (!file.size || file.size > STARTER_MEDIA_MAX_BYTES) { setError("Choose an image smaller than 8 MB."); return; }
    const form = new FormData();
    form.set("starterId", starter.id); form.set("file", file); form.set("kind", replaceId ? (visuals.find((item) => item.id === replaceId)?.kind ?? kind) : kind);
    if (replaceId) form.set("replaceId", replaceId);
    setError("");
    startTransition(async () => {
      try {
        const result = await uploadStarterVisual(form);
        if (result.error || !result.starter) setError(result.error ?? "The image could not be uploaded. Try again.");
        else { onChange(result.starter); setSelectedId(null); }
      } catch { setError("The image could not be uploaded. Check your connection and retry."); }
    });
  };
  const remove = () => {
    if (!visual || !window.confirm(`Delete “${visual.name}”? This removes the uploaded image.`)) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteStarterVisual(starter.id, visual.id);
        if (result.error || !result.starter) setError(result.error ?? "The image could not be deleted.");
        else { onChange(result.starter); setSelectedId(null); }
      } catch { setError("The image could not be deleted. Try again."); }
    });
  };
  const move = (delta: number) => {
    const next = [...visuals];
    [next[selectedIndex], next[selectedIndex + delta]] = [next[selectedIndex + delta], next[selectedIndex]];
    save({ ...starter, media: next.map((item, index) => ({ ...item, sortOrder: index })) });
  };

  return <section className="min-w-0 rounded-2xl border border-border bg-surface p-3 shadow-sm" aria-label="Visual guides">
    <div className="relative overflow-hidden rounded-xl bg-surface-2">
      <button type="button" className="group block w-full text-left" onClick={() => { setFullscreen(true); setZoomed(false); }} aria-label={`Open ${visual?.name ?? starter.name} visual fullscreen`}>
        {visual ? <UploadedVisual key={visual.url} visual={visual} className="aspect-[4/3] w-full object-contain" /> : <StarterCover starter={starter} guide className="aspect-[4/3] w-full" />}
        <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg bg-black/45 text-white transition-colors group-hover:bg-black/65"><Expand className="size-4" /></span>
      </button>
    </div>
    {visual && <div className="mt-2 flex items-center justify-between gap-2 text-xs"><p className="truncate text-muted-foreground" title={visual.name}>{visual.name}</p>{starter.featuredMediaId === visual.id && <span className="flex shrink-0 items-center gap-1 text-primary"><Star className="size-3 fill-current" />Featured</span>}</div>}
    {!readOnly && <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="border-primary/15 bg-primary/5 text-primary" disabled={locked || visuals.length >= 30} onClick={() => chooseFile(null)}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{pending ? "Saving visual…" : "Upload Visual"}</Button>
        <label className="sr-only" htmlFor={`visual-kind-${starter.id}`}>New visual type</label>
        <select id={`visual-kind-${starter.id}`} className="h-8 min-w-0 rounded-md border border-border bg-surface px-2 text-xs" value={kind} disabled={locked} onChange={(event) => setKind(event.target.value as VisualKind)}><option value="infographic">Infographic</option><option value="cover">Cover image</option><option value="reference">Reference image</option></select>
      </div>
      <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Upload a visual guide" onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ""; }} />
    </>}
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Visual gallery">
      {visuals.map((item) => <button type="button" key={item.id} disabled={pending} aria-label={`View ${item.name}`} aria-pressed={item.id === visual?.id} onClick={() => setSelectedId(item.id)} className={cn("relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-surface-2 p-0.5 transition-colors", item.id === visual?.id ? "border-primary" : "border-transparent hover:border-primary/40")}><UploadedVisual visual={item} className="size-full rounded-md object-contain" />{item.id === starter.featuredMediaId && <span className="absolute bottom-0.5 right-0.5 rounded-full bg-primary p-0.5 text-white"><Check className="size-3" /></span>}</button>)}
      {!readOnly && <button type="button" disabled={locked || visuals.length >= 30} onClick={() => chooseFile(null)} aria-label="Add another visual" className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"><ImagePlus className="size-5" /></button>}
    </div>
    {!visual && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Make this space yours. Add a cover, screenshot, or workflow infographic.</p>}
    {visual && !readOnly && <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
      <Button size="sm" variant="ghost" disabled={locked || starter.featuredMediaId === visual.id} onClick={() => save({ ...starter, featuredMediaId: visual.id })}><Star className="size-3.5" />Feature</Button>
      <Button size="icon" variant="ghost" aria-label="Move visual left" disabled={locked || selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft className="size-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Move visual right" disabled={locked || selectedIndex >= visuals.length - 1} onClick={() => move(1)}><ArrowRight className="size-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Replace selected visual" title="Replace visual" disabled={locked} onClick={() => chooseFile(visual.id)}><Replace className="size-4" /></Button>
      <Button size="icon" variant="ghost" aria-label="Delete selected visual" title="Delete visual" disabled={locked} onClick={remove}><Trash2 className="size-4" /></Button>
    </div>}
    {!readOnly && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">PNG, JPG, WebP or GIF · Up to 8 MB. Guides open without cropping.</p>}
    {pending && <p role="status" className="sr-only">Saving visual changes…</p>}
    {error && <p role="alert" className="mt-3 rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <Dialog open={fullscreen} onOpenChange={setFullscreen}>
      <DialogContent className="h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] grid-rows-[auto_1fr] overflow-hidden p-4 sm:p-5">
        <DialogHeader className="pr-10"><DialogTitle className="truncate">{visual?.name ?? `${starter.name} · Visual Guide`}</DialogTitle><DialogDescription>View the complete visual. Zoom in for small details.</DialogDescription></DialogHeader>
        <div className="relative min-h-0 rounded-lg bg-surface-2">
          <div className="h-full overflow-auto p-3">{visual ? <UploadedVisual key={visual.url} visual={visual} className={cn("mx-auto", zoomed ? "max-w-none" : "h-full max-h-full w-full object-contain")} /> : <StarterCover starter={starter} guide className="mx-auto h-full min-h-80 max-w-4xl" />}</div>
          {visual && <Button type="button" variant="outline" size="sm" className="absolute bottom-3 right-3 bg-surface shadow-sm" onClick={() => setZoomed(!zoomed)}>{zoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}{zoomed ? "Fit to screen" : "Original size"}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}

function UploadedVisual({ visual, className }: { visual: StarterMedia; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <div className={cn("flex min-h-24 flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground", className)}><ImagePlus className="size-6" /><span>This visual is unavailable. Reload to refresh the link, or replace the image.</span></div>;
  // User uploads use short-lived, signed URLs and may be full-height infographics.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={visual.url} alt={visual.name} className={className} onError={() => setBroken(true)} />;
}
