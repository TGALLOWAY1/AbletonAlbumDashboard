import { z } from "zod";
import { starterSchema, type SessionStarter, type StarterDuration, type ContentStatus } from "@/lib/session-starters";

export type StarterRun = {
  runId: string;
  template: SessionStarter;
  durationMinutes: StarterDuration;
  completedStepIds: string[];
  assetsCreated: string;
  footageCaptured: boolean;
  contentStatus: ContentStatus;
  nextAction: string;
  startedAt: string;
};

export const starterRunSchema = z.object({
  runId: z.string().uuid(),
  template: starterSchema,
  durationMinutes: z.union([z.literal(20), z.literal(40), z.literal(60)]),
  completedStepIds: z.array(z.string().max(100)).max(30),
  assetsCreated: z.string().max(4000),
  footageCaptured: z.boolean(),
  contentStatus: z.enum(["not-planned", "idea-saved", "ready-to-film", "filmed", "edited", "published"]),
  nextAction: z.string().max(1000),
  startedAt: z.iso.datetime(),
}).superRefine((run, context) => {
  const stepIds = new Set(run.template.steps.map((step) => step.id));
  if (run.completedStepIds.some((id) => !stepIds.has(id)) || new Set(run.completedStepIds).size !== run.completedStepIds.length) {
    context.addIssue({ code: "custom", path: ["completedStepIds"], message: "Completed steps must belong to this session's workflow." });
  }
});

/** A copy, rather than a reference to the live template: editing a starter must
 * never change the instructions halfway through a run or its historical log. */
export function createStarterRun(template: SessionStarter, durationMinutes: StarterDuration): StarterRun {
  return {
    runId: crypto.randomUUID(),
    template: structuredClone(template),
    durationMinutes,
    completedStepIds: [],
    assetsCreated: "",
    footageCaptured: false,
    contentStatus: "not-planned",
    nextAction: "",
    startedAt: new Date().toISOString(),
  };
}

export function focusSessionPath(session: { starter: StarterRun | null; trackId: string | null; phase: string }): string {
  if (session.phase === "stopped") return "/focus/log";
  return session.starter ? "/focus/starter" : session.trackId ? `/focus/${session.trackId}` : "/focus/new";
}

export function formatSessionTime(totalMs: number): string {
  const seconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function stepTimeBudget(duration: StarterDuration, index: number, count: number): number {
  if (count <= 0 || index < 0 || index >= count) return 0;
  return Math.floor(duration / count) + (index < duration % count ? 1 : 0);
}
