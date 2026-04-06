import type { NextConfig } from "next";
import { resolveApiProxyBase, resolveDocsProxyBase } from "./lib/config/api-proxy";

const docsProxyBase = resolveDocsProxyBase(resolveApiProxyBase());

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/docs",
        destination: docsProxyBase,
      },
    ];
  },
};

export default nextConfig;
