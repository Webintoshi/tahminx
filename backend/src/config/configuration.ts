import { EnvVars } from './env.schema';
import {
  parseTrustProxy,
  resolveCorsOrigins,
  resolveDatabaseUrls,
  resolveRedisConnection,
} from './connection.util';
import {
  defaultQueueMonitorEnabled,
  defaultSchedulerEnabled,
  resolveAppRole,
} from './runtime-role';

export default () => {
  const env = process.env as unknown as EnvVars;
  const role = resolveAppRole(env.APP_ROLE);
  const appEnv = env.APP_ENV || (env.NODE_ENV === 'production' ? 'production' : 'development');

  const dbUrls = resolveDatabaseUrls({
    databaseUrl: env.DATABASE_URL,
    directDatabaseUrl: env.DIRECT_DATABASE_URL,
    sslMode: env.DATABASE_SSL_MODE,
  });

  process.env.DATABASE_URL = dbUrls.databaseUrl;
  process.env.DIRECT_DATABASE_URL = dbUrls.directDatabaseUrl;

  const redis = resolveRedisConnection({
    redisUrl: env.REDIS_URL,
    redisHost: env.REDIS_HOST,
    redisPort: Number(env.REDIS_PORT),
    redisPassword: env.REDIS_PASSWORD,
  });

  return {
    app: {
      nodeEnv: env.NODE_ENV,
      appEnv,
      role,
      port: Number(env.PORT),
      apiPrefix: env.API_PREFIX,
      baseUrl: env.APP_BASE_URL,
      publicBaseUrl: env.PUBLIC_BASE_URL,
      adminBaseUrl: env.ADMIN_BASE_URL,
      trustProxy: parseTrustProxy(env.TRUST_PROXY),
      corsOrigin: env.CORS_ORIGIN,
      corsAllowlist: resolveCorsOrigins(env.CORS_ORIGIN, env.CORS_ALLOWLIST),
      corsMethods: env.CORS_METHODS,
      corsHeaders: env.CORS_HEADERS,
      responseCompression: env.RESPONSE_COMPRESSION,
    },
    db: {
      url: dbUrls.databaseUrl,
      directUrl: dbUrls.directDatabaseUrl,
      sslMode: env.DATABASE_SSL_MODE,
      usePooler: env.DATABASE_USE_POOLER,
    },
    redis: {
      url: redis.url,
      host: redis.host,
      port: redis.port,
      password: redis.password,
      tlsEnabled: redis.tlsEnabled,
      connection: {
        host: redis.host,
        port: redis.port,
        password: redis.password,
        ...(redis.tlsEnabled ? { tls: { rejectUnauthorized: false } } : {}),
      },
    },
    cache: {
      prefix: env.CACHE_PREFIX,
      ttl: {
        matches: Number(env.CACHE_TTL_MATCHES),
        standings: Number(env.CACHE_TTL_STANDINGS),
        predictions: Number(env.CACHE_TTL_PREDICTIONS),
        analytics: Number(env.CACHE_TTL_ANALYTICS),
        providerHealth: Number(env.CACHE_TTL_PROVIDER_HEALTH),
        providerRateLimit: Number(env.CACHE_TTL_PROVIDER_RATE_LIMIT),
        liveMatches: Number(env.CACHE_TTL_LIVE_MATCHES),
      },
    },
    auth: {
      provider: env.AUTH_PROVIDER,
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      loginProtection: {
        maxAttempts: Number(env.AUTH_LOGIN_MAX_ATTEMPTS),
        windowSeconds: Number(env.AUTH_LOGIN_WINDOW_SECONDS),
        blockSeconds: Number(env.AUTH_LOGIN_BLOCK_SECONDS),
      },
    },
    observability: {
      sentryDsn: env.SENTRY_DSN,
      prometheusEnabled: env.PROMETHEUS_ENABLED,
      alerting: {
        errorRateThreshold: Number(env.ALERT_ERROR_RATE_THRESHOLD),
        errorRateWindowSeconds: Number(env.ALERT_ERROR_RATE_WINDOW_SECONDS),
        cooldownSeconds: Number(env.ALERT_COOLDOWN_SECONDS),
      },
      dbSlowQueryMs: Number(env.DB_SLOW_QUERY_MS),
    },
    throttle: {
      ttl: Number(env.THROTTLE_TTL),
      limit: Number(env.THROTTLE_LIMIT),
    },
    queue: {
      schedulerEnabled:
        typeof env.QUEUE_SCHEDULER_ENABLED === 'boolean'
          ? env.QUEUE_SCHEDULER_ENABLED
          : defaultSchedulerEnabled(role),
      monitorEnabled:
        typeof env.QUEUE_MONITOR_ENABLED === 'boolean'
          ? env.QUEUE_MONITOR_ENABLED
          : defaultQueueMonitorEnabled(role),
      ingestionConcurrency: Number(env.QUEUE_INGESTION_CONCURRENCY),
      predictionConcurrency: Number(env.QUEUE_PREDICTION_CONCURRENCY),
      healthConcurrency: Number(env.QUEUE_HEALTH_CONCURRENCY),
      jobTimeoutMs: Number(env.QUEUE_JOB_TIMEOUT_MS),
      stalledIntervalMs: Number(env.QUEUE_STALLED_INTERVAL_MS),
      stuckJobMs: Number(env.QUEUE_STUCK_JOB_MS),
    },
    storage: {
      driver: env.STORAGE_DRIVER,
      bucket: env.STORAGE_BUCKET,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
      localPath: env.STORAGE_LOCAL_PATH,
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    },
    providers: {
      timeoutMs: Number(env.PROVIDER_TIMEOUT_MS),
      retryCount: Number(env.PROVIDER_RETRY_COUNT),
      retryBackoffMs: Number(env.PROVIDER_RETRY_BACKOFF_MS),
      circuitBreakerThreshold: Number(env.PROVIDER_CIRCUIT_BREAKER_THRESHOLD),
      circuitBreakerCooldownMs: Number(env.PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS),
      adaptiveBackoffMaxMs: Number(env.PROVIDER_ADAPTIVE_BACKOFF_MAX_MS),
      rawDebug: env.PROVIDER_RAW_DEBUG,
      keys: {
        footballData: env.FOOTBALL_DATA_API_KEY,
        ballDontLie: env.BALL_DONT_LIE_API_KEY,
        apiFootball: env.API_FOOTBALL_API_KEY,
        theSportsDb: env.THE_SPORTS_DB_API_KEY,
      },
    },
  };
};