/**
 * Which remote images Next's optimizer is allowed to touch.
 *
 * One list, two consumers: `next.config.ts` turns it into
 * `images.remotePatterns`, and `CoverArt` checks a URL against it before
 * handing anything to `next/image`. The two have to agree — `next/image`
 * throws at render time on a host that isn't configured, and one stray URL in
 * a `cover_image_url` column should degrade to an unoptimized `<img>`, not
 * take down every page that track appears on.
 */

export type RemoteImagePattern = {
  protocol: "https";
  hostname: string;
  pathname: string;
};

/**
 * The project's own Supabase storage host, derived from the public URL rather
 * than hard-coded, so the optimizer is scoped to exactly this project instead
 * of every `*.supabase.co`. A build without the env var simply yields no
 * pattern: covers still render, just unoptimized.
 */
export function storagePatternFor(
  supabaseUrl: string | undefined,
): RemoteImagePattern | null {
  if (!supabaseUrl) return null;
  let hostname: string;
  try {
    ({ hostname } = new URL(supabaseUrl));
  } catch {
    return null;
  }
  if (!hostname) return null;
  return {
    protocol: "https",
    hostname,
    // Public buckets only. Signed and authenticated object URLs carry
    // short-lived credentials in the path or query, so they must never be
    // proxied — and cached — by the optimizer.
    pathname: "/storage/v1/object/public/**",
  };
}

export const REMOTE_IMAGE_PATTERNS: RemoteImagePattern[] = [
  storagePatternFor(process.env.NEXT_PUBLIC_SUPABASE_URL),
  // Poster frames derived for URL resources — see `src/lib/youtube.ts`.
  { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
  { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
].filter((pattern): pattern is RemoteImagePattern => pattern !== null);

/**
 * The subset of Next's `remotePatterns` glob syntax this app actually uses:
 * `*` matches within one path segment, `**` matches across segments.
 */
function pathnameMatches(pathname: string, pattern: string): boolean {
  const source = pattern
    .split("**")
    .map((part) =>
      part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"),
    )
    .join(".*");
  return new RegExp(`^${source}$`).test(pathname);
}

export function matchesPattern(
  src: string,
  pattern: RemoteImagePattern,
): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    // Relative paths (`/og.png`) are same-origin and always optimizable, but
    // they are not what this function is for — callers handle those directly.
    return false;
  }
  if (url.protocol !== `${pattern.protocol}:`) return false;
  if (url.hostname !== pattern.hostname) return false;
  return pathnameMatches(url.pathname, pattern.pathname);
}

/** True when `next/image` can be pointed at `src` without throwing. */
export function isOptimizableImageUrl(src: string | null | undefined): boolean {
  if (!src) return false;
  // Same-origin assets under `public/` need no configuration at all.
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  return REMOTE_IMAGE_PATTERNS.some((pattern) => matchesPattern(src, pattern));
}
