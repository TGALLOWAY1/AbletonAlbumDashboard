"use client";

import { ErrorView } from "@/components/error-view";

export default function ResourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      error={error}
      reset={reset}
      fallbackHref="/"
      fallbackLabel="Back to dashboard"
      title="Couldn't load resources"
    />
  );
}
