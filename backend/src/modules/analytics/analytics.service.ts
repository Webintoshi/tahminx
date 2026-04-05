import { Injectable } from '@nestjs/common';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionCalibrationService } from 'src/modules/calibration/prediction-calibration.service';
import { FeatureLabService } from 'src/modules/feature-lab/feature-lab.service';
import { ModelAnalysisService } from 'src/modules/model-analysis/model-analysis.service';
import { ModelStrategyService } from 'src/modules/model-strategy/model-strategy.service';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly calibrationService: PredictionCalibrationService,
    private readonly modelAnalysisService: ModelAnalysisService,
    private readonly modelStrategyService: ModelStrategyService,
    private readonly featureLabService: FeatureLabService,
  ) {}

  async dashboard() {
    return this.cacheService.getOrSet(CacheKeys.dashboardSummary(), CACHE_TTL_SECONDS.analytics, async () => {
      const now = new Date();
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

      const [
        todayMatchCount,
        liveMatchCount,
        highConfidenceRows,
        updatedLeaguesRaw,
        recentPredictionRows,
        calibratedHighConfidenceCount,
        lowConfidenceCount,
        avgConfidenceAggregate,
        riskFlagRows,
        calibrationHealthSummary,
        adminInsights,
        strategyInsights,
        featureLabInsights,
      ] =
        await Promise.all([
          this.prisma.match.count({
            where: {
              matchDate: {
                gte: startOfToday,
                lte: endOfToday,
              },
            },
          }),
          this.prisma.match.count({ where: { status: 'LIVE' } }),
          this.prisma.prediction.findMany({
            where: { status: 'PUBLISHED', confidenceScore: { gte: 75 } },
            include: {
              match: {
                include: { league: true, homeTeam: true, awayTeam: true, sport: true },
              },
            },
            orderBy: [{ confidenceScore: 'desc' }, { updatedAt: 'desc' }],
            take: 8,
          }),
          this.prisma.league.findMany({
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              updatedAt: true,
              _count: {
                select: {
                  matches: true,
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
            take: 8,
          }),
          this.prisma.prediction.findMany({
            where: { status: 'PUBLISHED' },
            include: {
              match: {
                include: { league: true, homeTeam: true, awayTeam: true, sport: true },
              },
            },
            orderBy: { updatedAt: 'desc' },
            take: 8,
          }),
          this.prisma.prediction.count({
            where: {
              status: 'PUBLISHED',
              confidenceScore: { gte: 75 },
              calibratedConfidenceScore: { not: null },
            },
          }),
          this.prisma.prediction.count({
            where: { status: 'PUBLISHED', OR: [{ isLowConfidence: true }, { confidenceScore: { lt: 60 } }] },
          }),
          this.prisma.prediction.aggregate({
            where: { status: 'PUBLISHED' },
            _avg: { confidenceScore: true },
          }),
          this.prisma.prediction.findMany({
            where: { status: 'PUBLISHED' },
            select: { riskFlags: true },
            orderBy: { updatedAt: 'desc' },
            take: 2000,
          }),
          this.calibrationService.healthSummary(),
          this.modelAnalysisService.analyticsInsights(),
          this.modelStrategyService.analyticsSummary(),
          this.featureLabService.analyticsSummary(),
        ]);

      const riskDistribution = riskFlagRows.reduce<Record<string, number>>((acc, item) => {
        const flags = Array.isArray(item.riskFlags) ? (item.riskFlags as string[]) : [];
        for (const flag of flags) {
          acc[flag] = (acc[flag] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        todayMatchCount,
        liveMatchCount,
        calibratedHighConfidenceCount,
        lowConfidenceCount,
        riskDistribution,
        avgConfidenceScore: Number((avgConfidenceAggregate._avg.confidenceScore || 0).toFixed(2)),
        calibrationHealthSummary,
        bestPerformingModel: adminInsights.bestPerformingModel,
        worstPerformingModel: adminInsights.worstPerformingModel,
        topFeatures: adminInsights.topFeatures,
        failedHighConfidenceCount: adminInsights.failedHighConfidenceCount,
        performanceDriftSummary: adminInsights.performanceDriftSummary,
        activeStrategySummary: strategyInsights.activeStrategySummary,
        bestModelPerLeague: strategyInsights.bestModelPerLeague,
        ensembleUsageRate: strategyInsights.ensembleUsageRate,
        topFeatureSets: featureLabInsights.topFeatureSets,
        featureExperimentWinners: featureLabInsights.featureExperimentWinners,
        highConfidencePredictions: highConfidenceRows.map((row) => ({
          matchId: row.matchId,
          sport: String(row.match.sport.code).toLowerCase(),
          leagueName: row.match.league.name,
          homeTeam: row.match.homeTeam.name,
          awayTeam: row.match.awayTeam.name,
          confidenceScore: row.confidenceScore,
          updatedAt: row.updatedAt.toISOString(),
        })),
        updatedLeagues: updatedLeaguesRaw.map((league) => ({
          id: league.id,
          name: league.name,
          matchCount: league._count.matches,
          updatedAt: league.updatedAt.toISOString(),
        })),
        recentPredictionOverview: recentPredictionRows.map((row) => ({
          matchId: row.matchId,
          sport: String(row.match.sport.code).toLowerCase(),
          leagueName: row.match.league.name,
          homeTeam: row.match.homeTeam.name,
          awayTeam: row.match.awayTeam.name,
          confidenceScore: row.confidenceScore,
          summary: row.summary,
          updatedAt: row.updatedAt.toISOString(),
        })),
      };
    });
  }

  async guideSummary() {
    return {
      sections: [
        'Platform provider verilerini normalize eder ve tek API sozlesmesiyle sunar.',
        'Tahmin skorlarinda confidence ve riskFlags alanlari temel karar destegi icindir.',
        'Canli veriler SSE kanalindan yayinlanir ve cache invalidation otomatik tetiklenir.',
      ],
    };
  }
}
