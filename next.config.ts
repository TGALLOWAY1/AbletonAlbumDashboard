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
    // A floor, applied to every host above, which is why it is not a year.
    // Uploaded covers would happily cache forever — their keys are
    // `${timestamp}-${uuid}.${ext}`, so a URL names one immutable object and a
    // new cover is a new URL. YouTube poster frames are the opposite: stable
    // URL, replaceable bytes. A month keeps optimizer misses rare (a miss
    // means re-fetching a multi-megabyte original and re-encoding it, which
    // is the slow path this whole change exists to avoid) while bounding how
    // long a replaced poster frame can stay stale.
    minimumCacheTTL: 60 * 60 * 24 * 31,
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
