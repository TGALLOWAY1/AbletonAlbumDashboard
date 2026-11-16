"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Check, ChevronLeft, ChevronRight, Clock3, Copy, Heart, Layers3, Link2, ListChecks, Pencil, SlidersHorizontal, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrackPicker, type PickableTrack } from "@/components/track-picker";
import { useToast } from "@/components/toast";
import { duplicateSessionStarter, saveSessionStarter, toggleStarterFavorite } from "@/app/actions/session-starters";
import { STARTER_CATEGORY_LABELS, STARTER_DURATIONS, type SessionStarter, type StarterDuration } from "@/lib/session-starters";
import { cn } from "@/lib/utils";
import { stepTimeBudget } from "@/lib/starter-run";
import { StarterEditor } from "./editor";
import { VisualManager } from "./visual-manager";
import { InspirationPanel } from "./inspiration-panel";
import { FilmingPanel } from "./filming-panel";
import { StarterLaunchButton } from "./launch-button";

export function SessionStarterDetail({ starter: initial, available, tracks = [], neighbors = [] }: { starter: SessionStarter; available: boolean; tracks?: PickableTrack[]; neighbors?: { id: string; name: string }[] }) {
  const [starter, setStarter] = useState(initial);
  const [duration, setDuration] = useState<StarterDuration>(initial.defaultDuration);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const position = neighbors.findIndex((s) => s.id === starter.id);
  const previous = position > 0 ? neighbors[position - 1] : null;
  const next = position >= 0 && position < neighbors.length - 1 ? neighbors[position + 1] : null;
  const favorite = () => startTransition(async () => {
    try {
      const result = await toggleStarterFavorite(starter.id, !starter.isFavorite);
      if (result.error) throw new Error(result.error);
      setStarter((s) => ({ ...s, isFavorite: !s.isFavorite }));
    } catch (e) { toast(e instanceof Error ? e.message : "Could not save your favorite."); }
  });
  const duplicate = () => startTransition(async () => {
    try {
      const result = await duplicateSessionStarter(starter.id);
      if (result.error || !result.starter) throw new Error(result.error || "Could not duplicate this starter.");
      router.push(`/session-starters/${result.starter.id}`);
      router.refresh();
      toast("A fresh copy is ready to make your own.");
    } catch (e) { toast(e instanceof Error ? e.message : "Could not duplicate this starter."); }
  });
  const archive = () => startTransition(async () => {
    try {
      const result = await saveSessionStarter({ ...starter, archived: !starter.archived });
      if (result.error || !result.starter) throw new Error(result.error || "Could not update this starter.");
      setStarter(result.starter);
      router.refresh();
      toast(result.starter.archived ? "Starter archived. Your session history is safe." : "Starter restored.");
    } catch (e) { toast(e instanceof Error ? e.message : "Could not update this starter."); }
  });
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-28 sm:pb-10">
      <Link href="/session-starters" className="inline-flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Session Starters</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Layers3 className="h-6 w-6" strokeWidth={1.5} /></span><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.15em] text-primary">{STARTER_CATEGORY_LABELS[starter.category]} · {starter.archived ? "Archived starter" : "Your next creative session"}</p><h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight lg:text-3xl">{starter.name}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{starter.description}</p></div></div>
        <div className="flex items-center gap-1.5"><Button variant="outline" size="icon" onClick={favorite} disabled={!available || pending} aria-label={starter.isFavorite ? "Unfavorite starter" : "Favorite starter"} aria-pressed={starter.isFavorite}><Heart className="h-4 w-4" fill={starter.isFavorite ? "currentColor" : "none"} /></Button><Button variant="outline" onClick={() => setEditing(true)} disabled={!available || pending}><Pencil className="h-3.5 w-3.5" />Edit</Button><div className="ml-2 flex gap-1"><Button asChild variant="outline" size="icon" disabled={!previous}>{previous ? <Link href={`/session-starters/${previous.id}`} aria-label={`Previous starter: ${previous.name}`}><ChevronLeft className="h-4 w-4" /></Link> : <span aria-hidden><ChevronLeft className="h-4 w-4" /></span>}</Button><Button asChild variant="outline" size="icon" disabled={!next}>{next ? <Link href={`/session-starters/${next.id}`} aria-label={`Next starter: ${next.name}`}><ChevronRight className="h-4 w-4" /></Link> : <span aria-hidden><ChevronRight className="h-4 w-4" /></span>}</Button></div></div>
      </header>
      {!available && <p role="status" className="rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm text-muted-foreground">Starter preview · saving and launching will be available when storage is ready.</p>}
      {starter.archived && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground"><span>This starter is archived. Restore it to start a new session.</span><Button variant="outline" size="sm" onClick={archive} disabled={pending || !available}>Restore starter</Button></div>}

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-[1.12fr_1fr_.9fr]">
        <div className="min-w-0"><VisualManager starter={starter} onChange={setStarter} disabled={!available} /></div>
        <Card className="min-w-0 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><ListChecks className="h-5 w-5 text-muted-foreground" />Workflow Steps</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">One focused session. A few small steps. Something worth keeping.</p>
          <ol className="mt-6 space-y-0">{starter.steps.map((step, index) => <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">{index < starter.steps.length - 1 && <span className="absolute bottom-0 left-[14px] top-7 w-px bg-primary/20" aria-hidden />}<span className={cn("relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", index === 0 ? "bg-primary text-white" : "bg-primary/12 text-primary")}>{index + 1}</span><div className="min-w-0 pt-0.5"><div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><h3 className="text-sm font-semibold leading-snug">{step.title}</h3>{stepTimeBudget(duration, index, starter.steps.length) > 0 && <span className="shrink-0 text-[10px] font-medium text-primary">~{stepTimeBudget(duration, index, starter.steps.length)} min</span>}</div><p className="mt-1.5 whitespace-pre-line text-xs leading-[1.7] text-muted-foreground">{step.description}</p>{step.resources.length > 0 && <ul className="mt-2 flex flex-wrap gap-2">{step.resources.map((resource) => <li key={resource.id}><ResourceLink title={resource.title} url={resource.url} /></li>)}</ul>}</div></li>)}</ol>
          {starter.outcomes.length > 0 && <section className="mt-6 rounded-xl border border-primary/10 bg-primary/5 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-5 w-5 text-primary" />Expected Creative Outcome</h3><ul className="mt-3 space-y-2.5">{starter.outcomes.map((outcome, i) => <li key={i} className="flex items-start gap-2 text-xs leading-relaxed"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{outcome}</li>)}</ul></section>}
          {starter.resources.length > 0 && <section className="mt-5 border-t border-border pt-4"><h3 className="text-xs font-semibold">Your resources</h3><ul className="mt-2 space-y-2">{starter.resources.map((resource) => <li key={resource.id}><ResourceLink title={resource.title} url={resource.url} /></li>)}</ul></section>}
        </Card>
        <div className="grid min-w-0 gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1"><FilmingPanel starter={starter} onChange={setStarter} disabled={!available} /><InspirationPanel starter={starter} onChange={setStarter} disabled={!available} /></div>
      </div>

      <Card className="flex flex-wrap items-center gap-5 p-4 sm:p-5">
        <fieldset className="flex min-w-0 flex-wrap items-center gap-3"><legend className="sr-only">Session duration</legend><span className="inline-flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-5 w-5 text-muted-foreground" />Duration</span><div className="inline-flex rounded-full border border-border bg-surface-2/40 p-1">{STARTER_DURATIONS.map((minutes) => <label key={minutes} className={cn("relative cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary", duration === minutes ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}><input type="radio" name="starter-duration" value={minutes} checked={duration === minutes} onChange={() => setDuration(minutes)} className="sr-only" />{minutes} min</label>)}</div></fieldset>
        <div className="min-w-[200px] flex-1 border-border sm:border-l sm:pl-5"><p className="mb-2 flex items-center gap-2 text-xs font-semibold"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" />Session Options</p><TrackPicker tracks={tracks} value={trackId} onChange={setTrackId} /><p className="mt-1.5 text-[10px] text-muted-foreground">Your time, workflow, and notes will be logged together.</p></div>
        <StarterLaunchButton starter={starter} duration={duration} trackId={trackId} trackName={tracks.find((track) => track.id === trackId)?.name ?? null} disabled={!available || starter.archived} className="hidden h-12 px-9 text-base sm:inline-flex" />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1"><p className="text-xs text-muted-foreground">Make this workflow your own. Change the steps, add a guide, or save a reference.</p><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={duplicate} disabled={!available || pending}><Copy className="h-3.5 w-3.5" />Duplicate</Button><Button variant="ghost" size="sm" onClick={archive} disabled={!available || pending}><Archive className="h-3.5 w-3.5" />{starter.archived ? "Restore" : "Archive"}</Button></div></div>
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-4px_16px_#00000005] backdrop-blur sm:hidden"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{starter.name}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" />{duration} min · {starter.steps.length} steps</p></div><StarterLaunchButton starter={starter} duration={duration} trackId={trackId} trackName={tracks.find((track) => track.id === trackId)?.name ?? null} disabled={!available || starter.archived} className="h-11 shrink-0 px-5" /></div>
      <StarterEditor starter={starter} open={editing} onOpenChange={setEditing} onSaved={(saved) => { setStarter(saved); setDuration(saved.defaultDuration); setEditing(false); router.refresh(); }} />
    </div>
  );
}

function ResourceLink({ title, url }: { title: string; url: string }) {
  const localPath = url.startsWith("/") && !url.startsWith("/resources") && !url.startsWith("/library") && !url.startsWith("/templates");
  return localPath ? <span className="flex max-w-full items-start gap-1.5 break-all rounded-md bg-surface-2 px-2 py-1.5 text-xs text-muted-foreground"><Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><strong className="font-medium text-foreground">{title}</strong><br />{url}</span></span> : <a href={url} target={url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"><Link2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{title}</span></a>;
}
