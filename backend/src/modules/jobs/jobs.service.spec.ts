import { JobsService } from './jobs.service';

describe('JobsService scheduler tuning', () => {
  const createService = () => {
    const queueMock = {
      add: jest.fn().mockResolvedValue(undefined),
      getJobCounts: jest.fn().mockResolvedValue({ active: 0, waiting: 0, failed: 0, delayed: 0, completed: 0 }),
      getJobs: jest.fn().mockResolvedValue([]),
    } as any;

    const service = new JobsService(
      queueMock,
      queueMock,
      queueMock,
      queueMock,
      {
        ingestionJob: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      } as any,
      { setQueueDepth: jest.fn() } as any,
      { raise: jest.fn().mockResolvedValue(undefined) } as any,
    );

    return { service, queueMock };
  };

  it('registers repeatable jobs with tuned schedules', async () => {
    const { service, queueMock } = createService();
    await service.ensureRepeatableJobs();

    expect(queueMock.add).toHaveBeenCalledWith(
      'syncLeagues',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '0 3 * * *' } }),
    );

    expect(queueMock.add).toHaveBeenCalledWith(
      'syncFixtures',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '5 * * * *' } }),
    );

    expect(queueMock.add).toHaveBeenCalledWith(
      'syncMatchEvents',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '*/2 * * * 0,1,5,6' } }),
    );

    expect(queueMock.add).toHaveBeenCalledWith(
      'providerHealthCheck',
      expect.any(Object),
      expect.objectContaining({ repeat: { pattern: '*/5 * * * *' } }),
    );
  });

  it('sends final failed jobs to dead-letter queue', async () => {
    const deadLetterQueue = { add: jest.fn().mockResolvedValue(undefined) } as any;
    const prismaMock = {
      ingestionJob: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    const service = new JobsService(
      { add: jest.fn(), getJobCounts: jest.fn().mockResolvedValue({}), getJobs: jest.fn().mockResolvedValue([]) } as any,
      { add: jest.fn(), getJobCounts: jest.fn().mockResolvedValue({}), getJobs: jest.fn().mockResolvedValue([]) } as any,
      { add: jest.fn(), getJobCounts: jest.fn().mockResolvedValue({}), getJobs: jest.fn().mockResolvedValue([]) } as any,
      deadLetterQueue,
      prismaMock,
      { setQueueDepth: jest.fn() } as any,
      { raise: jest.fn().mockResolvedValue(undefined) } as any,
    );

    await service.markDeadLetter('ing-job-1', 'boom');

    expect(deadLetterQueue.add).toHaveBeenCalled();
    expect(prismaMock.ingestionJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ing-job-1' },
      }),
    );
  });
});
