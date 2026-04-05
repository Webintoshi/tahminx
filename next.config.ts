import type { NextConfig } from "next";

const DEFAULT_LOCAL_API_BASE = "http://localhost:3002/api/v1";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const isAbsoluteUrl = (value?: string | null): value is string => Boolean(value && /^https?:\/\//i.test(value));

const resolveApiProxyBase = () => {
  const configuredTarget =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!isAbsoluteUrl(configuredTarget)) {
    return DEFAULT_LOCAL_API_BASE;
  }

  return normalizeBaseUrl(configuredTarget);
};

const resolveDocsProxyBase = (apiProxyBase: string) => {
  const configuredDocsTarget = process.env.INTERNAL_API_DOCS_URL;

  if (isAbsoluteUrl(configuredDocsTarget)) {
    return normalizeBaseUrl(configuredDocsTarget);
  }

  const apiUrl = new URL(apiProxyBase);
  apiUrl.pathname = apiUrl.pathname.endsWith("/api/v1")
    ? `${apiUrl.pathname.slice(0, -"/api/v1".length)}/api/docs`
    : `${apiUrl.pathname.replace(/\/+$/, "")}/api/docs`;
  apiUrl.search = "";
  apiUrl.hash = "";
  return apiUrl.toString();
};

const apiProxyBase = resolveApiProxyBase();
const docsProxyBase = resolveDocsProxyBase(apiProxyBase);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyBase}/:path*`,
      },
      {
        source: "/api/docs",
        destination: docsProxyBase,
      },
    ];
  },
};

export default nextConfig;
