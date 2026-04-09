import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LiveService } from './live.service';

const redisInstances: any[] = [];

jest.mock('ioredis', () => {
  const ctor = jest.fn().mockImplementation(() => {
    const listeners: Record<string, (...args: any[]) => void> = {};
    const instance = {
      subscribe: jest.fn().mockResolvedValue(1),
      on: jest.fn((event: string, cb: (...args: any[]) => void) => {
        listeners[event] = cb;
      }),
      publish: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
      __emitMessage: (payload: string) => listeners.message?.('live:match-events', payload),
    };
    redisInstances.push(instance);
    return instance;
  });

  return {
    __esModule: true,
    default: ctor,
  };
});

describe('LiveService', () => {
  it('streams normalized live match event payloads', async () => {
    const service = new LiveService(
      {} as any,
      {
        getOrSet: jest.fn(),
        del: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        observeQueueJob: jest.fn(),
      } as any,
      { get: jest.fn(() => null) } as any,
    );

    await service.onModuleInit();

    const payloadPromise = firstValueFrom(
      service.streamEvents('match-1').pipe(
        filter((event) => event.type === 'matchEvent'),
      ),
    );

    redisInstances[1].__emitMessage(
      JSON.stringify({
        eventType: 'matchEvent',
        matchId: 'match-1',
        sport: 'football',
        leagueId: 'league-1',
        timestamp: new Date().toISOString(),
        source: 'provider:football_data',
        payload: {
          eventId: 'event-1',
          minute: 61,
          type: 'goal',
          teamId: 'team-1',
          playerId: null,
          data: { score: '2-1' },
        },
      }),
    );

    const message = await payloadPromise;
    const data = message.data as any;
    expect(data.matchId).toBe('match-1');
    expect(data.payload.type).toBe('goal');

    await service.onModuleDestroy();
  });
});
