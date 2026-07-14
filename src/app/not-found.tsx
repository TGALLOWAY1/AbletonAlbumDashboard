import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-sm text-muted-foreground">
        This page doesn&apos;t exist or was moved.
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/tracks">View tracks</Link>
        </Button>
      </div>
    </div>
  );
}
