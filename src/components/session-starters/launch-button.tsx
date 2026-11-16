"use client";

import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusSession } from "@/components/focus-session-provider";
import { useToast } from "@/components/toast";
import { createStarterRun, focusSessionPath } from "@/lib/starter-run";
import type { SessionStarter, StarterDuration } from "@/lib/session-starters";

export function StarterLaunchButton({ starter, duration, trackId = null, trackName = null, disabled, className }: {
  starter: SessionStarter;
  duration?: StarterDuration;
  trackId?: string | null;
  trackName?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const session = useFocusSession();
  const router = useRouter();
  const { toast } = useToast();

  const launch = () => {
    if (session.phase !== "idle") {
      toast(session.phase === "stopped" ? "Save or discard your previous session before starting another." : "Your current session is still open. Finish it before starting another.");
      router.push(focusSessionPath(session));
      return;
    }
    if (starter.archived) return;
    session.start({
      trackId,
      trackName,
      starter: createStarterRun(starter, duration ?? starter.defaultDuration),
      goal: starter.outcomes[0] ?? starter.description,
      initialTodos: starter.steps.map((step) => ({ id: step.id, description: step.title, done: false })),
    });
    router.push("/focus/starter");
  };

  return <Button type="button" onClick={launch} disabled={disabled || starter.archived || !session.isHydrated} className={className}>
    <Play className="h-4 w-4" aria-hidden /> Start Session
  </Button>;
}
