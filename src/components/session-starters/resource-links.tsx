"use client";

import Link from "next/link";
import { Copy, ExternalLink, FolderOpen } from "lucide-react";
import { useToast } from "@/components/toast";
import type { StarterResource } from "@/lib/session-starters";

export function StarterResourceLinks({ resources }: { resources: StarterResource[] }) {
  const { toast } = useToast();
  return <ul className="flex flex-col gap-2">{resources.map((resource) => {
    const localPath = resource.url.startsWith("/") && !resource.url.startsWith("/resources") && !resource.url.startsWith("/library") && !resource.url.startsWith("/templates");
    return <li key={resource.id} className="min-w-0">
      {localPath ? <button type="button" className="flex max-w-full items-center gap-2 text-left text-sm text-primary hover:underline" title={resource.url} onClick={async () => {
        try { await navigator.clipboard.writeText(resource.url); toast("Project path copied. Open it in your music app."); }
        catch { toast(`Project location: ${resource.url}`); }
      }}><FolderOpen className="h-4 w-4 shrink-0" aria-hidden /><span className="break-words">{resource.title}</span><Copy className="h-3 w-3 shrink-0" aria-hidden /></button> : <Link href={resource.url} target={resource.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="break-words">{resource.title}</span></Link>}
    </li>;
  })}</ul>;
}
