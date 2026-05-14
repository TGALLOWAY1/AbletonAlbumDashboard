"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AlbumsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <Card className="border-danger/40 bg-danger/5">
        <CardContent className="p-4 text-sm">
          <p className="font-medium text-danger">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="ghost">
          <Link href="/albums">Back to albums</Link>
        </Button>
      </div>
    </div>
  );
}
