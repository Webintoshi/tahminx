import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, SportCode } from '@prisma/client';
import { PredictionCalibrationService } from 'src/modules/calibration/prediction-calibration.service';
import { FeatureLabService } from 'src/modules/feature-lab/feature-lab.service';
import { ModelStrategyService, ResolvedStrategy } from 'src/modules/model-strategy/model-strategy.service';
import { CacheService } from 'src/common/utils/cache.service';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';
import { PredictionListQueryDto } from 'src/shared/dto/prediction-list-query.dto';
import { DefaultConfidenceCalculator } from './calibration/default-confidence.calculator';
import { DefaultExplanationBuilder } from './calibration/default-explanation.builder';
import { PredictionConfidenceService } from './calibration/prediction-confidence.service';
import { BasketballPaceTotalEngine } from './engines/basketball-pace-total.engine';
import { BasketballTeamRatingEngine } from './engines/basketball-team-rating.engine';
import { FootballEloEngine } from './engines/football-elo.engine';
import { FootballPoissonEngine } from './engines/football-poisson.engine';
import { PredictionEngineInput, PredictionEngineOutput } from './engines/prediction.interfaces';
import { BasketballFeatureBuilder } from './features/basketball-feature.builder';
import { FootballFeatureBuilder } from './features/football-feature.builder';
import { PredictionsRepository } from './predictions.repository';
import { PredictionRiskFlagEngine } from './risk/prediction-risk-flag.engine';

interface GeneratedFeatureSnapshot {
  matchId: string;
  modelFamily: string;
  features: Record<string, number>;
  qualityScore: number;
  featureSetId?: string | null;
}

interface FeatureSnapshot {
  modelFamily: string;
  features: Record<string, number>;
  qualityScore: number;
  featureSetId: string | null;
}

interface EngineAggregateOutput {
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  expectedScore: {
    home: number;
    away: number;
  };
  modelDisagreement: number;
  rawModelOutputs: Record<
    string,
    {
      probabilities: { homeWin: number; draw: number; awayWin: number };
      expectedScore: { home: number; away: number };
    }
  >;
  ensembleConfig: {
    method: string;
    members: Array<{ model: string; weight: number }>;
  };
}

interface EngineRunResult {
  model: string;
  weight: number;
  output: PredictionEngineOutput | null;
}

interface ValidEngineRunResult {
  model: string;
  weight: number;
  output: PredictionEngineOutput;
}

const isValidEngineRunResult = (item: EngineRunResult): item is ValidEngineRunResult => item.output !== null;

@Injectable()
export class PredictionsService {
  constructor(
    private readonly repository: PredictionsRepository,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly footballEloEngine: FootballEloEngine,
    private readonly footballPoissonEngine: FootballPoissonEngine,
    private readonly basketballRatingEngine: BasketballTeamRatingEngine,
    private readonly basketballPaceEngine: BasketballPaceTotalEngine,
    private readonly footballFeatureBuilder: FootballFeatureBuilder,
    private readonly basketballFeatureBuilder: BasketballFeatureBuilder,
    private readonly confidenceCalculator: DefaultConfidenceCalculator,
    private readonly confidenceService: PredictionConfidenceService,
    private readonly riskFlagEngine: PredictionRiskFlagEngine,
    private readonly explanationBuilder: DefaultExplanationBuilder,
    private readonly calibrationService: PredictionCalibrationService,
    private readonly modelStrategyService: ModelStrategyService,
    private readonly featureLabService: FeatureLabService,
  ) {}

