import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Storage URLs for article thumbnails
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/thumbnails/**",
      },
    ],
  },
  // react-pdf bundles fontkit (WASM) — keep it external so it's not bundled
  // into the client. Server-only rendering (Phase 2 letters).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
