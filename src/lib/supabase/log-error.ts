/**
 * Server-side logging for a failed Supabase call.
 *
 * Matters most for actions that *return* their failure rather than throwing it
 * (see `setTrackSunoStatus`): a thrown error at least reaches Next's error
 * handler and the server log, but a returned one is just a value, so without
 * this the real `code`/`details`/`hint` never get recorded anywhere.
 *
 * A Supabase `PostgrestError` is a plain object, not an `Error` instance, so
 * its fields are pulled out by hand.
 */
export function logSupabaseError(label: string, err: unknown) {
  const e = err as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };
  console.error(label, {
    code: e?.code,
    message: e?.message ?? (err instanceof Error ? err.message : String(err)),
    details: e?.details,
    hint: e?.hint,
  });
}
