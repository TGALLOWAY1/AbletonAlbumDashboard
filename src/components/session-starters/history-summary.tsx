import Link from "next/link";
import { Check, Video } from "lucide-react";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { CONTENT_STATUS_LABELS, type ContentStatus } from "@/lib/session-starters";

// Read the historical shape independently of today's editable template schema.
const snapshotSchema = z.object({ id: z.string().uuid(), name: z.string(), steps: z.array(z.object({ id: z.string(), title: z.string() })) });
const outputSchema = z.object({ completedStepIds: z.array(z.string()), footageCaptured: z.boolean(), assetsCreated: z.string(), contentStatus: z.string(), nextAction: z.string() });

export function StarterHistorySummary({ snapshot, output }: { snapshot?: Json | null; output?: Json | null }) {
  const template = snapshotSchema.safeParse(snapshot);
  const result = outputSchema.safeParse(output);
  if (!template.success || !result.success) return null;
  const run = result.data;
  const steps = template.data.steps;
  const completed = steps.filter((step) => run.completedStepIds.includes(step.id));
  return <details className="mt-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
    <summary className="cursor-pointer font-medium text-primary">{template.data.name} · {completed.length}/{steps.length} steps{run.footageCaptured ? " · Footage captured" : ""}</summary>
    <div className="mt-3 space-y-3">
      <ol className="space-y-2">{steps.map((step, index) => <li key={step.id} className="flex items-start gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] text-primary">{run.completedStepIds.includes(step.id) ? <Check className="h-3 w-3" /> : index + 1}</span>{step.title}</li>)}</ol>
      {run.assetsCreated && <p className="whitespace-pre-wrap break-words"><strong>Assets saved:</strong> {run.assetsCreated}</p>}
      <p className="flex items-center gap-1.5 text-muted-foreground"><Video className="h-3 w-3" />{run.footageCaptured ? "Footage captured" : "No footage captured"} · {CONTENT_STATUS_LABELS[run.contentStatus as ContentStatus] ?? "Not Planned"}</p>
      {run.nextAction && <p className="whitespace-pre-wrap break-words"><strong>Next action:</strong> {run.nextAction}</p>}
      <Link href={`/session-starters/${template.data.id}`} className="inline-block font-medium text-primary hover:underline">Open this starter →</Link>
    </div>
  </details>;
}
