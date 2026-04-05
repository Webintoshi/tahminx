export interface RedisConnectionConfig {
  url?: string;
  host: string;
  port: number;
  password?: string;
  tlsEnabled: boolean;
}

const withSslMode = (value: string, sslMode: 'disable' | 'prefer' | 'require'): string => {
  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);
    if (!url.searchParams.get('sslmode')) {
      url.searchParams.set('sslmode', sslMode);
    }
    return url.toString();
  } catch {
    return value;
  }
};

export const resolveDatabaseUrls = (input: {
  databaseUrl: string;
  directDatabaseUrl?: string;
  sslMode: 'disable' | 'prefer' | 'require';
}): { databaseUrl: string; directDatabaseUrl: string } => {
  const databaseUrl = withSslMode(input.databaseUrl, input.sslMode);
  const directDatabaseUrl = withSslMode(input.directDatabaseUrl || input.databaseUrl, input.sslMode);
  return { databaseUrl, directDatabaseUrl };
};

export const resolveRedisConnection = (input: {
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}): RedisConnectionConfig => {
  const fallback: RedisConnectionConfig = {
    host: input.redisHost || '127.0.0.1',
    port: Number(input.redisPort || 6379),
    password: input.redisPassword || undefined,
    tlsEnabled: false,
  };

  if (!input.redisUrl) {
    return fallback;
  }

  try {
    const parsed = new URL(input.redisUrl);
    return {
      url: input.redisUrl,
      host: parsed.hostname || fallback.host,
      port: Number(parsed.port || fallback.port),
      password: parsed.password || fallback.password,
      tlsEnabled: parsed.protocol === 'rediss:',
    };
  } catch {
    return fallback;
  }
};

export const resolveCorsOrigins = (corsOrigin: string, corsAllowList?: string): string[] | true => {
  const list = (corsAllowList || corsOrigin || '*')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (list.includes('*')) {
    return true;
  }

  return list.length ? list : true;
};

export const parseTrustProxy = (value: string): boolean | number | string => {
  const normalized = String(value || 'false').trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }
  return value;
};