export interface RedisConnectionConfig {
  url?: string;
  host: string;
  port: number;
  password?: string;
  tlsEnabled: boolean;
}

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;
type CorsOriginDelegate = (origin: string | undefined, callback: CorsOriginCallback) => void;

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

const normalizeOrigin = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const toComparablePort = (value: URL | { protocol: string; port?: string }): string =>
  value.port || (value.protocol === 'https:' ? '443' : value.protocol === 'http:' ? '80' : '');

export const matchesCorsOrigin = (origin: string, allowedOrigin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  if (allowedOrigin === '*') {
    return true;
  }

  const wildcardMatch = allowedOrigin.match(/^(https?):\/\/\*\.([^/:]+)(?::(\d+))?$/i);
  if (wildcardMatch) {
    const candidate = new URL(normalizedOrigin);
    const [, protocol, hostnameSuffix, port] = wildcardMatch;

    return (
      candidate.protocol === `${protocol.toLowerCase()}:` &&
      toComparablePort(candidate) === (port || (protocol.toLowerCase() === 'https' ? '443' : '80')) &&
      candidate.hostname.toLowerCase().endsWith(`.${hostnameSuffix.toLowerCase()}`)
    );
  }

  const normalizedAllowed = normalizeOrigin(allowedOrigin);
  if (normalizedAllowed) {
    return normalizedOrigin === normalizedAllowed;
  }

  return false;
};

const deriveSslipCorsPatterns = (urls: Array<string | undefined>): string[] => {
  const patterns = new Set<string>();

  for (const candidate of urls) {
    const normalized = normalizeOrigin(candidate);
    if (!normalized) {
      continue;
    }

    const parsed = new URL(normalized);
    if (!parsed.hostname.endsWith('.sslip.io')) {
      continue;
    }

    const firstDot = parsed.hostname.indexOf('.');
    if (firstDot <= 0 || firstDot === parsed.hostname.length - 1) {
      continue;
    }

    const siblingSuffix = parsed.hostname.slice(firstDot + 1);
    patterns.add(`http://*.${siblingSuffix}`);
    patterns.add(`https://*.${siblingSuffix}`);
  }

  return [...patterns];
};

export const buildCorsOriginDelegate = (input: {
  allowlist: string[] | true;
  baseUrls?: Array<string | undefined>;
}): true | CorsOriginDelegate => {
  if (input.allowlist === true) {
    return true;
  }

  const patterns = new Set<string>(input.allowlist);
  for (const derived of deriveSslipCorsPatterns(input.baseUrls || [])) {
    patterns.add(derived);
  }

  if (patterns.has('*') || !patterns.size) {
    return true;
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(
      null,
      [...patterns].some((pattern) => matchesCorsOrigin(origin, pattern)),
    );
  };
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
