"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Circle, Clock3, ListChecks, Pause, Play, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useFocusSession } from "@/components/focus-session-provider";
import { formatSessionTime } from "@/lib/starter-run";
import { StarterResourceLinks } from "./resource-links";
import { VisualManager } from "./visual-manager";

export function StarterActiveSession() {
  const session = useFocusSession();
  const router = useRouter();
  const run = session.starter;

  if (!session.isHydrated) return <p role="status" className="py-24 text-center text-muted-foreground">Restoring your session…</p>;
  if (!run || session.phase === "idle") return <div className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center gap-4 text-center">
    <ListChecks className="h-10 w-10 text-primary" aria-hidden />
    <h1 className="text-2xl font-semibold">Choose your next creative session</h1>
    <p className="text-muted-foreground">A little structure. Space to make something.</p>
    <Button asChild><Link href="/session-starters">Explore Session Starters</Link></Button>
  </div>;

  const remaining = Math.max(0, run.durationMinutes * 60_000 - session.elapsedMs);
  // A stopped run is no longer counting down: show what was worked, not a
  // "time remaining" frozen at the moment Stop was pressed.
  const stopped = session.phase === "stopped";
  const counting = remaining > 0 && !stopped;
  const progress = Math.min(100, session.elapsedMs / (run.durationMinutes * 600));
  const end = () => { session.stop(); router.push("/focus/log"); };

  return <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
    <Link href={`/session-starters/${run.template.id}`} className="text-sm text-muted-foreground hover:text-primary">← Back to starter</Link>
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your creative session</p><h1 className="text-3xl font-semibold tracking-tight">{run.template.name}</h1><p className="mt-2 text-sm text-muted-foreground">{session.trackName ? `${session.trackName} · ` : ""}{run.durationMinutes} minutes to make something useful.</p></div>
      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">{session.phase === "paused" ? "Paused · take your time" : session.phase === "stopped" ? "Ready to wrap up" : "In the flow"}</span>
    </header>
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center justify-between gap-5 p-6 sm:flex-row">
        <div><p className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" aria-hidden />{stopped ? "Time worked" : counting ? "Time remaining" : "Your planned time is complete"}</p><p className="font-mono text-5xl font-medium tracking-tight tabular-nums" role="timer" aria-label={`${formatSessionTime(session.elapsedMs)} worked`}>{formatSessionTime(counting ? remaining : session.elapsedMs)}</p><p className="mt-1 text-xs text-muted-foreground">{stopped ? `${run.durationMinutes} minutes planned · Wrap up when you're ready.` : `${formatSessionTime(session.elapsedMs)} worked${remaining === 0 ? " · Keep going or wrap up when you're ready." : ""}`}</p></div>
        <div className="flex flex-wrap justify-center gap-3">{session.phase === "running" && <Button variant="outline" size="lg" onClick={session.pause}><Pause className="h-4 w-4" />Pause</Button>}{session.phase === "paused" && <Button size="lg" variant="outline" onClick={session.resume}><Play className="h-4 w-4" />Resume</Button>}<Button size="lg" onClick={end}><Square className="h-4 w-4" />{session.phase === "stopped" ? "Wrap up session" : "Finish & log"}</Button></div>
      </div><div role="progressbar" aria-label="Session time" aria-valuenow={Math.floor(progress)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 bg-primary/10"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
    </Card>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(240px,.8fr)]">
      <div className="min-w-0"><VisualManager starter={run.template} onChange={() => {}} readOnly /></div>
      <Card className="min-w-0 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><ListChecks className="h-5 w-5" />Your workflow</h2><span className="text-xs text-muted-foreground">{run.completedStepIds.length} / {run.template.steps.length}</span></div>
        <ol className="space-y-5">{run.template.steps.map((step, index) => {
          const done = run.completedStepIds.includes(step.id);
          return <li key={step.id} className="flex gap-3"><button type="button" aria-label={`${done ? "Uncomplete" : "Complete"} step ${index + 1}: ${step.title}`} aria-pressed={done} onClick={() => session.updateStarter({ completedStepIds: done ? run.completedStepIds.filter((id) => id !== step.id) : [...run.completedStepIds, step.id] })} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${done ? "border-primary bg-primary text-white" : "border-primary/25 bg-primary/10 text-primary hover:bg-primary/20"}`}>{done ? <Check className="h-4 w-4" /> : index + 1}</button><div className="min-w-0 flex-1"><button type="button" onClick={() => session.updateStarter({ completedStepIds: done ? run.completedStepIds.filter((id) => id !== step.id) : [...run.completedStepIds, step.id] })} className={`text-left text-sm font-semibold ${done ? "text-primary" : ""}`}>{step.title}</button><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>{step.resources?.length > 0 && <div className="mt-2"><StarterResourceLinks resources={step.resources} /></div>}</div></li>;
        })}</ol><div className="mt-6 rounded-xl bg-primary/5 p-4"><h3 className="text-sm font-semibold">Something to take away</h3><ul className="mt-2 space-y-2">{run.template.outcomes.map((outcome) => <li key={outcome} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" />{outcome}</li>)}</ul></div>
      </Card>
      <div className="min-w-0 space-y-4"><Card className="p-5"><h2 className="mb-3 text-sm font-semibold">Session notes</h2><label className="sr-only" htmlFor="starter-session-notes">Session notes</label><Textarea id="starter-session-notes" value={session.notes} onChange={(event) => session.setNotes(event.target.value)} placeholder="Ideas, happy accidents, things to revisit…" rows={6} /><p className="mt-2 text-xs text-muted-foreground">Saved in this tab as you go.</p></Card>
        {run.template.resources.length > 0 && <Card className="p-5"><h2 className="mb-3 text-sm font-semibold">Keep these close</h2><StarterResourceLinks resources={run.template.resources} /></Card>}
        {run.template.isFilmable && <Card className="border-primary/20 bg-primary/5 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><Video className="h-4 w-4" />A moment worth capturing</h2><p className="mt-2 text-sm text-muted-foreground">{run.template.videoConcepts[0] || "Record a little of your creative process."}</p><label className="mt-4 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={run.footageCaptured} onChange={(event) => session.updateStarter({ footageCaptured: event.target.checked, contentStatus: event.target.checked ? "filmed" : "not-planned" })} />I captured footage</label>{run.template.captureChecklist.length > 0 && <ul className="mt-3 space-y-2">{run.template.captureChecklist.map((item) => <li key={item} className="flex gap-2 text-xs text-muted-foreground"><Circle className="mt-0.5 h-3 w-3 shrink-0" />{item}</li>)}</ul>}</Card>}
      </div>
    </div>
  </div>;
}
