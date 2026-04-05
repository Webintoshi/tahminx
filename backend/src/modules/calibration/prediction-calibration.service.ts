import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { CalibrationResultsQueryDto } from './dto/calibration-results-query.dto';
import { RunCalibrationDto } from './dto/run-calibration.dto';

interface CalibrationSample {
  rawConfidence: number;
  outcome: number;
}

interface PlattParams {
  a: number;
  b: number;
}

interface CalibrationRunMetrics {
  preBrierScore: number;
  postBrierScore: number;
  preLogLoss: number;
  postLogLoss: number;
  ece: number;
}

@Injectable()
export class PredictionCalibrationService {
  constructor(private readonly prisma: PrismaService) {}

  async results(query: CalibrationResultsQueryDto) {
    const where: Prisma.PredictionCalibrationWhereInput = {
      ...(query.modelVersionId ? { modelVersionId: query.modelVersionId } : {}),
      ...(query.sport ? { sport: query.sport.toUpperCase() } : {}),
      ...(query.predictionType ? { predictionType: query.predictionType } : {}),
      ...(typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.predictionCalibration.findMany({
        where,
        include: {
          modelVersion: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.predictionCalibration.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        modelVersionId: item.modelVersionId,
        modelVersion: {
          id: item.modelVersion.id,
          key: item.modelVersion.key,
          name: item.modelVersion.name,
          version: item.modelVersion.version,
        },
        sport: item.sport,
        predictionType: item.predictionType,
        calibrationMethod: item.calibrationMethod,
        trainingSampleSize: item.trainingSampleSize,
        calibrationParams: item.calibrationParams,
        calibrationMetrics: item.calibrationMetrics,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async run(dto: RunCalibrationDto, actorUserId?: string) {
    const modelVersion = await this.prisma.modelVersion.findUnique({
      where: { id: dto.modelVersionId },
      include: {
        predictions: false,
      },
    });

    if (!modelVersion || modelVersion.deletedAt) {
      throw new NotFoundException('Model version not found');
    }

    const sportCode = await this.resolveSportCode(dto, modelVersion.sportId);
    const predictionType = dto.predictionType || 'matchOutcome1x2';

    if (dto.calibrationMethod === 'isotonic') {
      throw new BadRequestException('Isotonic method is not active yet. Use platt.');
    }

    const samples = await this.loadTrainingSamples(modelVersion.id);
    if (samples.length < 30) {
      throw new BadRequestException('Not enough calibration samples. Minimum 30 required.');
    }

    const plattParams = fitPlattScaling(samples);
    const metrics = evaluatePlatt(samples, plattParams);

    await this.prisma.$transaction(async (tx) => {
      await tx.predictionCalibration.updateMany({
        where: {
          modelVersionId: modelVersion.id,
          sport: sportCode,
          predictionType,
          isActive: true,
        },
        data: { isActive: false },
      });

      const created = await tx.predictionCalibration.create({
        data: {
          modelVersionId: modelVersion.id,
          sport: sportCode,
          predictionType,
          calibrationMethod: 'platt',
          trainingSampleSize: samples.length,
          calibrationParams: {
            a: round6(plattParams.a),
            b: round6(plattParams.b),
            inputType: 'rawConfidence',
            outputType: 'calibratedConfidence',
          } as Prisma.InputJsonValue,
          calibrationMetrics: {
            ...metrics,
            generatedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId || null,
          action: 'calibration-run',
          targetType: 'prediction-calibration',
          targetId: created.id,
          payload: {
            modelVersionId: modelVersion.id,
            sport: sportCode,
            predictionType,
            calibrationMethod: 'platt',
            trainingSampleSize: samples.length,
          } as Prisma.InputJsonValue,
        },
      });
    });

    const latest = await this.prisma.predictionCalibration.findFirst({
      where: {
        modelVersionId: modelVersion.id,
        sport: sportCode,
        predictionType,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      throw new BadRequestException('Calibration could not be stored');
    }

    return {
      id: latest.id,
      modelVersionId: latest.modelVersionId,
      sport: latest.sport,
      predictionType: latest.predictionType,
      calibrationMethod: latest.calibrationMethod,
      trainingSampleSize: latest.trainingSampleSize,
      calibrationParams: latest.calibrationParams,
      calibrationMetrics: latest.calibrationMetrics,
      isActive: latest.isActive,
      createdAt: latest.createdAt.toISOString(),
      updatedAt: latest.updatedAt.toISOString(),
    };
  }

  async calibrateProbabilities(input: {
    modelVersionId: string;
    sport: string;
    predictionType: string;
    probabilities: { homeWin: number; draw: number; awayWin: number };
    rawConfidence: number;
    calibrationProfileId?: string | null;
  }): Promise<{
    probabilities: { homeWin: number; draw: number; awayWin: number };
    calibratedConfidence: number;
    calibrationApplied: boolean;
    calibrationId: string | null;
    trainingSampleSize: number;
  }> {
    let active = null;

    if (input.calibrationProfileId) {
      active = await this.prisma.predictionCalibration.findUnique({
        where: { id: input.calibrationProfileId },
      });
      if (active && !active.isActive) {
        active = null;
      }
    }

    if (!active) {
      active = await this.prisma.predictionCalibration.findFirst({
        where: {
          modelVersionId: input.modelVersionId,
          sport: input.sport.toUpperCase(),
          predictionType: input.predictionType,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!active) {
      return {
        probabilities: normalizeDistribution(input.probabilities),
        calibratedConfidence: clamp01(input.rawConfidence),
        calibrationApplied: false,
        calibrationId: null,
        trainingSampleSize: 0,
      };
    }

    const params = active.calibrationParams as Record<string, unknown>;
    const a = Number(params.a ?? 1);
    const b = Number(params.b ?? 0);
    const calibratedConfidence = sigmoid(a * clamp01(input.rawConfidence) + b);

    const probabilities = calibrateDistributionWithConfidence(
      normalizeDistribution(input.probabilities),
      calibratedConfidence,
    );

    return {
      probabilities,
      calibratedConfidence,
      calibrationApplied: true,
      calibrationId: active.id,
      trainingSampleSize: active.trainingSampleSize,
    };
  }

  async healthSummary() {
    const latest = await this.prisma.predictionCalibration.findMany({
      where: { isActive: true },
      include: { modelVersion: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return latest.map((item) => ({
      id: item.id,
      modelVersionId: item.modelVersionId,
      modelKey: item.modelVersion.key,
      sport: item.sport,
      predictionType: item.predictionType,
      calibrationMethod: item.calibrationMethod,
      trainingSampleSize: item.trainingSampleSize,
      calibrationMetrics: item.calibrationMetrics,
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  private async resolveSportCode(dto: RunCalibrationDto, sportId: string | null) {
    if (dto.sport) {
      return dto.sport.toUpperCase();
    }

    if (!sportId) {
      return 'UNKNOWN';
    }

    const sport = await this.prisma.sport.findUnique({
      where: { id: sportId },
      select: { code: true },
    });

    if (!sport) {
      return 'UNKNOWN';
    }

    return String(sport.code).toUpperCase();
  }

  private async loadTrainingSamples(modelVersionId: string): Promise<CalibrationSample[]> {
    const backtestRows = await this.prisma.backtestResult.findMany({
      where: { modelVersionId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        comparison: true,
      },
    });

    const samples: CalibrationSample[] = [];
    for (const row of backtestRows) {
      const comparison = row.comparison as Record<string, unknown> | null;
      const details = Array.isArray(comparison?.details) ? (comparison?.details as Array<Record<string, unknown>>) : [];
      for (const detail of details) {
        const confidenceScore = Number(detail.confidenceScore ?? 0);
        const isCorrect = Boolean(detail.isCorrect);
        if (!Number.isFinite(confidenceScore)) {
          continue;
        }
        samples.push({
          rawConfidence: clamp01(confidenceScore / 100),
          outcome: isCorrect ? 1 : 0,
        });
      }
    }

    if (samples.length >= 30) {
      return samples;
    }

    const fallbackPredictions = await this.prisma.prediction.findMany({
      where: {
        modelVersionId,
        status: 'PUBLISHED',
        match: {
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null },
        },
      },
      select: {
        confidenceScore: true,
        probabilities: true,
        match: {
          select: { homeScore: true, awayScore: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 400,
    });

    for (const prediction of fallbackPredictions) {
      const probs = normalizeDistribution((prediction.probabilities as Record<string, number>) || {});
      const predicted = topOutcome(probs);
      const actual = resolveOutcome(Number(prediction.match.homeScore), Number(prediction.match.awayScore));
      samples.push({
        rawConfidence: clamp01(Number(prediction.confidenceScore || 0) / 100),
        outcome: predicted === actual ? 1 : 0,
      });
    }

    return samples;
  }
}

const fitPlattScaling = (samples: CalibrationSample[]): PlattParams => {
  let a = 1;
  let b = 0;
  const learningRate = 0.08;
  const lambda = 1e-4;
  const iterations = 2200;

  for (let i = 0; i < iterations; i += 1) {
    let gradA = 0;
    let gradB = 0;

    for (const sample of samples) {
      const p = sigmoid(a * sample.rawConfidence + b);
      const diff = p - sample.outcome;
      gradA += diff * sample.rawConfidence;
      gradB += diff;
    }

    gradA = gradA / samples.length + lambda * a;
    gradB = gradB / samples.length + lambda * b;

    a -= learningRate * gradA;
    b -= learningRate * gradB;
  }

  return { a, b };
};

const evaluatePlatt = (samples: CalibrationSample[], params: PlattParams): CalibrationRunMetrics => {
  const pre: Array<{ p: number; y: number }> = samples.map((sample) => ({ p: clamp01(sample.rawConfidence), y: sample.outcome }));
  const post: Array<{ p: number; y: number }> = samples.map((sample) => ({
    p: clamp01(sigmoid(params.a * sample.rawConfidence + params.b)),
    y: sample.outcome,
  }));

  return {
    preBrierScore: round6(avg(pre.map((item) => (item.p - item.y) ** 2))),
    postBrierScore: round6(avg(post.map((item) => (item.p - item.y) ** 2))),
    preLogLoss: round6(avg(pre.map((item) => -item.y * Math.log(Math.max(item.p, 1e-12)) - (1 - item.y) * Math.log(Math.max(1 - item.p, 1e-12))))),
    postLogLoss: round6(avg(post.map((item) => -item.y * Math.log(Math.max(item.p, 1e-12)) - (1 - item.y) * Math.log(Math.max(1 - item.p, 1e-12))))),
    ece: round6(computeEce(post)),
  };
};

const calibrateDistributionWithConfidence = (
  probabilities: { homeWin: number; draw: number; awayWin: number },
  calibratedConfidence: number,
) => {
  const normalized = normalizeDistribution(probabilities);
  const winner = topOutcome(normalized);
  const winnerRaw = normalized[winner];
  const target = clamp01(calibratedConfidence);

  const winnerAdjusted = clamp(0.05, 0.94, target);
  const remaining = 1 - winnerAdjusted;

  const others: Array<'homeWin' | 'draw' | 'awayWin'> = ['homeWin', 'draw', 'awayWin'].filter(
    (item): item is 'homeWin' | 'draw' | 'awayWin' => item !== winner,
  );

  const rawRemaining = Math.max(1e-6, 1 - winnerRaw);

  const adjusted = {
    homeWin: 0,
    draw: 0,
    awayWin: 0,
  };
  adjusted[winner] = winnerAdjusted;
  for (const key of others) {
    adjusted[key] = (normalized[key] / rawRemaining) * remaining;
  }

  return normalizeDistribution(adjusted);
};

const normalizeDistribution = (probabilities: Record<string, number>) => {
  const homeWin = clamp01(Number(probabilities.homeWin ?? 0));
  const draw = clamp01(Number(probabilities.draw ?? 0));
  const awayWin = clamp01(Number(probabilities.awayWin ?? 0));
  const total = homeWin + draw + awayWin;
  if (total <= 0) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
  };
};

const resolveOutcome = (homeScore: number, awayScore: number): 'homeWin' | 'draw' | 'awayWin' => {
  if (homeScore > awayScore) return 'homeWin';
  if (homeScore < awayScore) return 'awayWin';
  return 'draw';
};

const topOutcome = (probabilities: { homeWin: number; draw: number; awayWin: number }): 'homeWin' | 'draw' | 'awayWin' => {
  if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) return 'homeWin';
  if (probabilities.awayWin >= probabilities.draw) return 'awayWin';
  return 'draw';
};

const computeEce = (samples: Array<{ p: number; y: number }>) => {
  const bins = Array.from({ length: 10 }).map((_, idx) => ({ idx, count: 0, pSum: 0, ySum: 0 }));
  for (const sample of samples) {
    const idx = Math.min(9, Math.floor(sample.p * 10));
    bins[idx].count += 1;
    bins[idx].pSum += sample.p;
    bins[idx].ySum += sample.y;
  }

  const total = samples.length;
  if (!total) return 0;

  return bins.reduce((sum, bin) => {
    if (!bin.count) return sum;
    const conf = bin.pSum / bin.count;
    const acc = bin.ySum / bin.count;
    return sum + (bin.count / total) * Math.abs(conf - acc);
  }, 0);
};

const avg = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const clamp01 = (value: number) => clamp(0, 1, value);
const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));
const round6 = (value: number) => Number(value.toFixed(6));
