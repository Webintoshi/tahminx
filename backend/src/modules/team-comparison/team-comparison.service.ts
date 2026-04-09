import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SportCode } from '@prisma/client';
import { createHash } from 'crypto';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';
import { TeamComparisonQueryDto } from './dto/team-comparison-query.dto';
import { ComparisonEngineService } from './services/comparison-engine.service';
import { ComparisonConfidenceService } from './services/comparison-confidence.service';
import { ExplanationEngineService } from './services/explanation-engine.service';
import { ScenarioEngineService } from './services/scenario-engine.service';
import { TeamFeatureAggregationService } from './services/team-feature-aggregation.service';
import { TeamStrengthService } from './services/team-strength.service';

@Injectable()
export class TeamComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly teamFeatureAggregationService: TeamFeatureAggregationService,
    private readonly teamStrengthService: TeamStrengthService,
    private readonly comparisonEngineService: ComparisonEngineService,
    private readonly scenarioEngineService: ScenarioEngineService,
    private readonly comparisonConfidenceService: ComparisonConfidenceService,
    private readonly explanationEngineService: ExplanationEngineService,
  ) {}

  async compareTeams(query: TeamComparisonQueryDto) {
    if (query.homeTeamId === query.awayTeamId) {
      throw new BadRequestException('Same team comparison is not allowed');
    }

    const [homeTeam, awayTeam, league, season] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: query.homeTeamId },
        select: { id: true, name: true, shortName: true, logoUrl: true, sportId: true, sport: { select: { code: true } } },
      }),
      this.prisma.team.findUnique({
        where: { id: query.awayTeamId },
        select: { id: true, name: true, shortName: true, logoUrl: true, sportId: true, sport: { select: { code: true } } },
      }),
      query.leagueId ? this.prisma.league.findUnique({ where: { id: query.leagueId }, select: { id: true, name: true, country: true } }) : null,
      query.seasonId ? this.prisma.season.findUnique({ where: { id: query.seasonId }, select: { id: true, name: true } }) : null,
    ]);

    if (!homeTeam || !awayTeam) {
      throw new NotFoundException('One or both teams were not found');
    }

    if (homeTeam.sportId !== awayTeam.sportId || homeTeam.sport.code !== SportCode.FOOTBALL || awayTeam.sport.code !== SportCode.FOOTBALL) {
      throw new BadRequestException('Team comparison currently supports football teams only');
    }

    if (query.leagueId && !league) {
      throw new NotFoundException('League not found');
    }

    if (query.seasonId && !season) {
      throw new NotFoundException('Season not found');
    }

    const sourceSignature = await this.buildSourceSignature({
      teamIds: [homeTeam.id, awayTeam.id],
      leagueId: query.leagueId,
      seasonId: query.seasonId,
    });
    const comparisonHash = createHash('sha1')
      .update(JSON.stringify({ ...query, sourceSignature }))
      .digest('hex');
    const cacheKey = CacheKeys.teamComparison(comparisonHash);
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return {
        data: this.decorateCachePayload(cached, true),
      };
    }

    const beforeDate = new Date();
    const [homeProfile, awayProfile] = await Promise.all([
      this.teamFeatureAggregationService.aggregate({
        teamId: homeTeam.id,
        requestedWindow: query.window,
        leagueId: query.leagueId,
        seasonId: query.seasonId,
        asOfDate: beforeDate,
      }),
      this.teamFeatureAggregationService.aggregate({
        teamId: awayTeam.id,
        requestedWindow: query.window,
        leagueId: query.leagueId,
        seasonId: query.seasonId,
        asOfDate: beforeDate,
      }),
    ]);

    const leagueContext = league?.name
      ? `${league.name}${season?.name ? ` • ${season.name}` : ''}`
      : query.leagueId
        ? 'League context selected'
        : 'Cross-league or inferred context';
    const crossLeague = Boolean(homeProfile.leagueId && awayProfile.leagueId && homeProfile.leagueId !== awayProfile.leagueId);
    const effectiveLeagueId = query.leagueId ?? homeProfile.leagueId ?? awayProfile.leagueId;

    if (!effectiveLeagueId) {
      throw new BadRequestException('A league context could not be resolved for comparison');
    }

    const homeStrengths = this.teamStrengthService.calculate(homeProfile);
    const awayStrengths = this.teamStrengthService.calculate(awayProfile);
    const comparison = this.comparisonEngineService.compare(homeStrengths, awayStrengths);
    const scenario = await this.scenarioEngineService.build({
      sportId: homeTeam.sportId,
      leagueId: effectiveLeagueId,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      beforeDate,
      homeProfile,
      awayProfile,
      comparison,
    });

    const confidence = this.comparisonConfidenceService.compute({
      homeProfile,
      awayProfile,
      comparison,
      scenario,
      crossLeague,
    });

    const warnings = [...new Set([...homeProfile.riskFlags, ...awayProfile.riskFlags, ...(crossLeague ? ['cross_league_context'] : [])])];
    const missingDataNotes = [...new Set([...homeProfile.missingDataNotes, ...awayProfile.missingDataNotes])];
    const explanation = this.explanationEngineService.build({
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      comparison,
      scenario,
      confidence,
      missingDataNotes,
      crossLeague,
    });

    const payload = {
      header: {
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          shortName: homeTeam.shortName,
          logoUrl: homeTeam.logoUrl,
          country: null,
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          shortName: awayTeam.shortName,
          logoUrl: awayTeam.logoUrl,
          country: null,
        },
        comparisonDate: beforeDate.toISOString(),
        dataWindow: query.window,
        confidenceScore: confidence.score,
        leagueContext,
        cacheHit: false,
      },
      comparison: {
        overallStrength: buildCard('overallStrength', 'Genel guc', comparison.categories[0], homeTeam.name, awayTeam.name),
        attack: buildCard('attack', 'Hucum', findCategory(comparison, 'attack'), homeTeam.name, awayTeam.name),
        defense: buildCard('defense', 'Savunma', findCategory(comparison, 'defense'), homeTeam.name, awayTeam.name),
        form: buildCard('form', 'Form', findCategory(comparison, 'form'), homeTeam.name, awayTeam.name),
        homeAway: buildCard('homeAway', 'Ic saha / deplasman', findCategory(comparison, 'homeAway'), homeTeam.name, awayTeam.name),
        tempo: buildCard('tempo', 'Tempo', findCategory(comparison, 'tempo'), homeTeam.name, awayTeam.name),
        setPiece: buildCard('setPiece', 'Duran top', findCategory(comparison, 'setPiece'), homeTeam.name, awayTeam.name),
        transition: buildCard('transition', 'Gecis', findCategory(comparison, 'transition'), homeTeam.name, awayTeam.name),
        squadIntegrity: buildCard('squadIntegrity', 'Kadro butunlugu', findCategory(comparison, 'squadIntegrity'), homeTeam.name, awayTeam.name),
      },
      probabilities: {
        ...scenario.probabilities,
        expectedScore: {
          home: round2(
            average(scenario.modelOutputs.map((item) => item.output.expectedScore.home * item.weight)) * scenario.modelOutputs.length,
          ),
          away: round2(
            average(scenario.modelOutputs.map((item) => item.output.expectedScore.away * item.weight)) * scenario.modelOutputs.length,
          ),
        },
      },
      scenarios: scenario.scenarios.slice(0, 3),
      explanation,
      confidence: {
        score: confidence.score,
        band: confidence.band,
        dataQuality: confidence.dataQuality,
        dataCoverage: confidence.dataCoverage,
        windowConsistency: confidence.windowConsistency,
        mappingConfidence: confidence.mappingConfidence,
      },
      metadata: {
        usedMatches: {
          home: homeProfile.matches.map((item) => item.id),
          away: awayProfile.matches.map((item) => item.id),
        },
        usedWindows: {
          home: homeProfile.matches.length,
          away: awayProfile.matches.length,
        },
        usedFeatureSet: [...new Set([...homeProfile.featureSetFamilies, ...awayProfile.featureSetFamilies])].join(', ') || 'comparison-core',
        generatedAt: beforeDate.toISOString(),
        cacheHit: false,
        cacheSource: 'redis',
        cacheExpiresAt: new Date(beforeDate.getTime() + CACHE_TTL_SECONDS.comparisons * 1000).toISOString(),
        crossLeague,
        warnings,
      },
      visualization: {
        attackScore: homeStrengths.attack,
        defenseScore: homeStrengths.defense,
        formScore: homeStrengths.form,
        homeAwayScore: homeStrengths.home,
        tempoScore: homeStrengths.tempo,
        transitionScore: homeStrengths.transition,
        setPieceScore: homeStrengths.setPiece,
        resilienceScore: homeStrengths.resilience,
        homeValues: {
          attackScore: homeStrengths.attack,
          defenseScore: homeStrengths.defense,
          formScore: homeStrengths.form,
          homeAwayScore: homeStrengths.home,
          tempoScore: homeStrengths.tempo,
          transitionScore: homeStrengths.transition,
          setPieceScore: homeStrengths.setPiece,
          resilienceScore: homeStrengths.resilience,
        },
        awayValues: {
          attackScore: awayStrengths.attack,
          defenseScore: awayStrengths.defense,
          formScore: awayStrengths.form,
          homeAwayScore: awayStrengths.away,
          tempoScore: awayStrengths.tempo,
          transitionScore: awayStrengths.transition,
          setPieceScore: awayStrengths.setPiece,
          resilienceScore: awayStrengths.resilience,
        },
      },
    };

    await this.cacheService.set(cacheKey, payload, CACHE_TTL_SECONDS.comparisons);

    return {
      data: payload,
    };
  }

  private decorateCachePayload(payload: any, cacheHit: boolean) {
    return {
      ...payload,
      header: {
        ...payload.header,
        cacheHit,
      },
      metadata: {
        ...payload.metadata,
        cacheHit,
        cacheSource: 'redis',
      },
    };
  }

  private async buildSourceSignature(input: {
    teamIds: string[];
    leagueId?: string;
    seasonId?: string;
  }) {
    const [latestMatch, latestStat, latestPrediction, latestFeature, latestStanding, latestMapping] = await Promise.all([
      this.prisma.match.findFirst({
        where: {
          OR: [{ homeTeamId: { in: input.teamIds } }, { awayTeamId: { in: input.teamIds } }],
          ...(input.leagueId ? { leagueId: input.leagueId } : {}),
          ...(input.seasonId ? { seasonId: input.seasonId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.teamStat.findFirst({
        where: {
          teamId: { in: input.teamIds },
          match: {
            ...(input.leagueId ? { leagueId: input.leagueId } : {}),
            ...(input.seasonId ? { seasonId: input.seasonId } : {}),
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.prediction.findFirst({
        where: {
          match: {
            OR: [{ homeTeamId: { in: input.teamIds } }, { awayTeamId: { in: input.teamIds } }],
            ...(input.leagueId ? { leagueId: input.leagueId } : {}),
            ...(input.seasonId ? { seasonId: input.seasonId } : {}),
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.featureSet.findFirst({
        where: {
          match: {
            OR: [{ homeTeamId: { in: input.teamIds } }, { awayTeamId: { in: input.teamIds } }],
            ...(input.leagueId ? { leagueId: input.leagueId } : {}),
            ...(input.seasonId ? { seasonId: input.seasonId } : {}),
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.standingsSnapshot.findFirst({
        where: {
          teamId: { in: input.teamIds },
          ...(input.leagueId ? { leagueId: input.leagueId } : {}),
          ...(input.seasonId ? { seasonId: input.seasonId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.providerTeamMapping.findFirst({
        where: { teamId: { in: input.teamIds } },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    return [
      latestMatch?.updatedAt?.toISOString() ?? 'match:none',
      latestStat?.updatedAt?.toISOString() ?? 'stat:none',
      latestPrediction?.updatedAt?.toISOString() ?? 'prediction:none',
      latestFeature?.updatedAt?.toISOString() ?? 'feature:none',
      latestStanding?.updatedAt?.toISOString() ?? 'standing:none',
      latestMapping?.updatedAt?.toISOString() ?? 'mapping:none',
    ].join('|');
  }
}

const findCategory = (comparison: { categories: Array<{ key: string }> }, key: string) => {
  const found = comparison.categories.find((item) => item.key === key);
  if (!found) {
    throw new Error(`Comparison category not found: ${key}`);
  }
  return found as any;
};

const buildCard = (
  key: string,
  label: string,
  category: {
    homeValue: number;
    awayValue: number;
    edge: number;
    advantage: 'home' | 'away' | 'balanced';
    summary: string;
  },
  homeTeamName: string,
  awayTeamName: string,
) => ({
  key,
  label,
  homeScore: round2(category.homeValue),
  awayScore: round2(category.awayValue),
  edge: round2(category.edge),
  winner: category.advantage,
  winnerLabel:
    category.advantage === 'home' ? homeTeamName : category.advantage === 'away' ? awayTeamName : 'Dengeli',
  explanation: category.summary,
});

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const round2 = (value: number) => Number(value.toFixed(2));
