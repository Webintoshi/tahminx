import { NextResponse } from "next/server";
import { resolveApiProxyBase } from "@/lib/config/api-proxy";

const API_PREFIX = "/api/v1";
const DEFAULT_API_MODE = process.env.NODE_ENV === "production" ? "real" : "mock";
const HOP_BY_HOP_RESPONSE_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
] as const;

const isRealMode = () => (process.env.NEXT_PUBLIC_API_MODE ?? DEFAULT_API_MODE) === "real";

const buildUpstreamUrl = (requestUrl: string) => {
  const incomingUrl = new URL(requestUrl);
  const upstreamUrl = new URL(resolveApiProxyBase());
  const suffix = incomingUrl.pathname.startsWith(API_PREFIX)
    ? incomingUrl.pathname.slice(API_PREFIX.length)
    : incomingUrl.pathname;

  upstreamUrl.pathname = `${upstreamUrl.pathname.replace(/\/+$/, "")}${suffix}`;
  upstreamUrl.search = incomingUrl.search;
  upstreamUrl.hash = "";
  return upstreamUrl;
};

const buildUpstreamHeaders = (request: Request) => {
  const headers = new Headers();

  for (const headerName of ["accept", "authorization", "content-type", "cookie", "user-agent", "x-requested-with"]) {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  const requestUrl = new URL(request.url);
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));
  return headers;
};

const sanitizeUpstreamHeaders = (headers: Headers) => {
  const sanitizedHeaders = new Headers(headers);

  for (const headerName of HOP_BY_HOP_RESPONSE_HEADERS) {
    sanitizedHeaders.delete(headerName);
  }

  return sanitizedHeaders;
};

export async function proxyApiRequest(request: Request) {
  if (!isRealMode()) {
    return null;
  }

  const upstreamUrl = buildUpstreamUrl(request.url);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildUpstreamHeaders(request),
      cache: "no-store",
      redirect: "follow"
    });
    const body = await upstreamResponse.arrayBuffer();
    const responseHeaders = sanitizeUpstreamHeaders(upstreamResponse.headers);
    responseHeaders.set("x-tahminx-proxy", "frontend");

    return new NextResponse(body, {
      status: upstreamResponse.status,
      headers: responseHeaders
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: error instanceof Error ? error.message : "API proxy failed"
        }
      },
      { status: 502 }
    );
  }
}
