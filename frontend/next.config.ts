import type { NextConfig } from "next";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  // Browser calls same-origin /api/* ; Next proxies to FastAPI.
  // This avoids localhost ↔ 127.0.0.1 CORS / Private Network Access "Failed to fetch".
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
