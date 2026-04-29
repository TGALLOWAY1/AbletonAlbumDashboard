"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toggleStage } from "@/app/actions/stages";
import {
  STAGE_KEYS,
  STAGE_LABELS,
  type StageRow,
  progressFromStages,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function StagesChecklist({
  trackId,
  stages,
}: {
  trackId: string;
  stages: StageRow[];
}) {
  const [pending, start] = useTransition();

  const byKey = new Map(stages.map((s) => [s.stage_key, s]));
  const ordered = STAGE_KEYS.map(
    (k) => byKey.get(k) ?? { track_id: trackId, stage_key: k, complete: false, percent: null },
  );
  const overall = progressFromStages(ordered);

  const toggle = (key: string, current: boolean) => {
    start(async () => {
      try {
        await toggleStage(trackId, key, !current);
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Production stages
          </h3>
          <span className="text-sm text-muted-foreground">{overall}%</span>
        </div>
        <Progress value={overall} />
        <ul className="flex flex-col divide-y divide-border">
          {ordered.map((s) => (
            <li
              key={s.stage_key}
              className="flex items-center justify-between py-2.5"
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(s.stage_key, s.complete)}
                className="flex items-center gap-3 text-left disabled:opacity-50"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                    s.complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface-2",
                  )}
                >
                  {s.complete && <Check className="h-3.5 w-3.5" />}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    s.complete && "text-muted-foreground line-through",
                  )}
                >
                  {STAGE_LABELS[s.stage_key as keyof typeof STAGE_LABELS] ??
                    s.stage_key}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
