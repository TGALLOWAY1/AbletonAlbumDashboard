"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionTypeRow } from "@/lib/types";

export function StartSessionButton({
  sessionTypes,
}: {
  sessionTypes: SessionTypeRow[];
}) {
  const router = useRouter();

  if (sessionTypes.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="mt-2 w-full">
          <Plus className="h-3.5 w-3.5" />
          Start a session
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {sessionTypes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => router.push(`/focus/new?type=${t.id}`)}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
