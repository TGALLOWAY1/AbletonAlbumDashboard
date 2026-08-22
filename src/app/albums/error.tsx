"use client";

import { ErrorView } from "@/components/error-view";

export default function AlbumsError({
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
      fallbackHref="/tracks"
      fallbackLabel="Back to tracks"
    />
  );
}