  async list(query: PredictionListQueryDto) {
    const key = CacheKeys.predictionsList(JSON.stringify(query));
    return this.cacheService.getOrSet(key, CACHE_TTL_SECONDS.predictions, async () => {
      const { items, total } = await this.repository.list(query, false);
      return {
        data: items.map((item) => this.toFrontendPrediction(item)),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    });
  }

  async highConfidence(query: PredictionListQueryDto) {
    const key = CacheKeys.predictionsHighConfidence(JSON.stringify(query));
    return this.cacheService.getOrSet(key, CACHE_TTL_SECONDS.predictions, async () => {
      const { items, total } = await this.repository.list(query, true);
      return {
        data: items.map((item) => this.toFrontendPrediction(item)),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    });
  }

  async getByMatchId(matchId: string) {
    return this.cacheService.getOrSet(CacheKeys.predictionByMatch(matchId), CACHE_TTL_SECONDS.predictions, async () => {
      const item = await this.repository.getByMatchId(matchId);
      return { data: this.toFrontendPrediction(item) };
    });
  }

  async previewForMatch(matchId: string, modelVersionId?: string) {
    const match = await this.prisma.match.findUnique({
      include: { sport: true, league: true, homeTeam: true, awayTeam: true },
      where: { id: matchId },
    });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const strategy = await this.modelStrategyService.resolveForMatch({
      sportCode: match.sport.code,
      sportId: match.sportId,
      leagueId: match.leagueId,
      predictionType: 'matchOutcome',
      explicitModelVersionId: modelVersionId,
    });
    const computed = await this.computePredictionPayload(match, strategy);

    return {
      modelVersionId: computed.primaryModelVersion.id,
      probabilities: computed.calibratedProbabilities,
      expectedScore: computed.engineOutput.expectedScore,
      confidenceScore: computed.finalConfidenceScore,
      summary: computed.summary,
      riskFlags: computed.riskFlags,
      updatedAt: new Date().toISOString(),
      isRecommended: computed.isRecommended,
      isLowConfidence: computed.isLowConfidence,
      avoidReason: computed.avoidReason,
    };
  }

  async generateFeaturesForMatch(matchId: string): Promise<GeneratedFeatureSnapshot> {
    const match = await this.prisma.match.findUnique({
      include: { sport: true },
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const input: PredictionEngineInput = {
      matchId,
      sportCode: match.sport.code,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      context: {
        leagueId: match.leagueId,
        seasonId: match.seasonId,
      },
    };

    const snapshot = await this.buildFeatureSnapshot(match.sport.code, input);
    await this.upsertFeatureSnapshot(match.id, snapshot);

    return {
      matchId: match.id,
      modelFamily: snapshot.modelFamily,
      features: snapshot.features,
      qualityScore: snapshot.qualityScore,
      featureSetId: snapshot.featureSetId,
    };
  }

  async generateFeaturesForMatches(matchIds: string[]) {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    const output: Array<{ matchId: string; status: 'success' | 'failed'; modelFamily?: string; message?: string }> = [];

    for (const matchId of dedupedIds) {
      try {
        const snapshot = await this.generateFeaturesForMatch(matchId);
        output.push({
          matchId,
          modelFamily: snapshot.modelFamily,
          status: 'success',
        });
      } catch (error) {
        output.push({
          matchId,
          status: 'failed',
          message: (error as Error).message,
        });
      }
    }

    await this.cacheService.del([CacheKeys.dashboardSummary()]);
    return output;
  }

  async generatePendingFeatures(limit = 60) {
    const now = new Date();
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const matches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
        matchDate: { gte: now, lte: in72h },
      },
      select: { id: true },
      orderBy: { matchDate: 'asc' },
      take: limit,
    });

    return this.generateFeaturesForMatches(matches.map((item) => item.id));
  }

  async generateForMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      include: { sport: true, league: true, homeTeam: true, awayTeam: true },
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    const strategy = await this.modelStrategyService.resolveForMatch({
      sportCode: match.sport.code,
      sportId: match.sportId,
      leagueId: match.leagueId,
      predictionType: 'matchOutcome',
    });
    const computed = await this.computePredictionPayload(match, strategy);

    await this.repository.upsertPrediction(match.id, computed.primaryModelVersion.id, {
      rawProbabilities: computed.rawProbabilities,
      calibratedProbabilities: computed.calibratedProbabilities,
      probabilities: computed.calibratedProbabilities,
      expectedScore: computed.engineOutput.expectedScore,
      confidenceScore: computed.finalConfidenceScore,
      rawConfidenceScore: computed.rawConfidenceScore,
      calibratedConfidenceScore: computed.calibratedConfidenceScore,
      summary: computed.summary,
      riskFlags: computed.riskFlags,
      isRecommended: computed.isRecommended,
      isLowConfidence: computed.isLowConfidence,
      avoidReason: computed.avoidReason,
      modelStrategyId: computed.strategy.id,
      usedStrategy: computed.usedStrategy,
      explanation: {
        modelVersion: computed.primaryModelVersion.key,
        features: computed.featureSnapshot.features,
        featureSet: computed.featureSetInfo,
        rawProbabilities: computed.rawProbabilities,
        rawModelOutputs: computed.engineOutput.rawModelOutputs,
        ensemble: computed.engineOutput.ensembleConfig,
        calibratedProbabilities: computed.calibratedProbabilities,
        calibration: computed.calibration,
        strategy: computed.usedStrategy,
      },
    });

    await this.cacheService.delByPrefix('predictions:');
    await this.cacheService.del([
      CacheKeys.predictionByMatch(match.id),
      CacheKeys.matchDetail(match.id),
      CacheKeys.dashboardSummary(),
    ]);

    return this.getByMatchId(match.id);
  }

