const SSLIP_SUFFIX = ".sslip.io";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const toRuntimeRelativeUrl = (value: string) => {
  if (!value || typeof window === "undefined" || !isAbsoluteUrl(value)) {
    return value;
  }

  try {
    const currentUrl = new URL(window.location.origin);
    const targetUrl = new URL(value);
    const sameOrigin = targetUrl.origin === currentUrl.origin;
    const samePreviewNetwork =
      currentUrl.hostname.endsWith(SSLIP_SUFFIX) && targetUrl.hostname.endsWith(SSLIP_SUFFIX);

    if (sameOrigin || samePreviewNetwork) {
      return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    }
  } catch {
    return value;
  }

  return value;
};

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
const rawLiveSseUrl = process.env.NEXT_PUBLIC_LIVE_SSE_URL ?? "";

export const env = {
  apiBaseUrl: toRuntimeRelativeUrl(rawApiBaseUrl),
  apiMode: (process.env.NEXT_PUBLIC_API_MODE ?? "mock") as "mock" | "real",
  mockFallback: (process.env.NEXT_PUBLIC_API_MOCK_FALLBACK ?? "true") === "true",
  liveSseUrl: toRuntimeRelativeUrl(rawLiveSseUrl),
  livePollingMs: Number(process.env.NEXT_PUBLIC_LIVE_POLLING_MS ?? 12_000),
  liveSlowPollingMs: Number(process.env.NEXT_PUBLIC_LIVE_SLOW_POLLING_MS ?? 30_000)
};
