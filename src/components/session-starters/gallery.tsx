"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArrowRight, Check, Clock3, Heart, Layers3, Music2, Plus, Search, Sparkles, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { toggleStarterFavorite } from "@/app/actions/session-starters";
import { STARTER_CATEGORY_LABELS, filterSessionStarters, type SessionStarter, type StarterCategory, type StarterDuration } from "@/lib/session-starters";
import { cn } from "@/lib/utils";
import { StarterCover } from "./starter-cover";
import { StarterEditor } from "./editor";
import { StarterLaunchButton } from "./launch-button";

export function SessionStarterGallery({ starters: initial, available }: { starters: SessionStarter[]; available: boolean }) {
  const [starters, setStarters] = useState(initial);
  const [category, setCategory] = useState<StarterCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [duration, setDuration] = useState<StarterDuration | "all">("all");
  const [filmableOnly, setFilmableOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [archived, setArchived] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const filtered = useMemo(() => filterSessionStarters(starters, { category, search, duration, filmableOnly, favoritesOnly, archived }), [starters, category, search, duration, filmableOnly, favoritesOnly, archived]);
  const resetFilters = () => { setSearch(""); setCategory("all"); setDuration("all"); setFilmableOnly(false); setFavoritesOnly(false); setArchived(false); };
  const favorite = (starter: SessionStarter) => startTransition(async () => {
    const next = !starter.isFavorite;
    setStarters((items) => items.map((s) => s.id === starter.id ? { ...s, isFavorite: next } : s));
    try {
      const result = await toggleStarterFavorite(starter.id, next);
      if (result.error) throw new Error(result.error);
    } catch (e) {
      setStarters((items) => items.map((s) => s.id === starter.id ? { ...s, isFavorite: starter.isFavorite } : s));
      toast(e instanceof Error ? e.message : "Could not save your favorite. Try again.");
    }
  });
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Layers3 className="h-6 w-6" strokeWidth={1.6} /></span>
          <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Less thinking. More making.</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Session Starters</h1><p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">Structured creative sessions to make music, build assets, and create content.</p></div>
        </div>
        <Button onClick={() => setEditorOpen(true)} disabled={!available} className="h-10"><Plus className="h-4 w-4" />Add Session</Button>
      </header>

      {!available && <div role="status" className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">You’re viewing starter previews. Saving and launching will be available when Session Starters storage is ready.</div>}

      <div className="grid items-start gap-5 min-[1280px]:grid-cols-[minmax(0,1fr)_248px]">
        <div className="min-w-0 space-y-4">
          <section aria-label="Filter Session Starters" className="rounded-xl border border-border/70 bg-surface p-2 shadow-[0_1px_3px_#00000004]">
            <div className="flex flex-wrap items-center gap-1">
              {([['all', 'All Starters'], ...Object.entries(STARTER_CATEGORY_LABELS)] as [StarterCategory | "all", string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={cn("min-h-10 rounded-lg px-3 text-xs font-medium transition-colors sm:px-3.5", category === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>{label}</button>)}
              <label className="ml-auto flex min-h-10 items-center gap-2 rounded-lg border border-border px-2.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /><span className="sr-only">Suggested duration</span><select aria-label="Suggested duration" value={duration} onChange={(e) => setDuration(e.target.value === "all" ? "all" : Number(e.target.value) as StarterDuration)} className="min-h-9 bg-transparent text-foreground outline-none"><option value="all">Duration: All</option><option value="20">20 minutes</option><option value="40">40 minutes</option><option value="60">60 minutes</option></select></label>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 px-1 pt-2">
              <div className="relative min-w-[150px] flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search Session Starters" placeholder="Find your next creative session…" value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 bg-transparent pl-9 shadow-none" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-1 top-0 flex h-9 w-9 items-center justify-center"><X className="h-3.5 w-3.5" /></button>}</div>
              <FilterChip active={filmableOnly} onClick={() => setFilmableOnly(!filmableOnly)}><Video className="h-3.5 w-3.5" />Filmable Only</FilterChip>
              <FilterChip active={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><Heart className="h-3.5 w-3.5" />Favorites</FilterChip>
              <button type="button" aria-label={archived ? "Show active starters" : "Show archived starters"} aria-pressed={archived} onClick={() => setArchived(!archived)} className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-2", archived ? "bg-primary/10 text-primary" : "text-muted-foreground")}><Archive className="h-4 w-4" /></button>
            </div>
          </section>

          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground"><p aria-live="polite">{filtered.length} {archived ? "archived " : ""}{filtered.length === 1 ? "starter" : "starters"} · a little structure, a lot of possibility</p>{(search || category !== "all" || duration !== "all" || filmableOnly || favoritesOnly || archived) && <button onClick={resetFilters} className="font-medium text-primary hover:underline">Reset filters</button>}</div>

          {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((starter) => <article key={starter.id} className="group relative flex min-w-0 flex-col rounded-xl border border-border/75 bg-surface p-2 shadow-[0_2px_5px_#25271808] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
              <Link href={`/session-starters/${starter.id}`} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-offset-4" aria-label={`View ${starter.name}`} />
              <div className="pointer-events-none relative aspect-[2/1] overflow-hidden rounded-lg"><StarterCover starter={starter} className="transition-transform duration-500 group-hover:scale-[1.025]" />{starter.isFilmable && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border border-white/70 bg-[#e9f7e9] px-1.5 py-1 text-[10px] font-semibold text-[#26723e]"><Video className="h-3 w-3" />Filmable</span>}</div>
              <button type="button" onClick={() => favorite(starter)} disabled={!available || pending} aria-label={`${starter.isFavorite ? "Unfavorite" : "Favorite"} ${starter.name}`} aria-pressed={starter.isFavorite} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white transition-colors hover:bg-black/50 disabled:opacity-50"><Heart className="h-5 w-5" fill={starter.isFavorite ? "currentColor" : "none"} /></button>
              <div className="pointer-events-none flex flex-1 flex-col px-1.5 pb-1 pt-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">{STARTER_CATEGORY_LABELS[starter.category]}</p>
                <div className="mb-3 flex min-h-10 items-start justify-between gap-2"><h2 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">{starter.name}</h2><span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground"><Clock3 className="h-3 w-3" />{starter.defaultDuration} min</span></div>
                <ol className="mb-4 space-y-2">{starter.steps.slice(0, 3).map((step) => <li key={step.id} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/85"><span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>{step.title}</li>)}</ol>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3"><span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-primary/7 px-2 py-1.5 text-[10px] font-medium leading-snug text-primary"><Sparkles className="h-3 w-3 shrink-0" />{starter.outcomes[0] || "A fresh creative idea"}</span><StarterLaunchButton starter={starter} duration={duration === "all" ? starter.defaultDuration : duration} disabled={!available || starter.archived} className="pointer-events-auto relative z-10 h-8 px-3 text-xs" /></div>
              </div>
            </article>)}
          </div> : <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 px-6 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8 text-primary"><Search className="h-6 w-6" /></span><h2 className="text-lg font-semibold">{favoritesOnly ? "Your favorites will live here" : archived ? "No archived starters" : "A fresh start is a filter away"}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{favoritesOnly ? "Tap the heart on a starter to keep your go-to sessions close." : "Try another search or clear your filters to explore the collection."}</p><Button variant="outline" className="mt-5" onClick={resetFilters}>View all starters</Button></div>}
        </div>
        <GalleryInspiration starters={starters} />
      </div>
      <StarterEditor open={editorOpen} onOpenChange={setEditorOpen} onSaved={(starter) => { setStarters((items) => [starter, ...items.filter((s) => s.id !== starter.id)]); setEditorOpen(false); }} />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors", active ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface-2")}>{children}</button>;
}

function GalleryInspiration({ starters }: { starters: SessionStarter[] }) {
  const filmable = starters.filter((s) => s.isFilmable && !s.archived);
  const hero = filmable[0];
  const saved = starters.filter((s) => !s.archived).flatMap((s) => s.videos.map((video) => ({ video, starter: s })));
  return <aside className="grid min-w-0 gap-x-5 rounded-xl sm:grid-cols-2 min-[1280px]:block border border-border/70 bg-surface p-4 shadow-[0_2px_5px_#25271806]">
    <div className="sm:col-span-2"><div className="flex items-center gap-2"><Music2 className="h-5 w-5 shrink-0" /><h2 className="text-base font-semibold tracking-tight">Video Ideas & Inspiration</h2></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Make music. Capture the moment.</p></div>
    {hero && <Link href={`/session-starters/${hero.id}`} className="group relative mt-4 block h-64 overflow-hidden rounded-lg bg-[#0e171c]"><StarterCover starter={hero} className="absolute inset-0 scale-125 opacity-70 transition-transform duration-500 group-hover:scale-[1.3]" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/30" /><div className="absolute inset-x-4 top-4"><span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">YOUR NEXT CONTENT IDEA</span></div><div className="absolute inset-x-4 bottom-4"><Video className="mb-3 h-7 w-7 text-[#b5e5bf]" /><h3 className="max-w-56 text-xl font-semibold leading-tight tracking-tight text-white">{hero.videoConcepts[0] || "A glimpse inside your creative process"}</h3><span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/70">Explore this session<ArrowRight className="h-3 w-3" /></span></div></Link>}
    <div className="mt-5 space-y-4">{(saved.length ? saved.slice(0, 4).map(({ starter, video }) => ({ starter, title: video.title || "Saved TikTok inspiration", subtitle: video.description || "Your saved reference" })) : filmable.slice(1, 4).map((starter) => ({ starter, title: starter.videoConcepts[0] || starter.name, subtitle: "Filming concept · make it your own" }))).map(({ starter, title, subtitle }, index) => <Link key={`${starter.id}-${index}`} href={`/session-starters/${starter.id}`} className="group flex items-center gap-3"><div className="h-14 w-20 shrink-0 overflow-hidden rounded-md"><StarterCover starter={starter} /></div><div className="min-w-0"><h3 className="line-clamp-2 text-xs font-semibold leading-relaxed group-hover:text-primary">{title}</h3><p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">{subtitle}</p></div></Link>)}</div>
    {!saved.length && <p className="mt-5 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground sm:col-span-2">Have a video in mind? Save a TikTok reference inside any session to keep your inspiration nearby.</p>}
  </aside>;
}