  async generateForMatches(matchIds: string[]) {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    const output = [];

    for (const matchId of dedupedIds) {
      try {
        const item = await this.generateForMatch(matchId);
        output.push({ matchId, status: 'success', prediction: item.data });
      } catch (error) {
        output.push({ matchId, status: 'failed', message: (error as Error).message });
      }
    }

    return output;
  }

  async generatePendingPredictions(limit = 40) {
    const now = new Date();
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const matches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] },
        matchDate: { gte: now, lte: in72h },
      },
      select: { id: true },
      orderBy: { matchDate: 'asc' },
      take: limit,
    });

    return this.generateForMatches(matches.map((item) => item.id));
  }

  async generationStatus() {
    const [latestPrediction, totalPredictions, last24hPredictions, latestFeatureUpdate] = await Promise.all([
      this.prisma.prediction.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.prediction.count(),
      this.prisma.prediction.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.prisma.featureSet.findFirst({ orderBy: { updatedAt: 'desc' } }),
    ]);

    return {
      totalPredictions,
      generatedLast24Hours: last24hPredictions,
      latestPredictionAt: latestPrediction?.updatedAt?.toISOString() || null,
      latestFeatureRefreshAt: latestFeatureUpdate?.updatedAt?.toISOString() || null,
    };
  }

  private async ensureActiveModelVersion(sportId: string, sportCode: 'FOOTBALL' | 'BASKETBALL') {
    const active = await this.prisma.modelVersion.findFirst({
      where: {
        deletedAt: null,
        status: { in: ['active', 'ACTIVE'] },
        OR: [{ sportId }, { sportId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (active) {
      return active;
    }

    return this.prisma.modelVersion.create({
      data: {
        sportId,
        key: `auto-${String(sportCode).toLowerCase()}-v1`,
        name: `${sportCode} Auto Model`,
        version: '1.0.0',
        status: 'active',
        metadata: {
          family: sportCode === 'FOOTBALL' ? 'elo-poisson' : 'team-rating-pace',
          createdBy: 'system',
        },
      },
    });
  }

  private async resolveModelVersion(sportId: string, sportCode: SportCode, modelVersionId?: string) {
    if (modelVersionId) {
      const modelVersion = await this.prisma.modelVersion.findUnique({ where: { id: modelVersionId } });
      if (!modelVersion || modelVersion.deletedAt) {
        throw new NotFoundException('Model version not found');
      }
      if (modelVersion.sportId && modelVersion.sportId !== sportId) {
        throw new BadRequestException('Model version sport mismatch for match');
      }
      return modelVersion;
    }

    return this.ensureActiveModelVersion(sportId, sportCode);
  }

  private async runEngines(
    input: PredictionEngineInput,
    strategy: ResolvedStrategy,
    features: Record<string, number>,
  ): Promise<EngineAggregateOutput> {
    const ensembleConfig = strategy.ensembleConfig;
    const outputs: EngineRunResult[] = await Promise.all(
      ensembleConfig.members.map(async (member) => {
        const output = await this.runSingleModel(input, member.model, features);
        return {
          model: String(member.model),
          weight: member.weight,
          output,
        };
      }),
    );

    const validOutputs = outputs.filter(isValidEngineRunResult);

    const fallbackEnsemble = this.defaultEnsembleForSport(input.sportCode);
    const used: ValidEngineRunResult[] = validOutputs.length
      ? validOutputs
      : (
          await Promise.all(
            fallbackEnsemble.members.map(async (member) => ({
              model: String(member.model),
              weight: member.weight,
              output: await this.runSingleModel(input, member.model, features),
            })),
          )
        ).filter(isValidEngineRunResult);

    const totalWeight = used.reduce((sum, item) => sum + Math.max(0, item.weight), 0) || 1;
    const normalizedMembers = used.map((item) => ({
      model: item.model,
      weight: Math.max(0, item.weight) / totalWeight,
    }));

    const probabilities = normalizeProbabilities(
      normalizedMembers.reduce(
        (acc, member) => {
          const output = used.find((item) => item.model === member.model)?.output;
          if (!output) {
            return acc;
          }
          acc.homeWin += output.probabilities.homeWin * member.weight;
          acc.draw += output.probabilities.draw * member.weight;
          acc.awayWin += output.probabilities.awayWin * member.weight;
          return acc;
        },
        { homeWin: 0, draw: 0, awayWin: 0 },
      ),
    );

    const expectedScore = normalizedMembers.reduce(
      (acc, member) => {
          const output = used.find((item) => item.model === member.model)?.output;
          if (!output) {
            return acc;
          }
          acc.home += output.expectedScore.home * member.weight;
          acc.away += output.expectedScore.away * member.weight;
          return acc;
        },
        { home: 0, away: 0 },
    );

    const rawModelOutputs = used.reduce<Record<string, { probabilities: { homeWin: number; draw: number; awayWin: number }; expectedScore: { home: number; away: number } }>>(
      (acc, item) => {
        acc[item.model] = {
          probabilities: normalizeProbabilities(item.output.probabilities),
          expectedScore: {
            home: Number(item.output.expectedScore.home.toFixed(2)),
            away: Number(item.output.expectedScore.away.toFixed(2)),
          },
        };
        return acc;
      },
      {},
    );

    const modelDisagreement = this.calculateDisagreement(Object.values(rawModelOutputs).map((item) => item.probabilities));

    return {
      probabilities,
      expectedScore: {
        home: Number(expectedScore.home.toFixed(2)),
        away: Number(expectedScore.away.toFixed(2)),
      },
      modelDisagreement,
      rawModelOutputs,
      ensembleConfig: {
        method: strategy.ensembleConfig.method,
        members: normalizedMembers.map((item) => ({
          model: item.model,
          weight: Number(item.weight.toFixed(4)),
        })),
      },
    };
  }

  private async runSingleModel(
    input: PredictionEngineInput,
    model: string,
    features: Record<string, number>,
  ): Promise<PredictionEngineOutput | null> {
    if (input.sportCode === 'FOOTBALL') {
      if (model === 'elo') {
        return this.footballEloEngine.run(input);
      }
      if (model === 'poisson') {
        return this.footballPoissonEngine.run(input);
      }
      if (model === 'logistic') {
        return this.runFootballLogisticModel(features);
      }
      return null;
    }

    if (model === 'teamRating') {
      return this.basketballRatingEngine.run(input);
    }
    if (model === 'paceModel') {
      return this.basketballPaceEngine.run(input);
    }
    return null;
  }

  private runFootballLogisticModel(features: Record<string, number>): PredictionEngineOutput {
    const form = Number(features.recentFormScore || 0);
    const homeAway = Number(features.homeAwayStrength || 0);
    const oppDiff = Number(features.opponentStrengthDiff || 0);
    const missing = Number(features.missingPlayersCount || 0);
    const tableRank = Number(features.tableRank || 10);
    const avgGoalsFor = Number(features.avgGoalsFor || 1.4);
    const avgGoalsAgainst = Number(features.avgGoalsAgainst || 1.2);

    const signal =
      form * 0.72 +
      homeAway * 0.58 +
      oppDiff * 0.41 +
      (10 - tableRank) * 0.03 -
      missing * 0.11;
    const homeWin = clamp01(1 / (1 + Math.exp(-signal)));
    const draw = clamp01(0.21 + (1 - Math.abs(homeWin - 0.5) * 2) * 0.09);
    const awayWin = clamp01(1 - homeWin - draw);

    return {
      probabilities: normalizeProbabilities({ homeWin, draw, awayWin }),
      expectedScore: {
        home: Number((Math.max(0.4, avgGoalsFor + form * 0.4 - missing * 0.08)).toFixed(2)),
        away: Number((Math.max(0.3, avgGoalsAgainst * 0.9 + (1 - homeAway) * 0.45)).toFixed(2)),
      },
    };
  }

  private defaultEnsembleForSport(sportCode: SportCode) {
    if (sportCode === 'FOOTBALL') {
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

  private calculateDisagreement(distributions: Array<{ homeWin: number; draw: number; awayWin: number }>) {
    if (distributions.length <= 1) {
      return 0;
    }

    const diffs: number[] = [];
    for (let i = 0; i < distributions.length; i += 1) {
      for (let j = i + 1; j < distributions.length; j += 1) {
        diffs.push(avgAbsDiff(distributions[i], distributions[j]));
      }
    }

    if (!diffs.length) {
      return 0;
    }
    return Number((diffs.reduce((sum, value) => sum + value, 0) / diffs.length).toFixed(4));
  }

  private toFrontendPrediction(item: any) {
    return {
      matchId: item.match.id,
      sport: String(item.match.sport.code || '').toLowerCase(),
      league: {
        id: item.match.league.id,
        name: item.match.league.name,
      },
      homeTeam: {
        id: item.match.homeTeam.id,
        name: item.match.homeTeam.name,
        logo: item.match.homeTeam.logoUrl,
      },
      awayTeam: {
        id: item.match.awayTeam.id,
        name: item.match.awayTeam.name,
        logo: item.match.awayTeam.logoUrl,
      },
      matchDate: item.match.matchDate.toISOString(),
      status: String(item.match.status || '').toLowerCase(),
      probabilities: item.probabilities,
      expectedScore: item.expectedScore,
      confidenceScore: item.confidenceScore,
      summary: item.summary,
      riskFlags: item.riskFlags || [],
      updatedAt: item.updatedAt.toISOString(),
      isRecommended: item.isRecommended ?? true,
      isLowConfidence: item.isLowConfidence ?? false,
      avoidReason: item.avoidReason ?? null,
    };
  }

  private async buildFeatureSnapshot(sportCode: SportCode, input: PredictionEngineInput): Promise<FeatureSnapshot> {
    const modelFamily = this.modelFamilyForSport(sportCode);
    const featureSet = await this.featureLabService.activeFeatureSetForSport(sportCode);
    const enabledFeatures = Array.isArray(featureSet.enabledFeatures)
      ? (featureSet.enabledFeatures as string[])
      : [];

    const rawFeatures =
      sportCode === 'FOOTBALL'
        ? await this.footballFeatureBuilder.build(input)
        : await this.basketballFeatureBuilder.build(input);

    const features = enabledFeatures.length
      ? Object.fromEntries(
          Object.entries(rawFeatures).filter(([featureName]) => enabledFeatures.includes(featureName)),
        )
      : rawFeatures;

    return {
      modelFamily,
      features,
      qualityScore: this.calculateQualityScore(features),
      featureSetId: featureSet.id || null,
    };
  }

  private async upsertFeatureSnapshot(
    matchId: string,
    snapshot: {
      modelFamily: string;
      features: Record<string, number>;
      qualityScore: number;
      featureSetId?: string | null;
    },
  ) {
    await this.repository.upsertFeatureSet(matchId, snapshot.modelFamily, snapshot.features, snapshot.qualityScore);
  }

  private async loadFeatureSnapshot(matchId: string, sportCode: SportCode): Promise<FeatureSnapshot | null> {
    const modelFamily = this.modelFamilyForSport(sportCode);
    const featureSet = await this.prisma.featureSet.findUnique({
      where: {
        matchId_modelFamily: {
          matchId,
          modelFamily,
        },
      },
    });

    if (!featureSet) {
      return null;
    }

    const features = jsonToNumberRecord(featureSet.features);
    if (!features) {
      return null;
    }

    return {
      modelFamily,
      features,
      qualityScore: Number(featureSet.qualityScore ?? this.calculateQualityScore(features)),
      featureSetId: null,
    };
  }

  private calculateQualityScore(features: Record<string, number>): number {
    const values = Object.values(features);
    if (!values.length) {
      return 0;
    }

    const informative = values.filter((value) => Number.isFinite(value) && Math.abs(value) > 0.001).length;
    return Number((informative / values.length).toFixed(2));
  }

  private modelFamilyForSport(sportCode: SportCode): string {
    return `${String(sportCode).toLowerCase()}-features-v1`;
  }

  private async computePredictionPayload(
    match: {
      id: string;
      sportId: string;
      sport: { code: SportCode };
      leagueId: string;
      seasonId: string | null;
      homeTeamId: string;
      awayTeamId: string;
      matchDate: Date;
    },
    strategy: ResolvedStrategy,
  ): Promise<{
    engineOutput: EngineAggregateOutput;
    featureSnapshot: FeatureSnapshot;
    rawProbabilities: { homeWin: number; draw: number; awayWin: number };
    calibratedProbabilities: { homeWin: number; draw: number; awayWin: number };
    calibration: {
      probabilities: { homeWin: number; draw: number; awayWin: number };
      calibratedConfidence: number;
      calibrationApplied: boolean;
      calibrationId: string | null;
      trainingSampleSize: number;
      method?: string;
    };
    primaryModelVersion: {
      id: string;
      key: string;
      name: string;
      version: string;
    };
    strategy: {
      id: string | null;
      sport: 'FOOTBALL' | 'BASKETBALL';
      leagueId: string | null;
      predictionType: string;
      source: 'strategy' | 'default';
    };
    usedStrategy: Record<string, unknown>;
    featureSetInfo: {
      id: string | null;
      modelFamily: string;
    };
    rawConfidenceScore: number;
    calibratedConfidenceScore: number;
    finalConfidenceScore: number;
    riskFlags: string[];
    summary: string;
    isRecommended: boolean;
    isLowConfidence: boolean;
    avoidReason: string | null;
  }> {
    const input: PredictionEngineInput = {
      matchId: match.id,
      sportCode: match.sport.code,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      context: {
        leagueId: match.leagueId,
        seasonId: match.seasonId,
      },
    };

    const existingFeatureSnapshot = await this.loadFeatureSnapshot(match.id, match.sport.code);
    const featureSnapshot: FeatureSnapshot =
      existingFeatureSnapshot || (await this.buildFeatureSnapshot(match.sport.code, input));
    if (!existingFeatureSnapshot) {
      await this.upsertFeatureSnapshot(match.id, featureSnapshot);
    }

    const engineOutput = await this.runEngines(input, strategy, featureSnapshot.features);

    const rawProbabilities = normalizeProbabilities(engineOutput.probabilities);

    const primaryModelVersion = await this.prisma.modelVersion.findUnique({
      where: { id: strategy.primaryModelVersionId },
      select: {
        id: true,
        key: true,
        name: true,
        version: true,
      },
    });
    if (!primaryModelVersion) {
      throw new NotFoundException('Primary model version on strategy not found');
    }

    const rawConfidenceScore = this.confidenceCalculator.score(featureSnapshot.features, {
      probabilities: rawProbabilities,
      expectedScore: engineOutput.expectedScore,
    } as PredictionEngineOutput);

    const calibration = await this.calibrationService.calibrateProbabilities({
      modelVersionId: primaryModelVersion.id,
      sport: String(match.sport.code),
      predictionType: 'matchOutcome1x2',
      probabilities: rawProbabilities,
      rawConfidence: rawConfidenceScore / 100,
      calibrationProfileId: strategy.calibrationProfileId,
    });

    const statsContext = await this.buildStatsContext(match.id, match.homeTeamId, match.awayTeamId, match.matchDate);

    const preliminaryConfidence = this.confidenceService.compute({
      rawConfidence: rawConfidenceScore / 100,
      calibratedConfidence: calibration.calibratedConfidence,
      sampleSize: calibration.trainingSampleSize,
      dataQualityScore: featureSnapshot.qualityScore,
      modelDisagreement: engineOutput.modelDisagreement,
      missingPlayersCount: Number(featureSnapshot.features.missingPlayersCount || 0),
      riskFlags: [],
    });

    const firstRisk = this.riskFlagEngine.evaluate({
      dataQualityScore: featureSnapshot.qualityScore,
      modelDisagreement: engineOutput.modelDisagreement,
      missingPlayersCount: Number(featureSnapshot.features.missingPlayersCount || 0),
      trainingSampleSize: calibration.trainingSampleSize,
      statsAgeHours: statsContext.statsAgeHours,
      unstableFormScore: statsContext.unstableFormScore,
      weakMappingConfidence: statsContext.weakMappingConfidence,
      finalConfidenceScore: preliminaryConfidence.finalConfidenceScore,
    });

    const confidence = this.confidenceService.compute({
      rawConfidence: rawConfidenceScore / 100,
      calibratedConfidence: calibration.calibratedConfidence,
      sampleSize: calibration.trainingSampleSize,
      dataQualityScore: featureSnapshot.qualityScore,
      modelDisagreement: engineOutput.modelDisagreement,
      missingPlayersCount: Number(featureSnapshot.features.missingPlayersCount || 0),
      riskFlags: firstRisk.riskFlags,
    });

    const risk = this.riskFlagEngine.evaluate({
      dataQualityScore: featureSnapshot.qualityScore,
      modelDisagreement: engineOutput.modelDisagreement,
      missingPlayersCount: Number(featureSnapshot.features.missingPlayersCount || 0),
      trainingSampleSize: calibration.trainingSampleSize,
      statsAgeHours: statsContext.statsAgeHours,
      unstableFormScore: statsContext.unstableFormScore,
      weakMappingConfidence: statsContext.weakMappingConfidence,
      finalConfidenceScore: confidence.finalConfidenceScore,
    });

    const explanation = this.explanationBuilder.build(featureSnapshot.features, {
      probabilities: calibration.probabilities,
      expectedScore: engineOutput.expectedScore,
    });

    const summary = risk.isLowConfidence
      ? `${explanation.summary} Düsük güven nedeniyle dikkatli yaklaşım önerilir.`
      : explanation.summary;

    const mergedRiskFlags = [...new Set([...explanation.riskFlags, ...risk.riskFlags])];

    return {
      engineOutput,
      featureSnapshot,
      rawProbabilities,
      calibratedProbabilities: calibration.probabilities,
      calibration,
      primaryModelVersion,
      strategy: {
        id: strategy.id,
        sport: strategy.sport,
        leagueId: strategy.leagueId,
        predictionType: strategy.predictionType,
        source: strategy.source,
      },
      usedStrategy: {
        strategyId: strategy.id,
        strategySource: strategy.source,
        predictionType: strategy.predictionType,
        primaryModelVersionId: primaryModelVersion.id,
        fallbackModelVersionId: strategy.fallbackModelVersionId,
        calibrationProfileId: strategy.calibrationProfileId,
        ensembleConfig: engineOutput.ensembleConfig,
      },
      featureSetInfo: {
        id: featureSnapshot.featureSetId || null,
        modelFamily: featureSnapshot.modelFamily,
      },
      rawConfidenceScore: confidence.rawConfidenceScore,
      calibratedConfidenceScore: confidence.calibratedConfidenceScore,
      finalConfidenceScore: confidence.finalConfidenceScore,
      riskFlags: mergedRiskFlags,
      summary,
      isRecommended: risk.isRecommended,
      isLowConfidence: risk.isLowConfidence,
      avoidReason: risk.avoidReason,
    };
  }

  private async buildStatsContext(matchId: string, homeTeamId: string, awayTeamId: string, matchDate: Date) {
    const [latestMatch, mappingFlags, homeRecent, awayRecent] = await Promise.all([
      this.prisma.match.findFirst({
        where: {
          OR: [{ homeTeamId }, { awayTeamId }],
          status: 'COMPLETED',
          matchDate: { lt: matchDate },
        },
        orderBy: { matchDate: 'desc' },
        select: { matchDate: true },
      }),
      this.prisma.$transaction([
        this.prisma.providerMatchMapping.findMany({
          where: {
            matchId,
            OR: [{ reviewNeeded: true }, { confidence: { lt: 0.7 } }],
          },
          select: { id: true },
          take: 1,
        }),
        this.prisma.providerTeamMapping.findMany({
          where: {
            teamId: { in: [homeTeamId, awayTeamId] },
            OR: [{ reviewNeeded: true }, { confidence: { lt: 0.7 } }],
          },
          select: { id: true },
          take: 1,
        }),
      ]),
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId }, { awayTeamId: homeTeamId }],
          status: 'COMPLETED',
          matchDate: { lt: matchDate },
        },
        select: { homeTeamId: true, homeScore: true, awayScore: true },
        orderBy: { matchDate: 'desc' },
        take: 6,
      }),
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: awayTeamId }, { awayTeamId }],
          status: 'COMPLETED',
          matchDate: { lt: matchDate },
        },
        select: { homeTeamId: true, homeScore: true, awayScore: true },
        orderBy: { matchDate: 'desc' },
        take: 6,
      }),
    ]);

    const statsAgeHours = latestMatch
      ? Math.max(0, Math.round((matchDate.getTime() - latestMatch.matchDate.getTime()) / (1000 * 60 * 60)))
      : 999;

    const weakMappingConfidence = (mappingFlags[0]?.length || 0) > 0 || (mappingFlags[1]?.length || 0) > 0;

    return {
      statsAgeHours,
      weakMappingConfidence,
      unstableFormScore: this.estimateUnstableFormScore(homeRecent, awayRecent, homeTeamId, awayTeamId),
    };
  }

  private estimateUnstableFormScore(
    homeRecent: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
    awayRecent: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
    homeTeamId: string,
    awayTeamId: string,
  ) {
    const homeVariance = this.formVariance(homeRecent.slice(0, 5), homeTeamId);
    const awayVariance = this.formVariance(awayRecent.slice(0, 5), awayTeamId);
    return clamp01((homeVariance + awayVariance) / 2);
  }

  private formVariance(
    matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
    teamId: string,
  ) {
    if (!matches.length) {
      return 0.8;
    }

    const points: number[] = matches.map((match) => {
      const isHome = match.homeTeamId === teamId;
      const scored = Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
      const conceded = Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
      if (scored > conceded) return 1;
      if (scored < conceded) return 0;
      return 0.5;
    });

    const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + (p - mean) ** 2, 0) / points.length;
    return Math.min(1, variance / 0.25);
  }
}

const normalizeProbabilities = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const homeWin = clamp01(Number(values.homeWin ?? 0));
  const draw = clamp01(Number(values.draw ?? 0));
  const awayWin = clamp01(Number(values.awayWin ?? 0));

  const total = homeWin + draw + awayWin;
  if (!total) {
    return {
      homeWin: 0.34,
      draw: 0.32,
      awayWin: 0.34,
    };
  }

  return {
    homeWin: Number((homeWin / total).toFixed(4)),
    draw: Number((draw / total).toFixed(4)),
    awayWin: Number((awayWin / total).toFixed(4)),
  };
};

const avgAbsDiff = (
  a: { homeWin: number; draw: number; awayWin: number },
  b: { homeWin: number; draw: number; awayWin: number },
) =>
  Number(
    (
      (Math.abs(a.homeWin - b.homeWin) +
        Math.abs(a.draw - b.draw) +
        Math.abs(a.awayWin - b.awayWin)) /
      3
    ).toFixed(4),
  );

const jsonToNumberRecord = (value: unknown): Record<string, number> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const output: Record<string, number> = {};
  for (const [key, raw] of entries) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    output[key] = numeric;
  }

  return output;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

