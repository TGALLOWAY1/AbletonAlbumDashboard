"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { toggleTrackFocus } from "@/app/actions/tracks";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

function useToggleFocus(trackId: string) {
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const run = () => {
    start(async () => {
      try {
        await toggleTrackFocus(trackId);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };
  return { pending, run };
}

export function MarkFocusButton({
  trackId,
  isFocus,
  variant = "icon",
}: {
  trackId: string;
  isFocus: boolean;
  variant?: "icon" | "menu";
}) {
  const { pending, run } = useToggleFocus(trackId);

  if (variant === "menu") {
    return (
      <DropdownMenuItem
        disabled={pending}
        onSelect={(e) => {
          e.preventDefault();
          run();
        }}
      >
        {isFocus ? "Unmark focus" : "Mark as focus"}
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      aria-label={isFocus ? "Unmark as focus" : "Mark as focus"}
      aria-pressed={isFocus}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-2 disabled:opacity-50",
        isFocus ? "text-warning" : "text-muted-foreground",
      )}
    >
      <Star className={cn("h-4 w-4", isFocus && "fill-current")} />
    </button>
  );
}
