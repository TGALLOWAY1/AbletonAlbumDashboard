"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setTrackStatus } from "@/app/actions/tracks";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/toast";

export function TrackCardActions({
  trackId,
  status,
}: {
  trackId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const run = (next: string) => {
    start(async () => {
      try {
        await setTrackStatus(trackId, next);
      } catch (e) {
        toast((e as Error).message);
      }
    });
  };

  return (
    <>
      {/* Album lives in the metadata editor — link there instead of
          duplicating the album select in the dropdown. */}
      <DropdownMenuItem asChild>
        <Link href={`/tracks/${trackId}/edit`}>Change album…</Link>
      </DropdownMenuItem>
      {status !== "completed" && (
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            run("completed");
          }}
        >
          Mark complete
        </DropdownMenuItem>
      )}
      {status !== "backlog" && (
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            run("backlog");
          }}
        >
          Move to backlog
        </DropdownMenuItem>
      )}
      {status !== "active" && (
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            run("active");
          }}
        >
          Activate
        </DropdownMenuItem>
      )}
      {status !== "archived" && (
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            run("archived");
          }}
        >
          Archive
        </DropdownMenuItem>
      )}
    </>
  );
}
