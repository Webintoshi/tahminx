export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  apiMode: (process.env.NEXT_PUBLIC_API_MODE ?? "mock") as "mock" | "real",
  mockFallback: (process.env.NEXT_PUBLIC_API_MOCK_FALLBACK ?? "true") === "true",
  liveSseUrl: process.env.NEXT_PUBLIC_LIVE_SSE_URL ?? "",
  livePollingMs: Number(process.env.NEXT_PUBLIC_LIVE_POLLING_MS ?? 12_000),
  liveSlowPollingMs: Number(process.env.NEXT_PUBLIC_LIVE_SLOW_POLLING_MS ?? 30_000)
};

