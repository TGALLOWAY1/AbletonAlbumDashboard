"use client";

import { useState, useTransition } from "react";
import { Zap, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  setActiveBottleneck,
  resolveActiveBottleneck,
} from "@/app/actions/bottlenecks";
import { useToast } from "@/components/toast";
import {
  BOTTLENECK_CATEGORIES,
  BOTTLENECK_LABELS,
  type BottleneckRow,
} from "@/lib/types";

export function BottleneckEditor({
  trackId,
  bottleneck,
}: {
  trackId: string;
  bottleneck: BottleneckRow | null;
}) {
  const [editing, setEditing] = useState(!bottleneck);
  const [description, setDescription] = useState(bottleneck?.description ?? "");
  const [category, setCategory] = useState<string>(
    bottleneck?.category ?? "arrangement",
  );
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const submit = () => {
    if (!description.trim()) return;
    start(async () => {
      try {
        await setActiveBottleneck({
          trackId,
          description: description.trim(),
          category,
        });
        setEditing(false);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  const resolve = () => {
    start(async () => {
      try {
        await resolveActiveBottleneck(trackId);
        setDescription("");
        setEditing(true);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <Card className="border-warning/30">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bottleneck
            </h3>
          </div>
          {bottleneck && !editing && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                aria-label="Edit bottleneck"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resolve}
                disabled={pending}
                aria-label="Resolve bottleneck"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {!editing && bottleneck ? (
          <>
            <p className="text-base text-foreground">{bottleneck.description}</p>
            <Badge variant="warning" className="self-start">
              {BOTTLENECK_LABELS[
                bottleneck.category as keyof typeof BOTTLENECK_LABELS
              ] ?? bottleneck.category}
            </Badge>
          </>
        ) : (
          <>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's blocking this track right now?"
              rows={3}
            />
            <div className="flex flex-wrap gap-1.5">
              {BOTTLENECK_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="text-xs"
                >
                  <Badge
                    variant={category === c ? "warning" : "default"}
                    className="cursor-pointer"
                  >
                    {BOTTLENECK_LABELS[c]}
                  </Badge>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              {bottleneck && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setDescription(bottleneck.description);
                    setCategory(bottleneck.category);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={submit}
                disabled={pending || !description.trim()}
              >
                {bottleneck ? "Update bottleneck" : "Set bottleneck"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
