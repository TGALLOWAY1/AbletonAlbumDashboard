"use client";

import { ErrorView } from "@/components/error-view";

export default function SessionStarterError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView error={error} reset={reset} title="Could not load Session Starters" fallbackHref="/session-starters" fallbackLabel="Back to Session Starters" />;
}
