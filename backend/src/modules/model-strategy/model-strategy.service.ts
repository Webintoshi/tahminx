import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { AutoSelectStrategiesDto } from './dto/auto-select-strategies.dto';
import { StrategyListQueryDto } from './dto/strategy-list-query.dto';
import { UpdateEnsembleConfigDto } from './dto/update-ensemble-config.dto';
import { UpdateModelStrategyDto } from './dto/update-model-strategy.dto';

export interface EnsembleMember {
  model: 'elo' | 'poisson' | 'logistic' | 'teamRating' | 'paceModel';
  weight: number;
}

export interface EnsembleConfig {
  method: 'weightedAverage';
  members: EnsembleMember[];
}

export interface ResolvedStrategy {
  id: string | null;
  sport: 'FOOTBALL' | 'BASKETBALL';
  leagueId: string | null;
  predictionType: string;
  primaryModelVersionId: string;
  fallbackModelVersionId: string | null;
  calibrationProfileId: string | null;
  ensembleConfig: EnsembleConfig;
  source: 'strategy' | 'default';
}

@Injectable()
export class ModelStrategyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: StrategyListQueryDto) {
    const where: Prisma.ModelStrategyWhereInput = {
      ...(query.sport ? { sport: query.sport.toUpperCase() } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(query.predictionType ? { predictionType: query.predictionType } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.modelStrategy.findMany({
        where,
        include: {
          league: true,
          primaryModelVersion: true,
          fallbackModelVersion: true,
          calibrationProfile: true,
        },
        orderBy: [{ sport: 'asc' }, { leagueId: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.modelStrategy.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toStrategyView(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async resolveForMatch(input: {
    sportCode: 'FOOTBALL' | 'BASKETBALL';
    sportId: string;
    leagueId: string;
    predictionType: string;
    explicitModelVersionId?: string;
  }): Promise<ResolvedStrategy> {
    if (input.explicitModelVersionId) {
      const explicit = await this.prisma.modelVersion.findUnique({ where: { id: input.explicitModelVersionId } });
      if (!explicit || explicit.deletedAt) {
        throw new NotFoundException('Model version not found for explicit selection');
      }

      return {
        id: null,
        sport: input.sportCode,
        leagueId: input.leagueId,
        predictionType: input.predictionType,
        primaryModelVersionId: explicit.id,
        fallbackModelVersionId: null,
        calibrationProfileId: null,
        ensembleConfig: this.defaultEnsemble(input.sportCode),
        source: 'default',
      };
    }

    const leagueStrategy = await this.prisma.modelStrategy.findFirst({
      where: {
        isActive: true,
        sport: input.sportCode,
        predictionType: input.predictionType,
        leagueId: input.leagueId,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (leagueStrategy) {
      return {
        id: leagueStrategy.id,
        sport: input.sportCode,
        leagueId: leagueStrategy.leagueId,
        predictionType: leagueStrategy.predictionType,
        primaryModelVersionId: leagueStrategy.primaryModelVersionId,
        fallbackModelVersionId: leagueStrategy.fallbackModelVersionId,
        calibrationProfileId: leagueStrategy.calibrationProfileId,
        ensembleConfig: this.normalizeEnsembleConfig(leagueStrategy.ensembleConfig, input.sportCode),
        source: 'strategy',
      };
    }

    const sportStrategy = await this.prisma.modelStrategy.findFirst({
      where: {
        isActive: true,
        sport: input.sportCode,
        predictionType: input.predictionType,
        leagueId: null,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (sportStrategy) {
      return {
        id: sportStrategy.id,
        sport: input.sportCode,
        leagueId: sportStrategy.leagueId,
        predictionType: sportStrategy.predictionType,
        primaryModelVersionId: sportStrategy.primaryModelVersionId,
        fallbackModelVersionId: sportStrategy.fallbackModelVersionId,
        calibrationProfileId: sportStrategy.calibrationProfileId,
        ensembleConfig: this.normalizeEnsembleConfig(sportStrategy.ensembleConfig, input.sportCode),
        source: 'strategy',
      };
    }

    const fallback = await this.ensureDefaultPrimaryModel(input.sportId, input.sportCode);

    return {
      id: null,
      sport: input.sportCode,
      leagueId: input.leagueId,
      predictionType: input.predictionType,
      primaryModelVersionId: fallback.id,
      fallbackModelVersionId: null,
      calibrationProfileId: null,
      ensembleConfig: this.defaultEnsemble(input.sportCode),
      source: 'default',
    };
  }

  async autoSelect(dto: AutoSelectStrategiesDto, actorUserId?: string) {
    const lookbackFrom = daysAgo(dto.lookbackDays);

    const rows = await this.prisma.prediction.findMany({
      where: {
        status: 'PUBLISHED',
        match: {
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null },
          matchDate: { gte: lookbackFrom },
          ...(dto.sport ? { sport: { code: dto.sport.toUpperCase() as never } } : {}),
        },
      },
      include: {
        modelVersion: true,
        match: {
          include: {
            sport: true,
            league: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12000,
    });

    const grouped = new Map<string, Array<typeof rows[number]>>();

    for (const row of rows) {
      const sport = String(row.match.sport.code || '').toUpperCase();
      const key = `${sport}:${row.match.leagueId || 'none'}:${dto.predictionType}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    }

    const updates: Array<{
      strategyId: string;
      sport: string;
      leagueId: string | null;
      predictionType: string;
      primaryModelVersionId: string;
      fallbackModelVersionId: string | null;
      sampleSize: number;
      switched: boolean;
    }> = [];

    for (const [key, bucket] of grouped.entries()) {
      const [sport, leagueIdRaw, predictionType] = key.split(':');
      const leagueId = leagueIdRaw === 'none' ? null : leagueIdRaw;

      const byModel = new Map<string, Array<typeof rows[number]>>();
      for (const item of bucket) {
        if (!byModel.has(item.modelVersionId)) {
          byModel.set(item.modelVersionId, []);
        }
        byModel.get(item.modelVersionId)!.push(item);
      }

      const candidates = (
        await Promise.all(
          [...byModel.entries()].map(async ([modelVersionId, predictions]) => {
            const metrics = this.computeCandidateMetrics(predictions);
            const model = predictions[0].modelVersion;
            const historicalBoost = await this.historicalBoost(modelVersionId, sport, leagueId);
            const compositeScore = this.compositeScore(metrics, historicalBoost);
            return {
              modelVersionId,
              modelKey: model.key,
              metrics,
              historicalBoost,
              compositeScore,
            };
          }),
        )
      )
        .sort((a, b) => b.compositeScore - a.compositeScore);

      if (!candidates.length) {
        continue;
      }

      const winner = candidates[0];
      const runnerUp = candidates[1] || null;

      const existing = await this.prisma.modelStrategy.findFirst({
        where: {
          sport,
          leagueId,
          predictionType,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const canSwitch = winner.metrics.sampleSize >= dto.minSampleSize;
      const preserveExisting =
        !!existing &&
        !canSwitch &&
        existing.primaryModelVersionId !== winner.modelVersionId;

      const primaryModelVersionId = preserveExisting ? existing!.primaryModelVersionId : winner.modelVersionId;
      const fallbackModelVersionId = runnerUp?.metrics.sampleSize && runnerUp.metrics.sampleSize >= Math.max(20, Math.floor(dto.minSampleSize / 2))
        ? runnerUp.modelVersionId
        : null;

      const tunedEnsemble = this.tuneEnsembleFromCandidates(sport as 'FOOTBALL' | 'BASKETBALL', candidates);

      const persisted = await this.upsertStrategyScope({
        existingId: existing?.id,
        sport,
        leagueId,
        predictionType,
        primaryModelVersionId,
        fallbackModelVersionId,
        ensembleConfig: tunedEnsemble as unknown as Prisma.InputJsonValue,
        calibrationProfileId: await this.resolveCalibrationProfile(primaryModelVersionId, sport, predictionType),
        isActive: true,
      });

      updates.push({
        strategyId: persisted.id,
        sport,
        leagueId,
        predictionType,
        primaryModelVersionId,
        fallbackModelVersionId,
        sampleSize: winner.metrics.sampleSize,
        switched: !existing || existing.primaryModelVersionId !== primaryModelVersionId,
      });

      await this.prisma.auditLog.create({
        data: {
          userId: actorUserId || null,
          action: 'strategy-auto-select',
          targetType: 'model-strategy',
          targetId: persisted.id,
          payload: {
            sport,
            leagueId,
            predictionType,
            selectedModelVersionId: primaryModelVersionId,
            fallbackModelVersionId,
            candidateCount: candidates.length,
            minSampleSize: dto.minSampleSize,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return {
      data: updates,
      meta: {
        total: updates.length,
        lookedBackDays: dto.lookbackDays,
        minSampleSize: dto.minSampleSize,
      },
    };
  }

  async updateStrategy(id: string, dto: UpdateModelStrategyDto) {
    const strategy = await this.prisma.modelStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    const updated = await this.prisma.modelStrategy.update({
      where: { id },
      data: {
        ...(dto.primaryModelVersionId ? { primaryModelVersionId: dto.primaryModelVersionId } : {}),
        ...(dto.fallbackModelVersionId !== undefined ? { fallbackModelVersionId: dto.fallbackModelVersionId } : {}),
        ...(dto.calibrationProfileId !== undefined ? { calibrationProfileId: dto.calibrationProfileId } : {}),
        ...(dto.ensembleConfig ? { ensembleConfig: dto.ensembleConfig as Prisma.InputJsonValue } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        league: true,
        primaryModelVersion: true,
        fallbackModelVersion: true,
        calibrationProfile: true,
      },
    });

    return { data: this.toStrategyView(updated), meta: null };
  }

  async listEnsembleConfigs() {
    const items = await this.prisma.modelStrategy.findMany({
      where: { isActive: true },
      include: {
        league: true,
        primaryModelVersion: true,
      },
      orderBy: [{ sport: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      data: items.map((item) => ({
        id: item.id,
        sport: String(item.sport || '').toLowerCase(),
        league: item.league
          ? {
              id: item.league.id,
              name: item.league.name,
            }
          : null,
        predictionType: item.predictionType,
        primaryModelVersionId: item.primaryModelVersionId,
        primaryModel: {
          key: item.primaryModelVersion.key,
          name: item.primaryModelVersion.name,
        },
        ensembleConfig: this.normalizeEnsembleConfig(item.ensembleConfig, item.sport as 'FOOTBALL' | 'BASKETBALL'),
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: null,
    };
  }

  async updateEnsembleConfig(id: string, dto: UpdateEnsembleConfigDto) {
    const strategy = await this.prisma.modelStrategy.findUnique({ where: { id } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    const normalized = this.normalizeEnsembleConfig(dto.ensembleConfig, strategy.sport as 'FOOTBALL' | 'BASKETBALL');

    const updated = await this.prisma.modelStrategy.update({
      where: { id },
      data: {
        ensembleConfig: normalized as unknown as Prisma.InputJsonValue,
      },
      include: {
        league: true,
      },
    });

    return {
      data: {
        id: updated.id,
        sport: String(updated.sport || '').toLowerCase(),
        leagueId: updated.leagueId,
        predictionType: updated.predictionType,
        ensembleConfig: normalized,
        updatedAt: updated.updatedAt.toISOString(),
      },
      meta: null,
    };
  }

  async analyticsSummary() {
    const [activeStrategies, perLeagueStrategies, totalPredictions, strategyBoundPredictions] = await Promise.all([
      this.prisma.modelStrategy.findMany({ where: { isActive: true }, include: { league: true, primaryModelVersion: true } }),
      this.prisma.modelStrategy.findMany({ where: { isActive: true, leagueId: { not: null } }, include: { league: true, primaryModelVersion: true } }),
      this.prisma.prediction.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.prediction.count({ where: { status: 'PUBLISHED', modelStrategyId: { not: null } } }),
    ]);

    const activeStrategySummary = {
      total: activeStrategies.length,
      football: activeStrategies.filter((item) => item.sport === 'FOOTBALL').length,
      basketball: activeStrategies.filter((item) => item.sport === 'BASKETBALL').length,
    };

    const bestModelPerLeague = perLeagueStrategies.map((item) => ({
      leagueId: item.leagueId,
      leagueName: item.league?.name || null,
      sport: String(item.sport || '').toLowerCase(),
      predictionType: item.predictionType,
      modelVersionId: item.primaryModelVersionId,
      modelKey: item.primaryModelVersion.key,
      modelName: item.primaryModelVersion.name,
    }));

    const ensembleUsageRate = totalPredictions ? Number((strategyBoundPredictions / totalPredictions).toFixed(4)) : 0;

    return {
      activeStrategySummary,
      bestModelPerLeague,
      ensembleUsageRate,
      strategyBoundPredictions,
      ensemblePredictions: strategyBoundPredictions,
    };
  }

  private async ensureDefaultPrimaryModel(sportId: string, sportCode: 'FOOTBALL' | 'BASKETBALL') {
    const existing = await this.prisma.modelVersion.findFirst({
      where: {
        deletedAt: null,
        status: { in: ['active', 'ACTIVE'] },
        OR: [{ sportId }, { sportId: null }],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.modelVersion.create({
      data: {
        sportId,
        key: `auto-${sportCode.toLowerCase()}-strategy-v1`,
        name: `${sportCode} Strategy Auto`,
        version: '1.0.0',
        status: 'active',
        metadata: {
          source: 'auto-strategy',
        },
      },
    });
  }

  private async upsertStrategyScope(input: {
    existingId?: string;
    sport: string;
    leagueId: string | null;
    predictionType: string;
    primaryModelVersionId: string;
    fallbackModelVersionId: string | null;
    ensembleConfig: Prisma.InputJsonValue;
    calibrationProfileId: string | null;
    isActive: boolean;
  }) {
    if (input.existingId) {
      return this.prisma.modelStrategy.update({
        where: { id: input.existingId },
        data: {
          primaryModelVersionId: input.primaryModelVersionId,
          fallbackModelVersionId: input.fallbackModelVersionId,
          ensembleConfig: input.ensembleConfig,
          calibrationProfileId: input.calibrationProfileId,
          isActive: input.isActive,
        },
      });
    }

    const existing = await this.prisma.modelStrategy.findFirst({
      where: {
        sport: input.sport,
        leagueId: input.leagueId,
        predictionType: input.predictionType,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return this.prisma.modelStrategy.update({
        where: { id: existing.id },
        data: {
          primaryModelVersionId: input.primaryModelVersionId,
          fallbackModelVersionId: input.fallbackModelVersionId,
          ensembleConfig: input.ensembleConfig,
          calibrationProfileId: input.calibrationProfileId,
          isActive: input.isActive,
        },
      });
    }

    return this.prisma.modelStrategy.create({
      data: {
        sport: input.sport,
        leagueId: input.leagueId,
        predictionType: input.predictionType,
        primaryModelVersionId: input.primaryModelVersionId,
        fallbackModelVersionId: input.fallbackModelVersionId,
        ensembleConfig: input.ensembleConfig,
        calibrationProfileId: input.calibrationProfileId,
        isActive: input.isActive,
      },
    });
  }

  private async resolveCalibrationProfile(modelVersionId: string, sport: string, predictionType: string) {
    const profile = await this.prisma.predictionCalibration.findFirst({
      where: {
        modelVersionId,
        sport,
        predictionType: predictionType === 'matchOutcome' ? 'matchOutcome1x2' : predictionType,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    return profile?.id || null;
  }

  private computeCandidateMetrics(predictions: Array<{
    confidenceScore: number;
    probabilities: Prisma.JsonValue;
    match: { homeScore: number | null; awayScore: number | null; sport: { code: string } };
  }>) {
    const rows = predictions.map((prediction) => {
      const probabilities = this.normalizeProbabilities(prediction.probabilities);
      const actualOutcome = this.actualOutcome(
        Number(prediction.match.homeScore || 0),
        Number(prediction.match.awayScore || 0),
        prediction.match.sport.code,
      );
      const predictedOutcome = this.predictedOutcome(probabilities);
      return {
        probabilities,
        confidenceScore: Number(prediction.confidenceScore || 0),
        actualOutcome,
        isCorrect: predictedOutcome === actualOutcome,
      };
    });

    const sampleSize = rows.length;
    const accuracy = sampleSize ? rows.filter((item) => item.isCorrect).length / sampleSize : 0;
    const avgConfidenceScore = sampleSize
      ? rows.reduce((sum, item) => sum + item.confidenceScore, 0) / sampleSize
      : 0;

    const logLoss = sampleSize
      ? rows.reduce((sum, item) => {
          const actualProb = this.probabilityForOutcome(item.probabilities, item.actualOutcome);
          return sum + -Math.log(Math.max(1e-12, actualProb));
        }, 0) / sampleSize
      : 1;

    const brierScore = sampleSize
      ? rows.reduce((sum, item) => {
          const vectorActual = this.outcomeVector(item.actualOutcome);
          const vectorPred = [item.probabilities.homeWin, item.probabilities.draw, item.probabilities.awayWin];
          return (
            sum +
            ((vectorPred[0] - vectorActual[0]) ** 2 +
              (vectorPred[1] - vectorActual[1]) ** 2 +
              (vectorPred[2] - vectorActual[2]) ** 2) /
              3
          );
        }, 0) / sampleSize
      : 1;

    const ece = this.computeEce(
      rows.map((item) => ({
        p: clamp01(item.confidenceScore / 100),
        y: item.isCorrect ? 1 : 0,
      })),
    );

    return {
      accuracy: Number(accuracy.toFixed(4)),
      logLoss: Number(logLoss.toFixed(4)),
      brierScore: Number(brierScore.toFixed(4)),
      avgConfidenceScore: Number(avgConfidenceScore.toFixed(2)),
      calibrationQuality: Number((1 - ece).toFixed(4)),
      sampleSize,
    };
  }

  private compositeScore(
    metrics: {
      accuracy: number;
      logLoss: number;
      brierScore: number;
      calibrationQuality: number;
      sampleSize: number;
    },
    historicalBoost: {
      backtestAccuracy: number;
      backtestCalibration: number;
      comparisonScore: number;
    },
  ) {
    const sampleFactor = Math.min(1, metrics.sampleSize / 250);
    const inverseLogLoss = Math.max(0, 1 - metrics.logLoss);
    const inverseBrier = Math.max(0, 1 - metrics.brierScore);
    const historical =
      historicalBoost.backtestAccuracy * 0.5 +
      historicalBoost.backtestCalibration * 0.3 +
      historicalBoost.comparisonScore * 0.2;

    return Number(
      (
        metrics.accuracy * 0.4 +
        metrics.calibrationQuality * 0.22 +
        inverseLogLoss * 0.13 +
        inverseBrier * 0.1 +
        sampleFactor * 0.05 +
        historical * 0.1
      ).toFixed(6),
    );
  }

  private async historicalBoost(modelVersionId: string, sport: string, leagueId: string | null) {
    const [latestBacktest, latestComparison] = await Promise.all([
      this.prisma.backtestResult.findFirst({
        where: {
          modelVersionId,
          ...(leagueId ? { leagueId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          accuracy: true,
          calibrationCurve: true,
        },
      }),
      this.prisma.modelComparisonSnapshot.findFirst({
        where: {
          modelVersionId,
          sport,
          ...(leagueId ? { leagueId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          accuracy: true,
          calibrationQuality: true,
        },
      }),
    ]);

    const backtestAccuracy = Number(latestBacktest?.accuracy || 0);
    const backtestCalibration = this.extractCalibrationFromCurve(latestBacktest?.calibrationCurve || null);
    const comparisonScore = Number(
      (((latestComparison?.accuracy || 0) + (latestComparison?.calibrationQuality || 0)) / 2).toFixed(4),
    );

    return {
      backtestAccuracy,
      backtestCalibration,
      comparisonScore,
    };
  }

  private extractCalibrationFromCurve(calibrationCurve: Prisma.JsonValue | null) {
    if (!Array.isArray(calibrationCurve)) {
      return 0;
    }

    const rows = calibrationCurve.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>>;
    if (!rows.length) {
      return 0;
    }

    const totalGap = rows.reduce((sum, row) => {
      const avgConfidence = Number(row.avgConfidence || 0);
      const actualAccuracy = Number(row.actualAccuracy || 0);
      return sum + Math.abs(avgConfidence - actualAccuracy);
    }, 0);

    const ece = totalGap / rows.length;
    return Number((1 - Math.min(1, ece)).toFixed(4));
  }

  private _legacyCompositeScore(metrics: {
    accuracy: number;
    logLoss: number;
    brierScore: number;
    calibrationQuality: number;
    sampleSize: number;
  }) {
    const sampleFactor = Math.min(1, metrics.sampleSize / 250);
    const inverseLogLoss = Math.max(0, 1 - metrics.logLoss);
    const inverseBrier = Math.max(0, 1 - metrics.brierScore);

    return Number(
      (
        metrics.accuracy * 0.45 +
        metrics.calibrationQuality * 0.25 +
        inverseLogLoss * 0.15 +
        inverseBrier * 0.1 +
        sampleFactor * 0.05
      ).toFixed(6),
    );
  }

  private tuneEnsembleFromCandidates(
    sport: 'FOOTBALL' | 'BASKETBALL',
    candidates: Array<{ modelKey: string; compositeScore: number }>,
  ): EnsembleConfig {
    const defaults = this.defaultEnsemble(sport);
    const memberScores = new Map<string, number>();

    for (const candidate of candidates) {
      const lower = candidate.modelKey.toLowerCase();
      if (sport === 'FOOTBALL') {
        if (lower.includes('elo')) memberScores.set('elo', (memberScores.get('elo') || 0) + candidate.compositeScore);
        if (lower.includes('poisson')) memberScores.set('poisson', (memberScores.get('poisson') || 0) + candidate.compositeScore);
        if (lower.includes('logistic')) memberScores.set('logistic', (memberScores.get('logistic') || 0) + candidate.compositeScore);
      } else {
        if (lower.includes('rating')) memberScores.set('teamRating', (memberScores.get('teamRating') || 0) + candidate.compositeScore);
        if (lower.includes('pace')) memberScores.set('paceModel', (memberScores.get('paceModel') || 0) + candidate.compositeScore);
      }
    }

    const members = defaults.members.map((member) => ({
      model: member.model,
      weight: memberScores.get(member.model) || member.weight,
    }));

    const total = members.reduce((sum, member) => sum + Math.max(0, member.weight), 0);
    const normalized = members.map((member) => ({
      model: member.model,
      weight: Number(((Math.max(0, member.weight) / (total || 1))).toFixed(4)),
    })) as EnsembleMember[];

    return {
      method: 'weightedAverage',
      members: normalized,
    };
  }

  private defaultEnsemble(sport: 'FOOTBALL' | 'BASKETBALL'): EnsembleConfig {
    if (sport === 'FOOTBALL') {
      return {
        method: 'weightedAverage',
        members: [
          { model: 'elo', weight: 0.5 },
          { model: 'poisson', weight: 0.35 },
          { model: 'logistic', weight: 0.15 },
        ],
      };
    }

    return {
      method: 'weightedAverage',
      members: [
        { model: 'teamRating', weight: 0.62 },
        { model: 'paceModel', weight: 0.38 },
      ],
    };
  }

  private normalizeEnsembleConfig(raw: unknown, sport: 'FOOTBALL' | 'BASKETBALL'): EnsembleConfig {
    const defaults = this.defaultEnsemble(sport);

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return defaults;
    }

    const value = raw as Record<string, unknown>;
    const membersRaw = Array.isArray(value.members) ? value.members : [];

    const supportedModels = new Set(defaults.members.map((member) => member.model));
    const members = membersRaw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const model = String((entry as Record<string, unknown>).model || '');
        const weight = Number((entry as Record<string, unknown>).weight || 0);
        if (!supportedModels.has(model as EnsembleMember['model'])) {
          return null;
        }
        if (!Number.isFinite(weight) || weight <= 0) {
          return null;
        }
        return {
          model: model as EnsembleMember['model'],
          weight,
        };
      })
      .filter((item): item is EnsembleMember => Boolean(item));

    if (!members.length) {
      return defaults;
    }

    const total = members.reduce((sum, item) => sum + item.weight, 0);

    return {
      method: 'weightedAverage',
      members: members.map((item) => ({
        model: item.model,
        weight: Number((item.weight / (total || 1)).toFixed(4)),
      })),
    };
  }

  private toStrategyView(item: any) {
    return {
      id: item.id,
      sport: String(item.sport || '').toLowerCase(),
      league: item.league
        ? {
            id: item.league.id,
            name: item.league.name,
          }
        : null,
      predictionType: item.predictionType,
      primaryModelVersionId: item.primaryModelVersionId,
      primaryModel: item.primaryModelVersion
        ? {
            key: item.primaryModelVersion.key,
            name: item.primaryModelVersion.name,
            version: item.primaryModelVersion.version,
          }
        : null,
      fallbackModelVersionId: item.fallbackModelVersionId,
      fallbackModel: item.fallbackModelVersion
        ? {
            key: item.fallbackModelVersion.key,
            name: item.fallbackModelVersion.name,
            version: item.fallbackModelVersion.version,
          }
        : null,
      ensembleConfig: this.normalizeEnsembleConfig(item.ensembleConfig, item.sport as 'FOOTBALL' | 'BASKETBALL'),
      calibrationProfileId: item.calibrationProfileId,
      calibrationProfile: item.calibrationProfile
        ? {
            id: item.calibrationProfile.id,
            sport: item.calibrationProfile.sport,
            predictionType: item.calibrationProfile.predictionType,
            calibrationMethod: item.calibrationProfile.calibrationMethod,
          }
        : null,
      isActive: item.isActive,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private normalizeProbabilities(value: Prisma.JsonValue): { homeWin: number; draw: number; awayWin: number } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
    }

    const homeWin = clamp01(Number((value as Record<string, unknown>).homeWin || 0));
    const draw = clamp01(Number((value as Record<string, unknown>).draw || 0));
    const awayWin = clamp01(Number((value as Record<string, unknown>).awayWin || 0));
    const total = homeWin + draw + awayWin;

    if (!total) {
      return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
    }

    return {
      homeWin: Number((homeWin / total).toFixed(4)),
      draw: Number((draw / total).toFixed(4)),
      awayWin: Number((awayWin / total).toFixed(4)),
    };
  }

  private predictedOutcome(probabilities: { homeWin: number; draw: number; awayWin: number }) {
    if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) {
      return 'homeWin' as const;
    }
    if (probabilities.awayWin >= probabilities.draw) {
      return 'awayWin' as const;
    }
    return 'draw' as const;
  }

  private actualOutcome(homeScore: number, awayScore: number, sportCode: string) {
    if (homeScore > awayScore) return 'homeWin' as const;
    if (homeScore < awayScore) return 'awayWin' as const;
    return String(sportCode || '').toUpperCase() === 'BASKETBALL' ? ('awayWin' as const) : ('draw' as const);
  }

  private probabilityForOutcome(
    probabilities: { homeWin: number; draw: number; awayWin: number },
    outcome: 'homeWin' | 'draw' | 'awayWin',
  ) {
    if (outcome === 'homeWin') return probabilities.homeWin;
    if (outcome === 'awayWin') return probabilities.awayWin;
    return probabilities.draw;
  }

  private outcomeVector(outcome: 'homeWin' | 'draw' | 'awayWin'): [number, number, number] {
    if (outcome === 'homeWin') return [1, 0, 0];
    if (outcome === 'awayWin') return [0, 0, 1];
    return [0, 1, 0];
  }

  private computeEce(samples: Array<{ p: number; y: number }>) {
    if (!samples.length) {
      return 0;
    }

    const bins = Array.from({ length: 10 }, () => ({ count: 0, pSum: 0, ySum: 0 }));
    for (const sample of samples) {
      const idx = Math.min(9, Math.floor(clamp01(sample.p) * 10));
      bins[idx].count += 1;
      bins[idx].pSum += sample.p;
      bins[idx].ySum += sample.y;
    }

    return bins.reduce((sum, bin) => {
      if (!bin.count) return sum;
      const conf = bin.pSum / bin.count;
      const acc = bin.ySum / bin.count;
      return sum + (bin.count / samples.length) * Math.abs(conf - acc);
    }, 0);
  }
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
