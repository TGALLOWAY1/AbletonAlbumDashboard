import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
