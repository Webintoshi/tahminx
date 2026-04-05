import { CacheService } from './cache.service';

const store = new Map<string, string>();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    status: 'ready',
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (...keys: string[]) => {
      keys.forEach((key) => store.delete(key));
      return keys.length;
    }),
    incr: jest.fn(async (key: string) => {
      const current = Number(store.get(key) || '0') + 1;
      store.set(key, String(current));
      return current;
    }),
    expire: jest.fn(async () => 1),
    ttl: jest.fn(async () => 60),
    scan: jest.fn(async (_cursor: string, _match: string, pattern: string) => {
      const normalized = String(pattern || '').replace('*', '');
      const keys = [...store.keys()].filter((key) => key.startsWith(normalized));
      return ['0', keys];
    }),
    quit: jest.fn(async () => undefined),
  })),
}));

describe('CacheService', () => {
  beforeEach(() => {
    store.clear();
  });

  it('returns cached value on second getOrSet', async () => {
    const resolver = jest.fn().mockResolvedValue({ value: 42 });
    const cache = new CacheService(
      { get: jest.fn().mockImplementation((key: string) => (key === 'cache.prefix' ? 'test' : undefined)) } as any,
      { observeCache: jest.fn() } as any,
    );

    const first = await cache.getOrSet('matches:detail:1', 30, resolver);
    const second = await cache.getOrSet('matches:detail:1', 30, resolver);

    expect(first).toEqual({ value: 42 });
    expect(second).toEqual({ value: 42 });
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it('increments counters with ttl', async () => {
    const cache = new CacheService(
      { get: jest.fn().mockImplementation((key: string) => (key === 'cache.prefix' ? 'test' : undefined)) } as any,
      { observeCache: jest.fn() } as any,
    );

    const first = await cache.incr('auth:login-attempt:test@example.com', 60);
    const second = await cache.incr('auth:login-attempt:test@example.com', 60);

    expect(first).toBe(1);
    expect(second).toBe(2);
  });
});
