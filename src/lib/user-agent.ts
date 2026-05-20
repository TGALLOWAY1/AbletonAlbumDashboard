import { headers } from "next/headers";

/**
 * Server-side check for a phone-class user agent.
 * Used to route phone visitors to mobile-optimized routes.
 */
export async function isMobileUserAgent(): Promise<boolean> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  return /Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}
