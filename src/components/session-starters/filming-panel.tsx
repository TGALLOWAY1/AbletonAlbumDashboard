"use client";

import { useState, useTransition } from "react";
import { Camera, Check, Lightbulb, Video } from "lucide-react";
import { saveSessionStarter } from "@/app/actions/session-starters";
import type { SessionStarter } from "@/lib/session-starters";
import { cn } from "@/lib/utils";

export function FilmingPanel({ starter, onChange, disabled = false, readOnly = false }: {
  starter: SessionStarter; onChange: (starter: SessionStarter) => void; disabled?: boolean; readOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toggle = () => {
    setError("");
    startTransition(async () => {
      try {
        const result = await saveSessionStarter({ ...starter, isFilmable: !starter.isFilmable });
        if (result.error || !result.starter) setError(result.error ?? "The filming setting could not be saved.");
        else onChange(result.starter);
      } catch { setError("The filming setting could not be saved. Try again."); }
    });
  };
  return <section className="rounded-2xl border border-border bg-surface p-3 shadow-sm" aria-label="Content creation">
    <div className={cn("rounded-xl border p-3 transition-colors", starter.isFilmable ? "border-primary/15 bg-primary/5" : "border-border bg-surface-2/40")}>
      <div className="flex items-center justify-between gap-3"><h2 className={cn("flex items-center gap-2 text-base font-semibold", starter.isFilmable && "text-primary")}><Video className="size-5" />Filmable</h2><button type="button" role="switch" aria-checked={starter.isFilmable} aria-label="Suitable for filming" disabled={pending || disabled || readOnly} onClick={toggle} className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-50", starter.isFilmable ? "bg-primary" : "bg-border")}><span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", starter.isFilmable && "translate-x-5")} /></button></div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{starter.isFilmable ? "Great for a process video, a before-and-after, or a sound design breakdown." : "A session for your creative practice. Turn on filming when there is a story to share."}</p>
    </div>
    {starter.isFilmable && <div className="space-y-4 px-1 pt-4 pb-1">
      {starter.videoConcepts.length > 0 && <div><h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Lightbulb className="size-3.5" />Video concepts</h3><ul className="mt-2 space-y-2">{starter.videoConcepts.map((concept, index) => <li key={index} className="text-sm leading-relaxed">{concept}</li>)}</ul></div>}
      {starter.filmingInstructions && <p className="text-xs leading-relaxed text-muted-foreground">{starter.filmingInstructions}</p>}
      {starter.captureChecklist.length > 0 && <div><h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Camera className="size-3.5" />Capture checklist</h3><ul className="mt-2 space-y-1.5">{starter.captureChecklist.map((item, index) => <li key={index} className="flex gap-2 text-xs leading-relaxed"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" /><span>{item}</span></li>)}</ul></div>}
      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">You can record whether you captured footage when you finish a session.</p>
    </div>}
    {error && <p role="alert" className="mt-3 rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>}
  </section>;
}
