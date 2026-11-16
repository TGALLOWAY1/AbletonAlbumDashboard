"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Save, Trash2 } from "lucide-react";
import { saveSessionStarter } from "@/app/actions/session-starters";
import type { SessionStarter, StarterCategory, StarterDuration, StarterResource, StarterStep } from "@/lib/session-starters";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES: [StarterCategory, string][] = [["music-production", "Music Production"], ["sound-design", "Sound Design"], ["performance", "Performance"], ["content", "Content"]];
const selectClass = "h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm";
const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

function blankStarter(): SessionStarter {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), name: "", description: "", category: "music-production", defaultDuration: 40,
    steps: [{ id: crypto.randomUUID(), title: "", description: "", resources: [] }],
    outcomes: [], isFilmable: false, videoConcepts: [], filmingInstructions: "", captureChecklist: [], resources: [], videos: [], media: [], featuredMediaId: null, isFavorite: false, archived: false, visualStyle: "preset", createdAt: now, updatedAt: now,
  };
}

export function StarterEditor({ starter, open, onOpenChange, onSaved, disabled = false }: {
  starter?: SessionStarter; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (starter: SessionStarter) => void; disabled?: boolean;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl p-0 sm:p-0">
      <DialogHeader className="border-b border-border px-5 py-5 sm:px-7">
        <DialogTitle>{starter ? "Edit Session Starter" : "Create a Session Starter"}</DialogTitle>
        <DialogDescription>A clear outcome and a few good steps are all you need.</DialogDescription>
      </DialogHeader>
      {open && <EditorForm starter={starter} disabled={disabled} onSaved={(saved) => { onSaved(saved); onOpenChange(false); }} onCancel={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function EditorForm({ starter, onSaved, onCancel, disabled }: {
  starter?: SessionStarter; onSaved: (starter: SessionStarter) => void; onCancel: () => void; disabled: boolean;
}) {
  const [draft, setDraft] = useState(() => starter ? structuredClone(starter) : blankStarter());
  const [outcomes, setOutcomes] = useState(draft.outcomes.join("\n"));
  const [concepts, setConcepts] = useState(draft.videoConcepts.join("\n"));
  const [checklist, setChecklist] = useState(draft.captureChecklist.join("\n"));
  // The filming section opens on a filmable starter, then belongs to the
  // user: tying `open` to the checkbox inside it collapsed the section the
  // moment that box was unticked.
  const [filmingOpen, setFilmingOpen] = useState(draft.isFilmable);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const patch = (value: Partial<SessionStarter>) => setDraft((prev) => ({ ...prev, ...value }));
  const patchStep = (index: number, value: Partial<StarterStep>) => patch({ steps: draft.steps.map((step, i) => i === index ? { ...step, ...value } : step) });
  const moveStep = (index: number, delta: number) => {
    const next = [...draft.steps];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    patch({ steps: next });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (disabled) return;
    startTransition(async () => {
      try {
        const result = await saveSessionStarter({ ...draft, outcomes: lines(outcomes), videoConcepts: lines(concepts), captureChecklist: lines(checklist), updatedAt: new Date().toISOString() });
        if (result.error || !result.starter) setError(result.error ?? "Your starter could not be saved. Try again.");
        else onSaved(result.starter);
      } catch {
        setError("Your starter could not be saved. Check your connection and try again.");
      }
    });
  };

  return <form onSubmit={submit} className="space-y-6 px-5 pb-5 sm:px-7 sm:pb-7">
    <fieldset disabled={pending || disabled} className="space-y-5 disabled:opacity-70">
      <label className="block space-y-2 text-sm font-medium">Session name
        <Input autoFocus required maxLength={120} placeholder="e.g. One synth, five sounds" value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
      </label>
      <label className="block space-y-2 text-sm font-medium">Purpose
        <Textarea required rows={2} maxLength={2000} placeholder="What will you make, learn, or practice?" value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-2 text-sm font-medium">Category
          <select className={selectClass} value={draft.category} onChange={(event) => patch({ category: event.target.value as StarterCategory })}>{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        </label>
        <label className="space-y-2 text-sm font-medium">Default duration
          <select className={selectClass} value={draft.defaultDuration} onChange={(event) => patch({ defaultDuration: Number(event.target.value) as StarterDuration })}>{[20, 40, 60].map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}</select>
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">The workflow</h3><span className="text-xs text-muted-foreground">Keep it focused.</span></div>
        {draft.steps.map((step, index) => <div key={step.id} className="space-y-3 rounded-xl border border-border bg-surface-2/35 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">{index + 1}</span>
            <Input required maxLength={120} aria-label={`Step ${index + 1} title`} placeholder="Step title" value={step.title} onChange={(event) => patchStep(index, { title: event.target.value })} />
            <Button type="button" variant="ghost" size="icon" disabled={index === 0} aria-label={`Move step ${index + 1} up`} onClick={() => moveStep(index, -1)}><ArrowUp className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={index === draft.steps.length - 1} aria-label={`Move step ${index + 1} down`} onClick={() => moveStep(index, 1)}><ArrowDown className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon" disabled={draft.steps.length <= 1} aria-label={`Remove step ${index + 1}`} onClick={() => patch({ steps: draft.steps.filter((_, i) => i !== index) })}><Trash2 className="size-4" /></Button>
          </div>
          <Textarea rows={2} aria-label={`Step ${index + 1} description`} maxLength={3000} placeholder="A little guidance, a useful constraint, or a place to start…" value={step.description} onChange={(event) => patchStep(index, { description: event.target.value })} />
          <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Step resources{step.resources.length > 0 ? ` (${step.resources.length})` : ""}</summary><div className="pt-3"><ResourceFields resources={step.resources} onChange={(resources) => patchStep(index, { resources })} label={`step ${index + 1}`} /></div></details>
        </div>)}
        <Button type="button" variant="outline" size="sm" disabled={draft.steps.length >= 12} onClick={() => patch({ steps: [...draft.steps, { id: crypto.randomUUID(), title: "", description: "", resources: [] }] })}><Plus className="size-4" />Add step</Button>
      </section>

      <label className="block space-y-2 text-sm font-medium">Expected creative outcomes
        <Textarea rows={3} required maxLength={5000} placeholder={"One reusable drum rack\nThree variations saved to your library"} value={outcomes} onChange={(event) => setOutcomes(event.target.value)} />
        <span className="block text-xs font-normal text-muted-foreground">One outcome per line.</span>
      </label>

      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">Templates, presets &amp; linked resources</summary><div className="pt-4"><ResourceFields resources={draft.resources} onChange={(resources) => patch({ resources })} label="session" /><p className="mt-2 text-xs text-muted-foreground">Use a web link, an app path such as /resources, or a local project path you can copy.</p></div></details>

      <details open={filmingOpen} onToggle={(event) => setFilmingOpen(event.currentTarget.open)} className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">Content creation &amp; filming</summary><div className="space-y-4 pt-4">
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={draft.isFilmable} onChange={(event) => patch({ isFilmable: event.target.checked })} />This session is suitable for filming</label>
        <label className="block space-y-2 text-sm">Suggested video concepts<Textarea rows={2} maxLength={5000} value={concepts} onChange={(event) => setConcepts(event.target.value)} placeholder="Raw vocal to processed hook — one idea per line" /></label>
        <label className="block space-y-2 text-sm">Filming instructions<Textarea rows={2} maxLength={5000} value={draft.filmingInstructions} onChange={(event) => patch({ filmingInstructions: event.target.value })} placeholder="Capture the starting point and the final result." /></label>
        <label className="block space-y-2 text-sm">Capture checklist<Textarea rows={2} maxLength={5000} value={checklist} onChange={(event) => setChecklist(event.target.value)} placeholder={"Record the dry sound\nCapture the final performance"} /><span className="block text-xs text-muted-foreground">One item per line. Filming outcomes are tracked separately for each session run.</span></label>
      </div></details>
    </fieldset>
    {error && <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface pt-4">
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button>
      <Button type="submit" disabled={pending || disabled}><Save className="size-4" />{pending ? "Saving…" : "Save Starter"}</Button>
    </div>
  </form>;
}

function ResourceFields({ resources, onChange, label }: { resources: StarterResource[]; onChange: (resources: StarterResource[]) => void; label: string }) {
  return <div className="space-y-2">
    {resources.map((resource, index) => <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-2" key={resource.id}>
      <Input required className="min-w-0 flex-1" maxLength={160} aria-label={`${label} resource ${index + 1} title`} placeholder="Resource name" value={resource.title} onChange={(event) => onChange(resources.map((item) => item.id === resource.id ? { ...item, title: event.target.value } : item))} />
      <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${label} resource ${index + 1}`} onClick={() => onChange(resources.filter((item) => item.id !== resource.id))}><Trash2 className="size-4" /></Button>
      <Input required className="basis-full" maxLength={2000} aria-label={`${label} resource ${index + 1} URL or path`} placeholder="https://… or /path/to/project.als" value={resource.url} onChange={(event) => onChange(resources.map((item) => item.id === resource.id ? { ...item, url: event.target.value } : item))} />
    </div>)}
    <Button type="button" size="sm" variant="ghost" disabled={resources.length >= 20} onClick={() => onChange([...resources, { id: crypto.randomUUID(), title: "", url: "" }])}><Link2 className="size-4" />Link a resource</Button>
  </div>;
}
