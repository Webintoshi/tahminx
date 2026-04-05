import { Job } from 'bullmq';
import { JOB_NAMES } from 'src/shared/constants/jobs.constants';
import { PredictionProcessor } from './prediction.processor';

describe('PredictionProcessor', () => {
  it('chains generateFeatures -> generatePredictions for successful matches', async () => {
    const predictionsServiceMock = {
      generateFeaturesForMatches: jest.fn().mockResolvedValue([
        { matchId: 'm1', status: 'success' },
        { matchId: 'm2', status: 'failed' },
      ]),
      generateFeaturesForMatch: jest.fn(),
      generatePendingFeatures: jest.fn(),
      generateForMatch: jest.fn(),
      generateForMatches: jest.fn(),
      generatePendingPredictions: jest.fn(),
    };

    const jobsServiceMock = {
      enqueuePredictionBatch: jest.fn().mockResolvedValue(undefined),
    };
    const metricsServiceMock = {
      observeQueueJob: jest.fn(),
    };

    const processor = new PredictionProcessor(
      predictionsServiceMock as any,
      jobsServiceMock as any,
      metricsServiceMock as any,
      { raise: jest.fn().mockResolvedValue(undefined) } as any,
    );
    await processor.process({
      id: 'job-1',
      name: JOB_NAMES.generateFeatures,
      data: { matchIds: ['m1', 'm2'] },
    } as Job<any>);

    expect(predictionsServiceMock.generateFeaturesForMatches).toHaveBeenCalledWith(['m1', 'm2']);
    expect(jobsServiceMock.enqueuePredictionBatch).toHaveBeenCalledWith(['m1'], expect.stringContaining('feature-job'));
  });

  it('runs single prediction generation job', async () => {
    const predictionsServiceMock = {
      generateFeaturesForMatches: jest.fn(),
      generateFeaturesForMatch: jest.fn(),
      generatePendingFeatures: jest.fn(),
      generateForMatch: jest.fn().mockResolvedValue({ data: { matchId: 'm1' } }),
      generateForMatches: jest.fn(),
      generatePendingPredictions: jest.fn(),
    };

    const processor = new PredictionProcessor(predictionsServiceMock as any, {
      enqueuePredictionBatch: jest.fn(),
    } as any, {
      observeQueueJob: jest.fn(),
    } as any, {
      raise: jest.fn().mockResolvedValue(undefined),
    } as any);

    await processor.process({
      id: 'job-2',
      name: JOB_NAMES.generatePredictions,
      data: { matchId: 'm1' },
    } as Job<any>);

    expect(predictionsServiceMock.generateForMatch).toHaveBeenCalledWith('m1');
  });
});
