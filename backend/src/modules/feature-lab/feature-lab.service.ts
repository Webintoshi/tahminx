import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma, PredictionStatus } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { FeatureLabQueryDto } from './dto/feature-lab-query.dto';
import { FeatureLabResultsQueryDto } from './dto/feature-lab-results-query.dto';
import { RunFeatureExperimentDto } from './dto/run-feature-experiment.dto';

interface FeatureLabTemplate {
  name: string;
  version: string;
  enabledFeatures: string[];
  featureGroups: Record<string, string[]>;
}

@Injectable()
export class FeatureLabService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaultFeatureSets();
  }

  async list(query: FeatureLabQueryDto) {
    const where: Prisma.FeatureLabSetWhereInput = {
      ...(query.sport ? { sport: query.sport.toUpperCase() } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.featureLabSet.findMany({
        where,
        orderBy: [{ sport: 'asc' }, { isActive: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.featureLabSet.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        sport: String(item.sport || '').toLowerCase(),
        name: item.name,
        version: item.version,
        enabledFeatures: item.enabledFeatures,
        featureGroups: item.featureGroups,
        isActive: item.isActive,
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async runExperiment(dto: RunFeatureExperimentDto, actorUserId?: string) {
    const featureSet = await this.prisma.featureLabSet.findUnique({ where: { id: dto.featureSetId } });
    if (!featureSet) {
      throw new NotFoundException('Feature set not found');
    }

    const modelVersion = await this.prisma.modelVersion.findUnique({ where: { id: dto.modelVersionId } });
    if (!modelVersion || modelVersion.deletedAt) {
      throw new NotFoundException('Model version not found');
    }

    const fromDate = dto.from ? new Date(dto.from) : daysAgo(45);
    const toDate = dto.to ? new Date(dto.to) : new Date();

    const predictions = await this.prisma.prediction.findMany({
      where: {
        status: PredictionStatus.PUBLISHED,
        modelVersionId: dto.modelVersionId,
        match: {
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null },
          matchDate: { gte: fromDate, lte: toDate },
          ...(dto.sport ? { sport: { code: dto.sport.toUpperCase() as never } } : {}),
          ...(dto.leagueId ? { leagueId: dto.leagueId } : {}),
        },
      },
      include: {
        explanation: true,
        match: {
          include: { sport: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8000,
    });

    const enabled = normalizeStringArray(featureSet.enabledFeatures);
    const evaluated = predictions
      .map((prediction) => {
        const explanation = prediction.explanation?.explanation as Record<string, unknown> | null;
        const allFeatures = toNumberMap(explanation?.features);
        const selected = Object.fromEntries(Object.entries(allFeatures).filter(([key]) => enabled.includes(key)));

        const hasCoverage = enabled.length ? Object.keys(selected).length / enabled.length >= 0.5 : true;
        if (!hasCoverage) {
          return null;
        }

        const probabilities = normalizeProbabilities(prediction.probabilities as Record<string, unknown>);
        const predicted = topOutcome(probabilities);
        const actual = actualOutcome(
          Number(prediction.match.homeScore || 0),
          Number(prediction.match.awayScore || 0),
          String(prediction.match.sport.code || '').toLowerCase(),
        );

        return {
          confidenceScore: Number(prediction.confidenceScore || 0),
          probabilities,
          isCorrect: predicted === actual,
          actual,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const sampleSize = evaluated.length;
    const accuracy = sampleSize ? evaluated.filter((item) => item.isCorrect).length / sampleSize : 0;
    const avgConfidenceScore = sampleSize
      ? evaluated.reduce((sum, item) => sum + item.confidenceScore, 0) / sampleSize
      : 0;
    const logLoss = sampleSize
      ? evaluated.reduce((sum, item) => sum + -Math.log(Math.max(1e-12, probForOutcome(item.probabilities, item.actual))), 0) / sampleSize
      : 1;
    const brierScore = sampleSize
      ? evaluated.reduce((sum, item) => {
          const actualVec = toOutcomeVector(item.actual);
          const predVec = [item.probabilities.homeWin, item.probabilities.draw, item.probabilities.awayWin];
          return (
            sum +
            ((predVec[0] - actualVec[0]) ** 2 +
              (predVec[1] - actualVec[1]) ** 2 +
              (predVec[2] - actualVec[2]) ** 2) /
              3
          );
        }, 0) / sampleSize
      : 1;

    const experiment = await this.prisma.featureLabExperiment.create({
      data: {
        featureSetId: featureSet.id,
        modelVersionId: modelVersion.id,
        sport: dto.sport ? dto.sport.toUpperCase() : featureSet.sport,
        leagueId: dto.leagueId || null,
        predictionType: dto.predictionType,
        fromDate,
        toDate,
        status: 'COMPLETED',
        sampleSize,
        metrics: {
          accuracy: Number(accuracy.toFixed(4)),
          logLoss: Number(logLoss.toFixed(4)),
          brierScore: Number(brierScore.toFixed(4)),
          avgConfidenceScore: Number(avgConfidenceScore.toFixed(2)),
          coverageRate: Number((sampleSize / Math.max(1, predictions.length)).toFixed(4)),
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId || null,
        action: 'feature-lab-experiment-run',
        targetType: 'feature-lab-experiment',
        targetId: experiment.id,
        payload: {
          modelVersionId: dto.modelVersionId,
          featureSetId: dto.featureSetId,
          sport: dto.sport || null,
          leagueId: dto.leagueId || null,
          predictionType: dto.predictionType,
          sampleSize,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      data: this.toExperimentView(experiment),
      meta: null,
    };
  }

  async results(query: FeatureLabResultsQueryDto) {
    const where: Prisma.FeatureLabExperimentWhereInput = {
      ...(query.sport ? { sport: query.sport.toUpperCase() } : {}),
      ...(query.modelVersionId ? { modelVersionId: query.modelVersionId } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.featureLabExperiment.findMany({
        where,
        include: {
          featureSet: true,
          modelVersion: true,
          league: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.featureLabExperiment.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...this.toExperimentView(item),
        featureSet: {
          id: item.featureSet.id,
          sport: String(item.featureSet.sport || '').toLowerCase(),
          name: item.featureSet.name,
          version: item.featureSet.version,
        },
        modelVersion: {
          id: item.modelVersion.id,
          key: item.modelVersion.key,
          name: item.modelVersion.name,
        },
        league: item.league
          ? {
              id: item.league.id,
              name: item.league.name,
            }
          : null,
      })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async activeFeatureSetForSport(sportCode: 'FOOTBALL' | 'BASKETBALL') {
    const active = await this.prisma.featureLabSet.findFirst({
      where: {
        sport: sportCode,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (active) {
      return active;
    }

    const fallbackTemplate = this.defaultTemplateForSport(sportCode);
    return this.prisma.featureLabSet.create({
      data: {
        sport: sportCode,
        name: fallbackTemplate.name,
        version: fallbackTemplate.version,
        enabledFeatures: fallbackTemplate.enabledFeatures as unknown as Prisma.InputJsonValue,
        featureGroups: fallbackTemplate.featureGroups as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  async analyticsSummary() {
    const experiments = await this.prisma.featureLabExperiment.findMany({
      include: {
        featureSet: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 400,
    });

    const ranked = experiments
      .map((item) => ({
        id: item.id,
        featureSetId: item.featureSetId,
        featureSetName: `${item.featureSet.name}@${item.featureSet.version}`,
        sport: String(item.sport || '').toLowerCase(),
        modelVersionId: item.modelVersionId,
        accuracy: Number((item.metrics as Record<string, unknown>)?.accuracy || 0),
        sampleSize: item.sampleSize,
        updatedAt: item.updatedAt.toISOString(),
      }))
      .filter((item) => item.sampleSize >= 20)
      .sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.sampleSize - a.sampleSize;
      });

    return {
      topFeatureSets: ranked.slice(0, 8),
      featureExperimentWinners: ranked.slice(0, 5),
    };
  }

  private async ensureDefaultFeatureSets() {
    for (const sportCode of ['FOOTBALL', 'BASKETBALL'] as const) {
      const template = this.defaultTemplateForSport(sportCode);
      const existing = await this.prisma.featureLabSet.findUnique({
        where: {
          sport_name_version: {
            sport: sportCode,
            name: template.name,
            version: template.version,
          },
        },
      });

      if (!existing) {
        await this.prisma.featureLabSet.create({
          data: {
            sport: sportCode,
            name: template.name,
            version: template.version,
            enabledFeatures: template.enabledFeatures as unknown as Prisma.InputJsonValue,
            featureGroups: template.featureGroups as unknown as Prisma.InputJsonValue,
            isActive: true,
          },
        });
      }
    }
  }

  private defaultTemplateForSport(sportCode: 'FOOTBALL' | 'BASKETBALL'): FeatureLabTemplate {
    if (sportCode === 'FOOTBALL') {
      return {
        name: 'core-football-template',
        version: '1.0.0',
        enabledFeatures: [
          'recentFormScore',
          'homeAwayStrength',
          'avgGoalsFor',
          'avgGoalsAgainst',
          'tableRank',
          'opponentStrengthDiff',
          'restDays',
          'missingPlayersCount',
        ],
        featureGroups: {
          formFeatures: ['recentFormScore', 'homeAwayStrength', 'restDays'],
          scoringFeatures: ['avgGoalsFor', 'avgGoalsAgainst'],
          tableFeatures: ['tableRank', 'opponentStrengthDiff'],
          squadRiskFeatures: ['missingPlayersCount'],
        },
      };
    }

    return {
      name: 'core-basketball-template',
      version: '1.0.0',
      enabledFeatures: [
        'recentFormScore',
        'offensiveRating',
        'defensiveRating',
        'pace',
        'reboundRate',
        'turnoverRate',
        'restDays',
        'homeAdvantageScore',
      ],
      featureGroups: {
        paceFeatures: ['pace', 'homeAdvantageScore'],
        efficiencyFeatures: ['offensiveRating', 'defensiveRating'],
        reboundTurnoverFeatures: ['reboundRate', 'turnoverRate'],
        restFeatures: ['restDays', 'recentFormScore'],
      },
    };
  }

  private toExperimentView(item: {
    id: string;
    featureSetId: string;
    modelVersionId: string;
    sport: string;
    leagueId: string | null;
    predictionType: string;
    fromDate: Date;
    toDate: Date;
    status: string;
    sampleSize: number;
    metrics: Prisma.JsonValue;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      featureSetId: item.featureSetId,
      modelVersionId: item.modelVersionId,
      sport: String(item.sport || '').toLowerCase(),
      leagueId: item.leagueId,
      predictionType: item.predictionType,
      fromDate: item.fromDate.toISOString(),
      toDate: item.toDate.toISOString(),
      status: item.status,
      sampleSize: item.sampleSize,
      metrics: item.metrics,
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const normalizeStringArray = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter((item) => item.length > 0);
};

const toNumberMap = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, raw]) => {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      acc[key] = numeric;
    }
    return acc;
  }, {});
};

const normalizeProbabilities = (value: Record<string, unknown>) => {
  const homeWin = clamp01(Number(value.homeWin || 0));
  const draw = clamp01(Number(value.draw || 0));
  const awayWin = clamp01(Number(value.awayWin || 0));
  const total = homeWin + draw + awayWin;

  if (!total) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: Number((homeWin / total).toFixed(4)),
    draw: Number((draw / total).toFixed(4)),
    awayWin: Number((awayWin / total).toFixed(4)),
  };
};

const topOutcome = (probabilities: { homeWin: number; draw: number; awayWin: number }) => {
  if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) {
    return 'homeWin' as const;
  }
  if (probabilities.awayWin >= probabilities.draw) {
    return 'awayWin' as const;
  }
  return 'draw' as const;
};

const actualOutcome = (homeScore: number, awayScore: number, sport: string) => {
  if (homeScore > awayScore) return 'homeWin' as const;
  if (homeScore < awayScore) return 'awayWin' as const;
  return sport === 'basketball' ? ('awayWin' as const) : ('draw' as const);
};

const probForOutcome = (
  probabilities: { homeWin: number; draw: number; awayWin: number },
  outcome: 'homeWin' | 'draw' | 'awayWin',
) => {
  if (outcome === 'homeWin') return probabilities.homeWin;
  if (outcome === 'awayWin') return probabilities.awayWin;
  return probabilities.draw;
};

const toOutcomeVector = (outcome: 'homeWin' | 'draw' | 'awayWin'): [number, number, number] => {
  if (outcome === 'homeWin') return [1, 0, 0];
  if (outcome === 'awayWin') return [0, 0, 1];
  return [0, 1, 0];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
