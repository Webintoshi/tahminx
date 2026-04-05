import { MatchesService } from './matches.service';

describe('MatchesService performance basics', () => {
  it('serves repeated match detail requests through cache resolver', async () => {
    const repositoryMock = {
      list: jest.fn(),
      today: jest.fn(),
      tomorrow: jest.fn(),
      live: jest.fn(),
      completed: jest.fn(),
      detail: jest.fn().mockResolvedValue({ id: 'm1' }),
      events: jest.fn(),
      stats: jest.fn(),
      prediction: jest.fn(),
    };

    const cache = new Map<string, any>();
    const cacheServiceMock = {
      getOrSet: jest.fn().mockImplementation(async (key: string, _ttl: number, resolver: () => Promise<any>) => {
        if (cache.has(key)) {
          return cache.get(key);
        }
        const value = await resolver();
        cache.set(key, value);
        return value;
      }),
    };

    const service = new MatchesService(repositoryMock as any, cacheServiceMock as any);
    const first = await service.detail('m1');
    const second = await service.detail('m1');

    expect(first).toEqual(second);
    expect(repositoryMock.detail).toHaveBeenCalledTimes(1);
  });
});

