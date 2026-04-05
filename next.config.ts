import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:3002/api/v1/:path*",
      },
      {
        source: "/api/docs",
        destination: "http://localhost:3002/api/docs",
      },
    ];
  },
};

export default nextConfig;
