"use client";

import { useEffect, useState } from "react";
import { Check, FolderOpen } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyPathButton({
  path,
  children = "Open in Finder",
  ...rest
}: { path: string; children?: React.ReactNode } & Omit<ButtonProps, "onClick">) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(path);
          setCopied(true);
        } catch {
          window.prompt("Copy this path:", path);
        }
      }}
      {...rest}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied — paste into Finder (Cmd+Shift+G)
        </>
      ) : (
        <>
          <FolderOpen className="h-4 w-4" />
          {children}
        </>
      )}
    </Button>
  );
}
