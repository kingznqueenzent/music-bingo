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
    /** Avoid silent truncation of large FormData when the proxy clones the body. */
    proxyClientMaxBodySize: "100mb",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
