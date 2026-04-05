export const CACHE_TTL_SECONDS = {
  matches: 45,
  standings: 180,
  predictions: 60,
  analytics: 180,
  providerHealth: 60,
  providerRateLimit: 30,
  liveMatches: 15,
  authLoginAttempt: 900,
} as const;

export type CacheDomain = keyof typeof CACHE_TTL_SECONDS;

