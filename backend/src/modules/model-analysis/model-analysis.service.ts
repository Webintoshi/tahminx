import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PredictionStatus } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { DriftSummaryQueryDto } from './dto/drift-summary-query.dto';
import { FailedPredictionQueryDto } from './dto/failed-prediction-query.dto';
import { FeatureImportanceQueryDto } from './dto/feature-importance-query.dto';
import { ModelComparisonQueryDto } from './dto/model-comparison-query.dto';
import { PerformanceTimeseriesQueryDto } from './dto/performance-timeseries-query.dto';

interface EvaluatedPredictionRow {
  predictionId: string;
  modelVersionId: string;
  modelKey: string;
  modelName: string;
  sport: string;
  leagueId: string | null;
  leagueName: string | null;
  matchId: string;
  matchDate: Date;
  confidenceScore: number;
  probabilities: { homeWin: number; draw: number; awayWin: number };
  predictedOutcome: 'homeWin' | 'draw' | 'awayWin';
  actualOutcome: 'homeWin' | 'draw' | 'awayWin';
  isCorrect: boolean;
  riskFlags: string[];
  featureMap: Record<string, number>;
}

interface MetricsSummary {
  accuracy: number;
  logLoss: number;
  brierScore: number;
  avgConfidenceScore: number;
  calibrationQuality: number;
  sampleSize: number;
}

@Injectable()
export class ModelAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async modelComparison(query: ModelComparisonQueryDto) {
    const rows = await this.loadEvaluatedPredictions(query);
    const scopeKey = query.leagueId || 'all';
    const grouped = this.groupByModel(rows, scopeKey);

