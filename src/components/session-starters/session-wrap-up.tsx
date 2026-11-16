"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock3, ListChecks, Video } from "lucide-react";
import { completeStarterSession } from "@/app/actions/sessions";
import { useFocusSession } from "@/components/focus-session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CONTENT_STATUS_LABELS, type ContentStatus } from "@/lib/session-starters";
import { formatSessionTime } from "@/lib/starter-run";
import { useToast } from "@/components/toast";

export function StarterSessionWrapUp() {
  const ctx = useFocusSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const { toast } = useToast();
  const run = ctx.starter;
  if (!run) return null;

  const save = () => {
    setError("");
    startTransition(async () => {
      try {
      const endedMs = ctx.stoppedAtMs ?? Date.now();
      const workedSeconds = Math.floor(ctx.accumulatedMs / 1000);
      const result = await completeStarterSession({
        starterRun: run,
        trackId: ctx.trackId,
        // Match the existing logger's definition of duration: time working,
        // excluding pauses. The original wall-clock start is in the snapshot.
        startedAt: new Date(endedMs - workedSeconds * 1000).toISOString(),
        endedAt: new Date(endedMs).toISOString(),
        workedSeconds,
        notesMd: [`**Session Starter:** ${run.template.name}`, ctx.notes.trim(), run.assetsCreated.trim() ? `**Assets created:** ${run.assetsCreated.trim()}` : "", run.nextAction.trim() ? `**Next action:** ${run.nextAction.trim()}` : ""].filter(Boolean).join("\n\n"),
      });
      if (result.error || !result.id) { setError(result.error ?? "Could not save this session. Try again."); return; }
      toast("Session logged. A little progress, saved.");
      ctx.reset();
      router.push("/session-starters");
      router.refresh();
      } catch {
        setError("Could not save your session. Check your connection and try again; your work is still in this tab.");
      }
    });
  };

  const leave = (path: string) => { ctx.reset(); router.push(path); router.refresh(); };

  return <div className="mx-auto max-w-2xl space-y-5 pb-8">
    <Link href="/focus/starter" className="text-sm text-muted-foreground hover:text-primary">← Back to session</Link>
    <header className="pt-2"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Make it count</p><h1 className="text-3xl font-semibold tracking-tight">A moment to wrap up.</h1><p className="mt-2 text-sm text-muted-foreground">{run.template.name}{ctx.trackName ? ` · ${ctx.trackName}` : ""}. Keep what worked and leave yourself a way back in.</p></header>
    <Card className="grid grid-cols-2 gap-4 p-5"><div><p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />Time worked</p><p className="mt-2 font-mono text-2xl tabular-nums">{formatSessionTime(ctx.accumulatedMs)}</p></div><div><p className="flex items-center gap-2 text-xs text-muted-foreground"><ListChecks className="h-4 w-4" />Steps completed</p><p className="mt-2 text-2xl font-semibold">{run.completedStepIds.length}<span className="text-base font-normal text-muted-foreground"> / {run.template.steps.length}</span></p></div></Card>
    <Card className="p-5"><h2 className="mb-3 text-sm font-semibold">The workflow you followed</h2><ul className="space-y-3">{run.template.steps.map((step) => <li key={step.id}><label className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={run.completedStepIds.includes(step.id)} onChange={(event) => ctx.updateStarter({ completedStepIds: event.target.checked ? [...run.completedStepIds, step.id] : run.completedStepIds.filter((id) => id !== step.id) })} />{step.title}</label></li>)}</ul><p className="mt-4 text-xs text-muted-foreground">You can finish a session at any point. Every useful experiment counts.</p></Card>
    <Card className="space-y-4 p-5"><div><label htmlFor="starter-wrap-notes" className="mb-2 block text-sm font-semibold">Session notes</label><Textarea id="starter-wrap-notes" value={ctx.notes} maxLength={5000} onChange={(event) => ctx.setNotes(event.target.value)} rows={3} placeholder="What did you discover?" /></div><div><label htmlFor="starter-wrap-assets" className="mb-2 block text-sm font-semibold">Assets created or saved</label><Textarea id="starter-wrap-assets" value={run.assetsCreated} maxLength={4000} onChange={(event) => ctx.updateStarter({ assetsCreated: event.target.value })} rows={2} placeholder="A drum rack, three vocal hooks, a preset…" /></div><div><label htmlFor="starter-next-action" className="mb-2 block text-sm font-semibold">One next action <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="starter-next-action" value={run.nextAction} maxLength={1000} onChange={(event) => ctx.updateStarter({ nextAction: event.target.value })} placeholder="When I come back, I’ll…" /></div></Card>
    <Card className="space-y-4 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Video className="h-4 w-4 text-primary" />Content from this session</h2><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={run.footageCaptured} onChange={(event) => ctx.updateStarter({ footageCaptured: event.target.checked, contentStatus: event.target.checked && ["not-planned", "idea-saved", "ready-to-film"].includes(run.contentStatus) ? "filmed" : run.contentStatus })} />I captured footage</label><div><label htmlFor="starter-content-status" className="mb-2 block text-sm text-muted-foreground">Content status</label><select id="starter-content-status" value={run.contentStatus} onChange={(event) => ctx.updateStarter({ contentStatus: event.target.value as ContentStatus })} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm">{Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><p className="text-xs text-muted-foreground">This describes what you made today. Your starter’s Filmable setting stays separate.</p></Card>
    {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    <Button size="lg" onClick={save} disabled={pending} className="w-full"><Check className="h-4 w-4" />{pending ? "Saving session…" : "Save Session"}</Button>
    <button type="button" disabled={pending} onClick={() => { if (window.confirm("Discard this session without saving? Your tracked time and notes will be lost.")) leave("/session-starters"); }} className="mx-auto block text-xs text-muted-foreground hover:text-danger">Discard session</button>
  </div>;
}
