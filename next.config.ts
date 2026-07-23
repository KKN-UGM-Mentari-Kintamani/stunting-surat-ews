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
};

export default nextConfig;
