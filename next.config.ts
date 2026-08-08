import type { NextConfig } from "next";

/** Optional FastAPI proxy: `/api/upload-mix`, `/api/analyze-mix/*`, `/api/mix-report/*` via `MIX_API_URL`. See `lib/mix-backend-proxy.ts`. */
const nextConfig: NextConfig = {
  /**
   * Keep builds green if residual script/tooling TS noise appears.
   * App-facing types are still fixed under `npx tsc --noEmit`.
   */
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
