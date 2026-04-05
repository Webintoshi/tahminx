import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
    APP_ROLE: z.enum(['api', 'worker', 'scheduler', 'all']).default('all'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    API_PREFIX: z.string().default('api/v1'),
    APP_BASE_URL: z.string().url().optional(),
    PUBLIC_BASE_URL: z.string().url().optional(),
    ADMIN_BASE_URL: z.string().url().optional(),
    TRUST_PROXY: z.string().default('false'),

    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().optional(),
    DATABASE_SSL_MODE: z.enum(['disable', 'prefer', 'require']).default('prefer'),
    DATABASE_USE_POOLER: z.coerce.boolean().default(true),

    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().int().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    AUTH_PROVIDER: z.enum(['jwt', 'supabase-adapter']).default('jwt'),

    CORS_ORIGIN: z.string().default('*'),
    CORS_ALLOWLIST: z.string().optional(),
    CORS_METHODS: z.string().default('GET,POST,PATCH,PUT,DELETE,OPTIONS'),
    CORS_HEADERS: z.string().default('Content-Type,Authorization,X-Correlation-Id'),

    CACHE_PREFIX: z.string().default('tahminx'),
    CACHE_TTL_MATCHES: z.coerce.number().int().default(45),
    CACHE_TTL_STANDINGS: z.coerce.number().int().default(180),
    CACHE_TTL_PREDICTIONS: z.coerce.number().int().default(60),
    CACHE_TTL_ANALYTICS: z.coerce.number().int().default(180),
    CACHE_TTL_PROVIDER_HEALTH: z.coerce.number().int().default(60),
    CACHE_TTL_PROVIDER_RATE_LIMIT: z.coerce.number().int().default(30),
    CACHE_TTL_LIVE_MATCHES: z.coerce.number().int().default(15),

    RESPONSE_COMPRESSION: z.coerce.boolean().default(true),
    SENTRY_DSN: z.string().optional(),
    PROMETHEUS_ENABLED: z.coerce.boolean().default(true),
    DB_SLOW_QUERY_MS: z.coerce.number().int().default(250),
    THROTTLE_TTL: z.coerce.number().int().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().default(120),
    AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().default(6),
    AUTH_LOGIN_WINDOW_SECONDS: z.coerce.number().int().default(900),
    AUTH_LOGIN_BLOCK_SECONDS: z.coerce.number().int().default(1800),

    QUEUE_SCHEDULER_ENABLED: z.coerce.boolean().optional(),
    QUEUE_MONITOR_ENABLED: z.coerce.boolean().optional(),
    QUEUE_INGESTION_CONCURRENCY: z.coerce.number().int().default(4),
    QUEUE_PREDICTION_CONCURRENCY: z.coerce.number().int().default(6),
    QUEUE_HEALTH_CONCURRENCY: z.coerce.number().int().default(2),
    QUEUE_JOB_TIMEOUT_MS: z.coerce.number().int().default(120000),
    QUEUE_STALLED_INTERVAL_MS: z.coerce.number().int().default(30000),
    QUEUE_STUCK_JOB_MS: z.coerce.number().int().default(300000),

    PROVIDER_TIMEOUT_MS: z.coerce.number().int().default(10000),
    PROVIDER_RETRY_COUNT: z.coerce.number().int().default(3),
    PROVIDER_RETRY_BACKOFF_MS: z.coerce.number().int().default(250),
    PROVIDER_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().default(5),
    PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().int().default(30000),
    PROVIDER_ADAPTIVE_BACKOFF_MAX_MS: z.coerce.number().int().default(15000),
    PROVIDER_RAW_DEBUG: z.coerce.boolean().default(false),

    ALERT_ERROR_RATE_THRESHOLD: z.coerce.number().default(0.2),
    ALERT_ERROR_RATE_WINDOW_SECONDS: z.coerce.number().int().default(120),
    ALERT_COOLDOWN_SECONDS: z.coerce.number().int().default(300),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_BUCKET: z.string().default('tahminx-artifacts'),
    STORAGE_PUBLIC_BASE_URL: z.string().optional(),
    STORAGE_LOCAL_PATH: z.string().default('./storage'),
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_REGION: z.string().default('us-east-1'),
    STORAGE_ACCESS_KEY_ID: z.string().optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
    STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

    FOOTBALL_DATA_API_KEY: z.string().optional(),
    BALL_DONT_LIE_API_KEY: z.string().optional(),
    API_FOOTBALL_API_KEY: z.string().optional(),
    THE_SPORTS_DB_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const appEnv = env.APP_ENV || (env.NODE_ENV === 'production' ? 'production' : 'development');
    const isProdLike = appEnv === 'production' || appEnv === 'staging';

    if (isProdLike && !env.DIRECT_DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DIRECT_DATABASE_URL is required in staging/production',
        path: ['DIRECT_DATABASE_URL'],
      });
    }

    if (isProdLike && !env.REDIS_URL && !env.REDIS_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'REDIS_URL (or REDIS_HOST) is required in staging/production',
        path: ['REDIS_URL'],
      });
    }

    if (isProdLike && !env.APP_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'APP_BASE_URL is required in staging/production',
        path: ['APP_BASE_URL'],
      });
    }

    if (isProdLike && !env.PUBLIC_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PUBLIC_BASE_URL is required in staging/production',
        path: ['PUBLIC_BASE_URL'],
      });
    }

    if (isProdLike && !env.ADMIN_BASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ADMIN_BASE_URL is required in staging/production',
        path: ['ADMIN_BASE_URL'],
      });
    }

    if (env.STORAGE_DRIVER === 's3' && (!env.STORAGE_ACCESS_KEY_ID || !env.STORAGE_SECRET_ACCESS_KEY || !env.STORAGE_ENDPOINT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'S3 storage requires STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY',
        path: ['STORAGE_DRIVER'],
      });
    }
  });

export type EnvVars = z.infer<typeof envSchema>;

export const validateEnv = (input: Record<string, unknown>): EnvVars => {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Environment validation failed: ${message}`);
  }
  return parsed.data;
};
