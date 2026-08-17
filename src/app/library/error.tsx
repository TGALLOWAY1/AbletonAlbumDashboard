"use client";

import { ErrorView } from "@/components/error-view";

export default function LibraryError({
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
      title="Couldn't load your library"
      fallbackHref="/"
      fallbackLabel="Back to Home"
    />
  );
}
