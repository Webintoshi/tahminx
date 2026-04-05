import { JOB_NAMES } from 'src/shared/constants/jobs.constants';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { IngestionProcessor } from './ingestion.processor';

describe('IngestionProcessor cache invalidation', () => {
  it('invalidates related match cache after syncMatchEvents', async () => {
    const prismaMock = {
      provider: {
        findUnique: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      },
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const providersServiceMock = {
      isProviderEnabled: jest.fn().mockResolvedValue(true),
      getAdapterByCode: jest.fn().mockReturnValue({}),
    };
    const cacheServiceMock = {
      del: jest.fn().mockResolvedValue(undefined),
      delByPrefix: jest.fn().mockResolvedValue(undefined),
    };
    const metricsServiceMock = {
      recordIngestionRun: jest.fn(),
      observeQueueJob: jest.fn(),
    };
    const liveServiceMock = {
      publishMatchEvent: jest.fn().mockResolvedValue(undefined),
    };

    const processor = new IngestionProcessor(
      prismaMock,
      providersServiceMock as any,
      cacheServiceMock as any,
      metricsServiceMock as any,
      { raise: jest.fn().mockResolvedValue(undefined) } as any,
      liveServiceMock as any,
      {} as any,
      { enqueueFeatureBatch: jest.fn().mockResolvedValue(undefined) } as any,
    );

    jest.spyOn(processor as any, 'syncMatchEvents').mockResolvedValue({
      processed: 3,
      upserted: 3,
      touchedMatchIds: ['match-1', 'match-2'],
    });

    await processor.process({
      name: JOB_NAMES.syncMatchEvents,
      data: { providerCode: 'football_data' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any);

    expect(cacheServiceMock.del).toHaveBeenCalledWith([
      CacheKeys.matchDetail('match-1'),
      CacheKeys.matchDetail('match-2'),
    ]);
  });
});
