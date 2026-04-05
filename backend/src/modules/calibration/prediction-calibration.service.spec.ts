import { PredictionCalibrationService } from './prediction-calibration.service';

describe('PredictionCalibrationService', () => {
  it('applies active platt calibration to probabilities', async () => {
    const prismaMock = {
      predictionCalibration: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cal-1',
          modelVersionId: 'mv-1',
          sport: 'FOOTBALL',
          predictionType: 'matchOutcome1x2',
          calibrationMethod: 'platt',
          trainingSampleSize: 180,
          calibrationParams: { a: 2.4, b: -0.8 },
          isActive: true,
        }),
      },
    } as any;

    const service = new PredictionCalibrationService(prismaMock);
    const result = await service.calibrateProbabilities({
      modelVersionId: 'mv-1',
      sport: 'football',
      predictionType: 'matchOutcome1x2',
      probabilities: { homeWin: 0.55, draw: 0.25, awayWin: 0.2 },
      rawConfidence: 0.62,
    });

    expect(result.calibrationApplied).toBe(true);
    expect(result.calibrationId).toBe('cal-1');
    expect(result.trainingSampleSize).toBe(180);
    const total = result.probabilities.homeWin + result.probabilities.draw + result.probabilities.awayWin;
    expect(total).toBeCloseTo(1, 4);
  });

  it('runs platt calibration and stores active calibration record', async () => {
    const backtestDetails = Array.from({ length: 40 }).map((_, idx) => ({
      confidenceScore: 60 + (idx % 25),
      isCorrect: idx % 2 === 0,
    }));

    const txMock = {
      predictionCalibration: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'cal-new' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const prismaMock = {
      modelVersion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'mv-1',
          deletedAt: null,
          sportId: 'sport-1',
        }),
      },
      sport: {
        findUnique: jest.fn().mockResolvedValue({ code: 'FOOTBALL' }),
      },
      backtestResult: {
        findMany: jest.fn().mockResolvedValue([
          {
            comparison: {
              details: backtestDetails,
            },
          },
        ]),
      },
      prediction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (cb: (tx: typeof txMock) => Promise<void>) => cb(txMock)),
      predictionCalibration: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cal-new',
          modelVersionId: 'mv-1',
          sport: 'FOOTBALL',
          predictionType: 'matchOutcome1x2',
          calibrationMethod: 'platt',
          trainingSampleSize: 40,
          calibrationParams: { a: 1.1, b: -0.2 },
          calibrationMetrics: {
            preBrierScore: 0.23,
            postBrierScore: 0.21,
            preLogLoss: 0.64,
            postLogLoss: 0.61,
            ece: 0.04,
          },
          isActive: true,
          createdAt: new Date('2026-04-05T10:00:00.000Z'),
          updatedAt: new Date('2026-04-05T10:00:01.000Z'),
        }),
      },
    } as any;

    const service = new PredictionCalibrationService(prismaMock);
    const created = await service.run(
      {
        modelVersionId: 'mv-1',
        sport: 'football',
        predictionType: 'matchOutcome1x2',
        calibrationMethod: 'platt',
      },
      'admin-1',
    );

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(txMock.predictionCalibration.create).toHaveBeenCalled();
    expect(created.id).toBe('cal-new');
    expect(created.calibrationMethod).toBe('platt');
  });
});