    const items = grouped
      .map((group) => ({
        modelVersionId: group.modelVersionId,
        modelKey: group.modelKey,
        modelName: group.modelName,
        sport: group.sport,
        leagueId: query.leagueId || null,
        ...this.computeMetrics(group.rows),
      }))
      .sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.sampleSize - a.sampleSize;
      });

    const paged = paginate(items, query.page, query.pageSize);

    if (items.length) {
      await this.prisma.modelComparisonSnapshot.createMany({
        data: items.map((item) => ({
          modelVersionId: item.modelVersionId,
          sport: item.sport.toUpperCase(),
          leagueId: item.leagueId,
          scopeKey,
          fromDate: parseDateOrDefault(query.from, daysAgo(30)),
          toDate: parseDateOrDefault(query.to, new Date()),
          accuracy: item.accuracy,
          logLoss: item.logLoss,
          brierScore: item.brierScore,
          avgConfidenceScore: item.avgConfidenceScore,
          calibrationQuality: item.calibrationQuality,
          sampleSize: item.sampleSize,
          metadata: {
            modelKey: item.modelKey,
            modelName: item.modelName,
          } as Prisma.InputJsonValue,
        })),
      });
    }

    return {
      data: paged.items,
      meta: buildPaginationMeta(query.page, query.pageSize, items.length),
    };
  }

  async performanceTimeseries(query: PerformanceTimeseriesQueryDto) {
    const toDate = new Date();
    const fromDate = daysAgo(Math.max(7, query.days));
    const rows = await this.loadEvaluatedPredictions({
      modelVersionId: query.modelVersionId,
      sport: query.sport,
      leagueId: query.leagueId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      page: 1,
      pageSize: 5000,
    });

    const scopeKey = query.leagueId || 'all';
    const buckets = new Map<string, EvaluatedPredictionRow[]>();

    for (const row of rows) {
      const dateKey = toDateKey(row.matchDate);
      const key = `${row.modelVersionId}:${row.sport}:${scopeKey}:${dateKey}`;
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key)!.push(row);
    }

    const points = [...buckets.entries()]
      .map(([key, bucketRows]) => {
        const [modelVersionId, sport, _scope, dateKey] = key.split(':');
        const metrics = this.computeMetrics(bucketRows);
        const representative = bucketRows[0];

        return {
          modelVersionId,
          modelKey: representative.modelKey,
          modelName: representative.modelName,
          sport,
          leagueId: query.leagueId || null,
          scopeKey,
          date: new Date(`${dateKey}T00:00:00.000Z`),
          ...metrics,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    await Promise.all(
      points.map((point) =>
        this.prisma.modelPerformanceTimeseries.upsert({
          where: {
            modelVersionId_sport_scopeKey_date: {
              modelVersionId: point.modelVersionId,
              sport: point.sport.toUpperCase(),
              scopeKey: point.scopeKey,
              date: point.date,
            },
          },
          create: {
            modelVersionId: point.modelVersionId,
            sport: point.sport.toUpperCase(),
            leagueId: point.leagueId,
            scopeKey: point.scopeKey,
            date: point.date,
            accuracy: point.accuracy,
            logLoss: point.logLoss,
            brierScore: point.brierScore,
            avgConfidenceScore: point.avgConfidenceScore,
            calibrationQuality: point.calibrationQuality,
            sampleSize: point.sampleSize,
          },
          update: {
            leagueId: point.leagueId,
            accuracy: point.accuracy,
            logLoss: point.logLoss,
            brierScore: point.brierScore,
            avgConfidenceScore: point.avgConfidenceScore,
            calibrationQuality: point.calibrationQuality,
            sampleSize: point.sampleSize,
          },
        }),
      ),
    );

    return {
      data: points.map((point) => ({
        ...point,
        date: point.date.toISOString(),
      })),
      meta: null,
    };
  }

  async featureImportance(query: FeatureImportanceQueryDto) {
    const fromDate = daysAgo(query.lookbackDays);

    const predictions = await this.prisma.prediction.findMany({
      where: {
        status: PredictionStatus.PUBLISHED,
        ...(query.modelVersionId ? { modelVersionId: query.modelVersionId } : {}),
        match: {
          ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
          ...(fromDate ? { matchDate: { gte: fromDate } } : {}),
        },
      },
      include: {
        explanation: true,
        modelVersion: true,
        match: { include: { sport: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const aggregates = new Map<string, { modelVersionId: string; sport: string; featureName: string; total: number; count: number }>();

    for (const prediction of predictions) {
      const explanation = (prediction.explanation?.explanation || null) as Record<string, unknown> | null;
      const features = toFeatureMap(explanation?.features);
      const sport = String(prediction.match.sport.code || '').toLowerCase();

      for (const [featureName, value] of Object.entries(features)) {
        const key = `${prediction.modelVersionId}:${sport}:${featureName}`;
        if (!aggregates.has(key)) {
          aggregates.set(key, {
            modelVersionId: prediction.modelVersionId,
            sport,
            featureName,
            total: 0,
            count: 0,
          });
        }

        const current = aggregates.get(key)!;
        current.total += Math.abs(value);
        current.count += 1;
      }
    }

    const byModelSport = new Map<string, Array<{ modelVersionId: string; sport: string; featureName: string; rawScore: number; sampleSize: number }>>();

    for (const value of aggregates.values()) {
      const entry = {
        modelVersionId: value.modelVersionId,
        sport: value.sport,
        featureName: value.featureName,
        rawScore: value.total / Math.max(1, value.count),
        sampleSize: value.count,
      };
      const key = `${value.modelVersionId}:${value.sport}`;
      if (!byModelSport.has(key)) {
        byModelSport.set(key, []);
      }
      byModelSport.get(key)!.push(entry);
    }

    const output: Array<{
      modelVersionId: string;
      modelKey: string;
      modelName: string;
      sport: string;
      featureName: string;
      importanceScore: number;
      sampleSize: number;
      updatedAt: string;
    }> = [];

    for (const [key, rows] of byModelSport.entries()) {
      const [modelVersionId, sport] = key.split(':');
      const model = predictions.find((item) => item.modelVersionId === modelVersionId)?.modelVersion;
      const maxRaw = Math.max(...rows.map((item) => item.rawScore), 1e-6);

      const normalized = rows
        .map((item) => ({
          ...item,
          importanceScore: Number((item.rawScore / maxRaw).toFixed(4)),
        }))
        .sort((a, b) => b.importanceScore - a.importanceScore)
        .slice(0, query.limit);

      for (const row of normalized) {
        await this.prisma.featureImportanceSnapshot.upsert({
          where: {
            modelVersionId_sport_featureName_scopeKey: {
              modelVersionId: row.modelVersionId,
              sport: row.sport.toUpperCase(),
              featureName: row.featureName,
              scopeKey: 'all',
            },
          },
          create: {
            modelVersionId: row.modelVersionId,
            sport: row.sport.toUpperCase(),
            featureName: row.featureName,
            importanceScore: row.importanceScore,
            sampleSize: row.sampleSize,
            scopeKey: 'all',
            metadata: {
              source: 'prediction-explanations',
              lookbackDays: query.lookbackDays,
            } as Prisma.InputJsonValue,
          },
          update: {
            importanceScore: row.importanceScore,
            sampleSize: row.sampleSize,
            metadata: {
              source: 'prediction-explanations',
              lookbackDays: query.lookbackDays,
            } as Prisma.InputJsonValue,
          },
        });

        output.push({
          modelVersionId: row.modelVersionId,
          modelKey: model?.key || 'unknown',
          modelName: model?.name || 'Unknown Model',
          sport,
          featureName: row.featureName,
          importanceScore: row.importanceScore,
          sampleSize: row.sampleSize,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return {
      data: output
        .sort((a, b) => b.importanceScore - a.importanceScore)
        .slice(0, Math.max(1, query.limit * 3)),
      meta: null,
    };
  }

  async failedPredictions(query: FailedPredictionQueryDto) {
    await this.refreshFailedPredictionAnalyses(query);

    const where: Prisma.FailedPredictionAnalysisWhereInput = {
      ...(query.modelVersionId ? { modelVersionId: query.modelVersionId } : {}),
      ...(query.sport ? { sport: query.sport.toUpperCase() } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(query.highConfidenceOnly === 'true' ? { isHighConfidence: true } : {}),
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
      this.prisma.failedPredictionAnalysis.findMany({
        where,
        include: {
          modelVersion: true,
          match: {
            include: {
              league: true,
              sport: true,
              homeTeam: true,
              awayTeam: true,
            },
          },
        },
        orderBy: [{ isHighConfidence: 'desc' }, { confidenceScore: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.failedPredictionAnalysis.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toFailedPredictionCard(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async failedPredictionDetail(id: string) {
    const item = await this.prisma.failedPredictionAnalysis.findUnique({
      where: { id },
      include: {
        modelVersion: true,
        match: {
          include: {
            league: true,
            sport: true,
            homeTeam: true,
            awayTeam: true,
            events: true,
          },
        },
        prediction: {
          include: {
            explanation: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Failed prediction analysis not found');
    }

    return {
      ...this.toFailedPredictionCard(item),
      predictionId: item.predictionId,
      reasons: item.reasonFlags,
      impacts: item.impacts,
      explanation: item.prediction.explanation?.explanation || null,
      events: item.match.events,
    };
  }

  async driftSummary(query: DriftSummaryQueryDto) {
    const now = new Date();
    const recentStart = daysAgo(7);
    const baselineStart = daysAgo(37);
    const baselineEnd = daysAgo(7);

    const [recentRows, baselineRows] = await Promise.all([
      this.loadEvaluatedPredictions({
        modelVersionId: query.modelVersionId,
        sport: query.sport,
        leagueId: query.leagueId,
        from: recentStart.toISOString(),
        to: now.toISOString(),
        page: 1,
        pageSize: 5000,
      }),
      this.loadEvaluatedPredictions({
        modelVersionId: query.modelVersionId,
        sport: query.sport,
        leagueId: query.leagueId,
        from: baselineStart.toISOString(),
        to: baselineEnd.toISOString(),
        page: 1,
        pageSize: 5000,
      }),
    ]);

    const recent = this.computeMetrics(recentRows);
    const baseline = this.computeMetrics(baselineRows);

    const performanceDrop = baseline.sampleSize > 0 ? Number((baseline.accuracy - recent.accuracy).toFixed(4)) : 0;
    const confidenceDrift = Number((recent.avgConfidenceScore - baseline.avgConfidenceScore).toFixed(2));
    const calibrationDrift = Number((baseline.calibrationQuality - recent.calibrationQuality).toFixed(4));

    const byLeagueRecent = this.groupByLeagueMetrics(recentRows);
    const byLeagueBaseline = this.groupByLeagueMetrics(baselineRows);

    const leaguePerformanceDrop = Object.keys({ ...byLeagueRecent, ...byLeagueBaseline })
      .map((leagueId) => {
        const r = byLeagueRecent[leagueId] || this.emptyMetrics();
        const b = byLeagueBaseline[leagueId] || this.emptyMetrics();
        return {
          leagueId,
          recentAccuracy: r.accuracy,
          baselineAccuracy: b.accuracy,
          drop: Number((b.accuracy - r.accuracy).toFixed(4)),
          sampleSizeRecent: r.sampleSize,
          sampleSizeBaseline: b.sampleSize,
        };
      })
      .sort((a, b) => b.drop - a.drop);

    const modelBreakdown = this.groupByModel(recentRows, query.leagueId || 'all').map((group) => {
      const groupRecent = this.computeMetrics(group.rows);
      const baselineGroupRows = baselineRows.filter((item) => item.modelVersionId === group.modelVersionId && item.sport === group.sport);
      const groupBaseline = this.computeMetrics(baselineGroupRows);
      return {
        modelVersionId: group.modelVersionId,
        modelKey: group.modelKey,
        modelName: group.modelName,
        sport: group.sport,
        recentAccuracy: groupRecent.accuracy,
        baselineAccuracy: groupBaseline.accuracy,
        accuracyDrop: Number((groupBaseline.accuracy - groupRecent.accuracy).toFixed(4)),
        recentCalibrationQuality: groupRecent.calibrationQuality,
        baselineCalibrationQuality: groupBaseline.calibrationQuality,
      };
    });

    return {
      data: {
        recentWindow: {
          from: recentStart.toISOString(),
          to: now.toISOString(),
          metrics: recent,
        },
        baselineWindow: {
          from: baselineStart.toISOString(),
          to: baselineEnd.toISOString(),
          metrics: baseline,
        },
        performanceDropDetected: performanceDrop > 0.06,
        confidenceDriftDetected: Math.abs(confidenceDrift) > 5,
        calibrationDriftDetected: calibrationDrift > 0.08,
        driftValues: {
          accuracyDrop: performanceDrop,
          confidenceDrift,
          calibrationDrift,
        },
        leaguePerformanceDrop,
        modelBreakdown,
      },
      meta: null,
    };
  }

  async analyticsInsights() {
    const comparison = await this.modelComparison({ page: 1, pageSize: 50 });
    const drift = await this.driftSummary({});
    const feature = await this.featureImportance({ limit: 5, lookbackDays: 30 });
    const failed = await this.failedPredictions({ page: 1, pageSize: 200, highConfidenceOnly: 'true' });

    const best = comparison.data[0] || null;
    const worst = comparison.data.length ? comparison.data[comparison.data.length - 1] : null;

    return {
      bestPerformingModel: best,
      worstPerformingModel: worst,
      topFeatures: feature.data.slice(0, 10),
      failedHighConfidenceCount: failed.meta?.total || 0,
      performanceDriftSummary: drift.data,
    };
  }

  private async refreshFailedPredictionAnalyses(query: {
    modelVersionId?: string;
    sport?: string;
    leagueId?: string;
    from?: string;
    to?: string;
  }) {
    const rows = await this.loadEvaluatedPredictions({
      ...query,
      page: 1,
      pageSize: 5000,
    });

    const failedRows = rows.filter((item) => !item.isCorrect);

    await Promise.all(
      failedRows.map(async (row) => {
        const analysis = buildFailureAnalysis(row);
        await this.prisma.failedPredictionAnalysis.upsert({
          where: { predictionId: row.predictionId },
          create: {
            predictionId: row.predictionId,
            modelVersionId: row.modelVersionId,
            matchId: row.matchId,
            leagueId: row.leagueId,
            sport: row.sport.toUpperCase(),
            confidenceScore: row.confidenceScore,
            isHighConfidence: row.confidenceScore >= 75,
            predictedOutcome: row.predictedOutcome,
            actualOutcome: row.actualOutcome,
            reasonFlags: analysis.reasonFlags as Prisma.InputJsonValue,
            impacts: analysis.impacts as Prisma.InputJsonValue,
            summary: analysis.summary,
          },
          update: {
            leagueId: row.leagueId,
            sport: row.sport.toUpperCase(),
            confidenceScore: row.confidenceScore,
            isHighConfidence: row.confidenceScore >= 75,
            predictedOutcome: row.predictedOutcome,
            actualOutcome: row.actualOutcome,
            reasonFlags: analysis.reasonFlags as Prisma.InputJsonValue,
            impacts: analysis.impacts as Prisma.InputJsonValue,
            summary: analysis.summary,
          },
        });
      }),
    );
  }

  private async loadEvaluatedPredictions(query: {
    modelVersionId?: string;
    sport?: string;
    leagueId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
  }): Promise<EvaluatedPredictionRow[]> {
    const fromDate = query.from ? new Date(query.from) : daysAgo(30);
    const toDate = query.to ? new Date(query.to) : new Date();

    const rows = await this.prisma.prediction.findMany({
      where: {
        status: PredictionStatus.PUBLISHED,
        ...(query.modelVersionId ? { modelVersionId: query.modelVersionId } : {}),
        match: {
          status: 'COMPLETED',
          homeScore: { not: null },
          awayScore: { not: null },
          matchDate: {
            gte: fromDate,
            lte: toDate,
          },
          ...(query.leagueId ? { leagueId: query.leagueId } : {}),
          ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
        },
      },
      include: {
        modelVersion: true,
        explanation: true,
        match: {
          include: {
            league: true,
            sport: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.max(100, query.pageSize * Math.max(1, query.page)),
    });

    return rows.map((row) => {
      const probs = normalizeProbabilities(row.probabilities);
      const predictedOutcome = resolvePredictedOutcome(probs);
      const actualOutcome = resolveActualOutcome(
        Number(row.match.homeScore ?? 0),
        Number(row.match.awayScore ?? 0),
        String(row.match.sport.code || '').toLowerCase(),
      );

      return {
        predictionId: row.id,
        modelVersionId: row.modelVersionId,
        modelKey: row.modelVersion.key,
        modelName: row.modelVersion.name,
        sport: String(row.match.sport.code || '').toLowerCase(),
        leagueId: row.match.leagueId || null,
        leagueName: row.match.league?.name || null,
        matchId: row.matchId,
        matchDate: row.match.matchDate,
        confidenceScore: Number(row.confidenceScore || 0),
        probabilities: probs,
        predictedOutcome,
        actualOutcome,
        isCorrect: predictedOutcome === actualOutcome,
        riskFlags: Array.isArray(row.riskFlags) ? (row.riskFlags as string[]) : [],
        featureMap: toFeatureMap((row.explanation?.explanation as Record<string, unknown> | null)?.features),
      };
    });
  }

  private groupByModel(rows: EvaluatedPredictionRow[], scopeKey: string) {
    const grouped = new Map<string, { modelVersionId: string; modelKey: string; modelName: string; sport: string; scopeKey: string; rows: EvaluatedPredictionRow[] }>();

    for (const row of rows) {
      const key = `${row.modelVersionId}:${row.sport}:${scopeKey}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          modelVersionId: row.modelVersionId,
          modelKey: row.modelKey,
          modelName: row.modelName,
          sport: row.sport,
          scopeKey,
          rows: [],
        });
      }
      grouped.get(key)!.rows.push(row);
    }

    return [...grouped.values()];
  }

  private groupByLeagueMetrics(rows: EvaluatedPredictionRow[]) {
    const byLeague = new Map<string, EvaluatedPredictionRow[]>();
    for (const row of rows) {
      if (!row.leagueId) {
        continue;
      }
      if (!byLeague.has(row.leagueId)) {
        byLeague.set(row.leagueId, []);
      }
      byLeague.get(row.leagueId)!.push(row);
    }

    return [...byLeague.entries()].reduce<Record<string, MetricsSummary>>((acc, [leagueId, leagueRows]) => {
      acc[leagueId] = this.computeMetrics(leagueRows);
      return acc;
    }, {});
  }

  private computeMetrics(rows: EvaluatedPredictionRow[]): MetricsSummary {
    if (!rows.length) {
      return this.emptyMetrics();
    }

    const accuracy = rows.filter((item) => item.isCorrect).length / rows.length;
    const avgConfidenceScore = rows.reduce((sum, item) => sum + item.confidenceScore, 0) / rows.length;

    const logLoss =
      rows.reduce((sum, item) => {
        const actualProb = probabilityForOutcome(item.probabilities, item.actualOutcome);
        return sum + -Math.log(Math.max(1e-12, actualProb));
      }, 0) / rows.length;

    const brierScore =
      rows.reduce((sum, item) => {
        const vectorActual = outcomeVector(item.actualOutcome);
        const vectorPred = [item.probabilities.homeWin, item.probabilities.draw, item.probabilities.awayWin];
        const rowBrier =
          ((vectorPred[0] - vectorActual[0]) ** 2 +
            (vectorPred[1] - vectorActual[1]) ** 2 +
            (vectorPred[2] - vectorActual[2]) ** 2) /
          3;
        return sum + rowBrier;
      }, 0) / rows.length;

    const ece = computeEce(
      rows.map((item) => ({
        p: clamp01(item.confidenceScore / 100),
        y: item.isCorrect ? 1 : 0,
      })),
    );

    return {
      accuracy: round4(accuracy),
      logLoss: round4(logLoss),
      brierScore: round4(brierScore),
      avgConfidenceScore: round2(avgConfidenceScore),
      calibrationQuality: round4(1 - ece),
      sampleSize: rows.length,
    };
  }

  private emptyMetrics(): MetricsSummary {
    return {
      accuracy: 0,
      logLoss: 0,
      brierScore: 0,
      avgConfidenceScore: 0,
      calibrationQuality: 0,
      sampleSize: 0,
    };
  }

  private toFailedPredictionCard(item: any) {
    return {
      id: item.id,
      matchId: item.matchId,
      predictionId: item.predictionId,
      modelVersionId: item.modelVersionId,
      modelKey: item.modelVersion.key,
      modelName: item.modelVersion.name,
      sport: String(item.sport || '').toLowerCase(),
      league: item.match?.league
        ? {
            id: item.match.league.id,
            name: item.match.league.name,
          }
        : null,
      homeTeam: item.match?.homeTeam
        ? {
            id: item.match.homeTeam.id,
            name: item.match.homeTeam.name,
            logo: item.match.homeTeam.logoUrl,
          }
        : null,
      awayTeam: item.match?.awayTeam
        ? {
            id: item.match.awayTeam.id,
            name: item.match.awayTeam.name,
            logo: item.match.awayTeam.logoUrl,
          }
        : null,
      matchDate: item.match?.matchDate?.toISOString?.() || null,
      confidenceScore: item.confidenceScore,
      isHighConfidence: item.isHighConfidence,
      predictedOutcome: item.predictedOutcome,
      actualOutcome: item.actualOutcome,
      summary: item.summary,
      reasonFlags: item.reasonFlags,
      impacts: item.impacts,
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const parseDateOrDefault = (value: string | undefined, fallback: Date) => {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed;
};

const normalizeProbabilities = (input: unknown): { homeWin: number; draw: number; awayWin: number } => {
  if (!input || typeof input !== 'object') {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  const value = input as Record<string, unknown>;
  const home = clamp01(Number(value.homeWin ?? 0));
  const draw = clamp01(Number(value.draw ?? 0));
  const away = clamp01(Number(value.awayWin ?? 0));
  const total = home + draw + away;

  if (!total) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: round4(home / total),
    draw: round4(draw / total),
    awayWin: round4(away / total),
  };
};

const resolvePredictedOutcome = (probabilities: { homeWin: number; draw: number; awayWin: number }) => {
  if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) {
    return 'homeWin' as const;
  }
  if (probabilities.awayWin >= probabilities.draw) {
    return 'awayWin' as const;
  }
  return 'draw' as const;
};

const resolveActualOutcome = (homeScore: number, awayScore: number, sport: string) => {
  if (homeScore > awayScore) return 'homeWin' as const;
  if (homeScore < awayScore) return 'awayWin' as const;
  return sport === 'basketball' ? 'awayWin' : ('draw' as const);
};

const probabilityForOutcome = (
  probabilities: { homeWin: number; draw: number; awayWin: number },
  outcome: 'homeWin' | 'draw' | 'awayWin',
) => {
  if (outcome === 'homeWin') return probabilities.homeWin;
  if (outcome === 'awayWin') return probabilities.awayWin;
  return probabilities.draw;
};

const outcomeVector = (outcome: 'homeWin' | 'draw' | 'awayWin'): [number, number, number] => {
  if (outcome === 'homeWin') return [1, 0, 0];
  if (outcome === 'awayWin') return [0, 0, 1];
  return [0, 1, 0];
};

const toFeatureMap = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      output[key] = numeric;
    }
  }
  return output;
};

const buildFailureAnalysis = (row: EvaluatedPredictionRow) => {
  const reasonFlags: string[] = [];
  const impacts: Record<string, number> = {
    missingDataImpact: 0,
    staleStatsImpact: 0,
    modelDisagreementImpact: 0,
    upsetScenario: 0,
    weakMappingConfidence: 0,
    injuryUncertainty: 0,
  };

  if (row.riskFlags.includes('lowDataQuality') || row.riskFlags.includes('lowSampleSize')) {
    reasonFlags.push('missingDataImpact');
    impacts.missingDataImpact = 1;
  }
  if (row.riskFlags.includes('staleStats')) {
    reasonFlags.push('staleStatsImpact');
    impacts.staleStatsImpact = 1;
  }
  if (row.riskFlags.includes('highModelDisagreement')) {
    reasonFlags.push('modelDisagreementImpact');
    impacts.modelDisagreementImpact = 1;
  }
  if (row.riskFlags.includes('weakMappingConfidence')) {
    reasonFlags.push('weakMappingConfidence');
    impacts.weakMappingConfidence = 1;
  }
  if (row.riskFlags.includes('missingKeyPlayers')) {
    reasonFlags.push('injuryUncertainty');
    impacts.injuryUncertainty = 1;
  }

  const actualProb = probabilityForOutcome(row.probabilities, row.actualOutcome);
  if (actualProb < 0.28) {
    reasonFlags.push('upsetScenario');
    impacts.upsetScenario = 1;
  }

  const summary = row.confidenceScore >= 75
    ? 'Yuksek confidence ile gelen tahmin sonuc ile uyusmadi; neden analizi yapildi.'
    : 'Tahmin yanlisi risk sinyalleri ve veri kalite faktorleri ile iliskilendirildi.';

  return {
    reasonFlags: [...new Set(reasonFlags)],
    impacts,
    summary,
  };
};

const computeEce = (samples: Array<{ p: number; y: number }>) => {
  if (!samples.length) return 0;

  const bins = Array.from({ length: 10 }, () => ({ count: 0, pSum: 0, ySum: 0 }));
  for (const sample of samples) {
    const idx = Math.min(9, Math.floor(clamp01(sample.p) * 10));
    bins[idx].count += 1;
    bins[idx].pSum += clamp01(sample.p);
    bins[idx].ySum += sample.y;
  }

  return bins.reduce((sum, bin) => {
    if (!bin.count) return sum;
    const conf = bin.pSum / bin.count;
    const acc = bin.ySum / bin.count;
    return sum + (bin.count / samples.length) * Math.abs(conf - acc);
  }, 0);
};

const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const normalizedPage = Math.max(1, page);
  const normalizedSize = Math.max(1, pageSize);
  const start = (normalizedPage - 1) * normalizedSize;

  return {
    items: items.slice(start, start + normalizedSize),
    total: items.length,
  };
};

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round4 = (value: number) => Number(value.toFixed(4));
const round2 = (value: number) => Number(value.toFixed(2));
