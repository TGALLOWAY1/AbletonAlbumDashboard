import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server-side client. Prefers the service_role key so table access keeps working
// once RLS is enabled on the user tables (service_role bypasses RLS). Falls back
// to the anon key when the secret isn't set — e.g. before it has been added to the
// deploy environment — so nothing breaks during the transition. Storage uploads
// still go through the browser's anon client against public buckets (see 0003).
//
// The env check happens lazily inside this function (not at module scope) so a
// missing env var surfaces as a request-time error that the route's error
// boundary can catch, instead of a module-load crash that takes down the app
// before any boundary exists.
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Server-only secret. Bypasses Row Level Security. Must never reach the
  // browser, so it is intentionally not prefixed with NEXT_PUBLIC_.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.",
    );
  }

  return createClient<Database>(url, serviceRoleKey ?? anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
