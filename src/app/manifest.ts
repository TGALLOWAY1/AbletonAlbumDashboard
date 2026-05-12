import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finish Five",
    short_name: "Finish Five",
    description: "Five tracks. One focus. Finish them.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5bd9a0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
