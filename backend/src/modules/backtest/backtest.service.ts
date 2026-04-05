import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionsService } from 'src/modules/predictions/predictions.service';
import { BacktestResultsQueryDto } from './dto/backtest-results-query.dto';
import { RunBacktestDto } from './dto/run-backtest.dto';

type OutcomeKey = 'homeWin' | 'draw' | 'awayWin';

interface BacktestSample {
  matchId: string;
  predictedOutcome: OutcomeKey;
  actualOutcome: OutcomeKey;
  confidenceScore: number;
  isCorrect: boolean;
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
}

@Injectable()
export class BacktestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionsService: PredictionsService,
  ) {}

  async results(query: BacktestResultsQueryDto) {
    const where: Prisma.BacktestResultWhereInput = {
      ...(query.modelVersionId ? { modelVersionId: query.modelVersionId } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(query.season ? { season: query.season } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.backtestResult.findMany({
        where,
        include: {
          modelVersion: true,
          league: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.backtestResult.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async run(dto: RunBacktestDto, actorUserId?: string) {
    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (fromDate >= toDate) {
      throw new BadRequestException('from must be earlier than to');
    }

    const modelVersion = await this.prisma.modelVersion.findUnique({
      where: { id: dto.modelVersionId },
    });
    if (!modelVersion || modelVersion.deletedAt) {
      throw new NotFoundException('Model version not found');
    }

    const league = dto.leagueId
      ? await this.prisma.league.findUnique({
          where: { id: dto.leagueId },
        })
      : null;

    if (dto.leagueId && !league) {
      throw new NotFoundException('League not found');
    }
    if (league && modelVersion.sportId && league.sportId !== modelVersion.sportId) {
      throw new BadRequestException('Model and league sport mismatch');
    }

    const where: Prisma.MatchWhereInput = {
      status: MatchStatus.COMPLETED,
      homeScore: { not: null },
      awayScore: { not: null },
      matchDate: {
        gte: fromDate,
        lte: toDate,
      },
      ...(modelVersion.sportId ? { sportId: modelVersion.sportId } : {}),
      ...(dto.leagueId ? { leagueId: dto.leagueId } : {}),
      ...(dto.season ? { season: { is: buildSeasonFilter(dto.season) } } : {}),
    };

    const matches = await this.prisma.match.findMany({
      where,
      select: {
        id: true,
        matchDate: true,
        homeScore: true,
        awayScore: true,
        leagueId: true,
        season: {
          select: {
            seasonYear: true,
            name: true,
          },
        },
      },
      orderBy: { matchDate: 'asc' },
      take: dto.sampleLimit,
    });

    if (!matches.length) {
      throw new BadRequestException('No historical matches found in selected range');
    }

    const samples: BacktestSample[] = [];
    for (const match of matches) {
      const preview = await this.predictionsService.previewForMatch(match.id, modelVersion.id);
      const probabilities = normalizeProbabilities(preview.probabilities);
      const actualOutcome = resolveActualOutcome(Number(match.homeScore), Number(match.awayScore));
      const predictedOutcome = resolvePredictedOutcome(probabilities);
      const confidenceScore = normalizeConfidence(preview.confidenceScore);

      samples.push({
        matchId: match.id,
        actualOutcome,
        predictedOutcome,
        confidenceScore,
        isCorrect: actualOutcome === predictedOutcome,
        probabilities,
      });
    }

    const accuracy = computeAccuracy(samples);
    const logLoss = computeLogLoss(samples);
    const brierScore = computeBrierScore(samples);
    const calibrationCurve = buildCalibrationCurve(samples);
    const comparison = buildComparison(samples);

    const seasonLabel =
      dto.season || inferSeasonLabel(matches.map((item) => item.season?.name).filter((value): value is string => Boolean(value)));

    const created = await this.prisma.backtestResult.create({
      data: {
        modelVersionId: modelVersion.id,
        leagueId: dto.leagueId || null,
        season: seasonLabel || null,
        fromDate,
        toDate,
        accuracy,
        logLoss,
        brierScore,
        sampleSize: samples.length,
        calibrationCurve: calibrationCurve as Prisma.InputJsonValue,
        comparison: comparison as Prisma.InputJsonValue,
      },
      include: {
        modelVersion: true,
        league: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId || null,
        action: 'backtest-run',
        targetType: 'backtest-result',
        targetId: created.id,
        payload: {
          modelVersionId: modelVersion.id,
          leagueId: dto.leagueId || null,
          season: seasonLabel || null,
          from: dto.from,
          to: dto.to,
          sampleSize: samples.length,
        } as Prisma.InputJsonValue,
      },
    });

    return this.toResponse(created);
  }

  private toResponse(
    item: Prisma.BacktestResultGetPayload<{
      include: { modelVersion: true; league: true };
    }>,
  ) {
    return {
      id: item.id,
      modelVersionId: item.modelVersionId,
      modelVersion: {
        id: item.modelVersion.id,
        key: item.modelVersion.key,
        name: item.modelVersion.name,
        version: item.modelVersion.version,
      },
      leagueId: item.leagueId,
      league: item.league
        ? {
            id: item.league.id,
            name: item.league.name,
            slug: item.league.slug,
          }
        : null,
      season: item.season,
      fromDate: item.fromDate.toISOString(),
      toDate: item.toDate.toISOString(),
      accuracy: item.accuracy,
      logLoss: item.logLoss,
      brierScore: item.brierScore,
      sampleSize: item.sampleSize,
      calibrationCurve: item.calibrationCurve,
      comparison: item.comparison,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

const buildSeasonFilter = (seasonValue: string): Prisma.SeasonWhereInput => {
  const year = Number(seasonValue);
  if (Number.isFinite(year)) {
    return {
      OR: [{ seasonYear: year }, { name: { contains: seasonValue, mode: 'insensitive' } }],
    };
  }
  return { name: { contains: seasonValue, mode: 'insensitive' } };
};

const resolveActualOutcome = (homeScore: number, awayScore: number): OutcomeKey => {
  if (homeScore > awayScore) {
    return 'homeWin';
  }
  if (homeScore < awayScore) {
    return 'awayWin';
  }
  return 'draw';
};

const resolvePredictedOutcome = (probabilities: { homeWin: number; draw: number; awayWin: number }): OutcomeKey => {
  if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) {
    return 'homeWin';
  }
  if (probabilities.awayWin >= probabilities.draw) {
    return 'awayWin';
  }
  return 'draw';
};

const normalizeProbabilities = (raw: Record<string, number>) => {
  const safe = {
    homeWin: clamp(raw.homeWin ?? 0),
    draw: clamp(raw.draw ?? 0),
    awayWin: clamp(raw.awayWin ?? 0),
  };
  const total = safe.homeWin + safe.draw + safe.awayWin;

  if (total <= 0) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: safe.homeWin / total,
    draw: safe.draw / total,
    awayWin: safe.awayWin / total,
  };
};

const normalizeConfidence = (score: number) => Math.max(0, Math.min(100, Number(score || 0)));
const clamp = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

const computeAccuracy = (samples: BacktestSample[]) => {
  const correct = samples.filter((item) => item.isCorrect).length;
  return round4(correct / samples.length);
};

const computeLogLoss = (samples: BacktestSample[]) => {
  const epsilon = 1e-15;
  const total = samples.reduce((sum, sample) => {
    const probability = Math.max(epsilon, sample.probabilities[sample.actualOutcome]);
    return sum - Math.log(probability);
  }, 0);
  return round4(total / samples.length);
};

const computeBrierScore = (samples: BacktestSample[]) => {
  const keys: OutcomeKey[] = ['homeWin', 'draw', 'awayWin'];
  const total = samples.reduce((sum, sample) => {
    const instance = keys.reduce((partial, key) => {
      const target = sample.actualOutcome === key ? 1 : 0;
      const error = sample.probabilities[key] - target;
      return partial + error * error;
    }, 0);
    return sum + instance / keys.length;
  }, 0);

  return round4(total / samples.length);
};

const buildCalibrationCurve = (samples: BacktestSample[]) => {
  const bins = Array.from({ length: 10 }).map((_, index) => ({
    from: index * 10,
    to: index === 9 ? 100 : index * 10 + 9,
    total: 0,
    correct: 0,
    confidenceSum: 0,
  }));

  for (const sample of samples) {
    const binIndex = Math.min(9, Math.floor(sample.confidenceScore / 10));
    const bin = bins[binIndex];
    bin.total += 1;
    if (sample.isCorrect) {
      bin.correct += 1;
    }
    bin.confidenceSum += sample.confidenceScore / 100;
  }

  return bins
    .filter((bin) => bin.total > 0)
    .map((bin) => ({
      bucket: `${bin.from}-${bin.to}`,
      sampleSize: bin.total,
      avgConfidence: round4(bin.confidenceSum / bin.total),
      actualAccuracy: round4(bin.correct / bin.total),
    }));
};

const buildComparison = (samples: BacktestSample[]) => {
  const correctPredictions = samples.filter((item) => item.isCorrect).length;
  const wrongPredictions = samples.length - correctPredictions;
  const confidenceVsReality = buildCalibrationCurve(samples);

  const details = samples.slice(0, 200).map((item) => ({
    matchId: item.matchId,
    predictedOutcome: item.predictedOutcome,
    actualOutcome: item.actualOutcome,
    confidenceScore: item.confidenceScore,
    isCorrect: item.isCorrect,
  }));

  return {
    correctPredictions,
    wrongPredictions,
    confidenceVsReality,
    details,
  };
};

const inferSeasonLabel = (seasonNames: string[]) => {
  const unique = [...new Set(seasonNames)];
  if (!unique.length) {
    return null;
  }
  if (unique.length === 1) {
    return unique[0];
  }
  return `${unique[0]} +${unique.length - 1}`;
};

const round4 = (value: number) => Number(value.toFixed(4));
