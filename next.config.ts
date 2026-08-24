import type { NextConfig } from "next";
import { REMOTE_IMAGE_PATTERNS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    // Uploaded covers live in a public Supabase bucket, so the optimizer needs
    // explicit permission to fetch them. `CoverArt` checks a URL against the
    // same list before using `next/image` — see `src/lib/image-hosts.ts`.
    remotePatterns: REMOTE_IMAGE_PATTERNS,
    // Every optimized image in this app is a cover or a thumbnail: the widest
    // slot anywhere is a ~640px large gallery tile. The defaults start at
    // 640px for viewport-relative slots, so a 190px tile was being served a
    // 640px file; the two extra small steps give the browser something that
    // actually fits. Fixed-px slots (24-96px, doubled on retina) pick from
    // `imageSizes`, hence 160 and 192.
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 192, 256, 384],
    // Upload keys are `${timestamp}-${uuid}.${ext}`, so a cover URL always
    // names one immutable object: a new cover is a new URL, never a new body
    // at the old one. Nothing here ever needs re-checking, and the default
    // TTL only buys repeated optimizer round-trips.
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  async redirects() {
    return [
      // The standalone Progress page merged into the dashboard; keep old
      // bookmarks and links working.
      {
        source: "/analytics",
        destination: "/#progress",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
