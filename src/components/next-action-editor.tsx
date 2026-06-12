"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Target, Pencil, Check, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  setPrimaryAction,
  completeAction,
} from "@/app/actions/actions";
import { useToast } from "@/components/toast";
import type { ActionRow } from "@/lib/types";

export function NextActionEditor({
  trackId,
  action,
}: {
  trackId: string;
  action: ActionRow | null;
}) {
  const [editing, setEditing] = useState(!action);
  const [description, setDescription] = useState(action?.description ?? "");
  const [category, setCategory] = useState(action?.category ?? "");
  const [estimate, setEstimate] = useState<string>(
    action?.estimated_minutes ? String(action.estimated_minutes) : "",
  );
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const submit = () => {
    if (!description.trim()) return;
    start(async () => {
      try {
        await setPrimaryAction({
          trackId,
          description: description.trim(),
          category: category || undefined,
          estimatedMinutes: estimate ? parseInt(estimate, 10) : null,
        });
        setEditing(false);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const markDone = () => {
    if (!action) return;
    start(async () => {
      try {
        await completeAction(action.id, trackId);
        setDescription("");
        setCategory("");
        setEstimate("");
        setEditing(true);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Next action
            </h3>
          </div>
          {action && !editing && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                aria-label="Edit next action"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={markDone}
                disabled={pending}
                aria-label="Mark complete"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {!editing && action ? (
          <>
            <p className="text-base text-foreground">{action.description}</p>
            <div className="flex flex-wrap items-center gap-2">
              {action.category && (
                <Badge variant="primary">{action.category}</Badge>
              )}
              {action.estimated_minutes != null && (
                <Badge variant="default">
                  ~{action.estimated_minutes} min
                </Badge>
              )}
            </div>
            <Button asChild className="self-start">
              <Link href={`/focus/${trackId}`}>
                <Play className="h-4 w-4" />
                Start this task
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One clear next step…"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (optional)"
              />
              <Input
                value={estimate}
                onChange={(e) =>
                  setEstimate(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="Estimate (min)"
                inputMode="numeric"
              />
            </div>
            <div className="flex justify-end gap-2">
              {action && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setDescription(action.description);
                    setCategory(action.category ?? "");
                    setEstimate(
                      action.estimated_minutes
                        ? String(action.estimated_minutes)
                        : "",
                    );
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={submit}
                disabled={pending || !description.trim()}
              >
                {action ? "Update action" : "Set next action"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
