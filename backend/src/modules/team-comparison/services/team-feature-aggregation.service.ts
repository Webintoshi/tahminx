import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { AggregatedTeamProfile, ComparisonWindow } from '../team-comparison.types';
import { ProxyXGService } from './proxy-xg.service';

type Venue = 'home' | 'away';
type MatchResult = 'win' | 'draw' | 'loss';
type AggregationRow = {
  id: string;
  matchDate: Date;
  leagueId: string;
  seasonId: string | null;
  venue: Venue;
  opponentTeamId: string;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  hasStats: boolean;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  possession: number;
  bigChances: number;
  teamPayload: Record<string, unknown>;
  opponentShots: number;
  opponentShotsOnTarget: number;
  opponentCorners: number;
  opponentBigChances: number;
  opponentPayload: Record<string, unknown>;
  result: MatchResult;
  featureSets: Array<{ modelFamily: string; features: unknown }>;
};

@Injectable()
export class TeamFeatureAggregationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proxyXgService: ProxyXGService,
  ) {}

  async aggregate(input: {
    teamId: string;
    requestedWindow: ComparisonWindow;
    leagueId?: string;
    seasonId?: string;
    asOfDate: Date;
  }): Promise<AggregatedTeamProfile> {
    const requestedSize = windowToSize(input.requestedWindow);
    const team = await this.prisma.team.findUnique({
      where: { id: input.teamId },
      select: { id: true, name: true, shortName: true },
    });

    if (!team) {
      throw new Error(`Team not found: ${input.teamId}`);
    }

    const scopedMatches = await this.loadMatches({
      teamId: input.teamId,
      asOfDate: input.asOfDate,
      leagueId: input.leagueId,
      seasonId: input.seasonId,
      take: Math.max(18, requestedSize * 3),
    });

    const fallbackMatches =
      scopedMatches.length >= requestedSize
        ? scopedMatches
        : await this.loadMatches({
            teamId: input.teamId,
            asOfDate: input.asOfDate,
            take: Math.max(18, requestedSize * 3),
          });

    const selectedMatches = (fallbackMatches.length ? fallbackMatches : scopedMatches).slice(0, requestedSize);
    const appliedWindow = normalizeWindow(selectedMatches.length, input.requestedWindow);
    const effectiveMatches = selectedMatches.slice(0, windowToSize(appliedWindow));
    const latestMatch = effectiveMatches[0] ?? fallbackMatches[0] ?? scopedMatches[0] ?? null;

    const providerMappings = await this.prisma.providerTeamMapping.findMany({
      where: { teamId: input.teamId },
      select: { confidence: true, reviewNeeded: true },
    });

    const opponentIds = effectiveMatches.map((item) => item.opponentTeamId);
    const standings = opponentIds.length
      ? await this.prisma.standingsSnapshot.findMany({
          where: {
            teamId: { in: opponentIds },
            ...(input.leagueId || latestMatch?.leagueId ? { leagueId: input.leagueId ?? latestMatch!.leagueId } : {}),
            ...(input.seasonId || latestMatch?.seasonId ? { seasonId: input.seasonId ?? latestMatch!.seasonId! } : {}),
          },
          select: { teamId: true, rank: true },
        })
      : [];

    const standingByTeam = new Map(standings.map((item) => [item.teamId, item.rank]));
    const currentStanding = await this.resolveCurrentStanding(
      latestMatch?.leagueId ?? input.leagueId ?? null,
      latestMatch?.seasonId ?? input.seasonId ?? null,
      input.teamId,
      input.asOfDate,
    );

    const records: Array<AggregationRow & { xgFor: number; xgAgainst: number; usedProxyXg: boolean }> = effectiveMatches.map((match) => {
      const xgFor = this.proxyXgService.resolve({
        existingXg: pickNumber(match.teamPayload, ['xg', 'expectedGoals', 'expected_goals']),
        shots: match.shots,
        shotsOnTarget: match.shotsOnTarget,
        bigChances: match.bigChances,
        corners: match.corners,
      });

      const xgAgainst = this.proxyXgService.resolve({
        existingXg: pickNumber(match.opponentPayload, ['xg', 'expectedGoals', 'expected_goals']),
        shots: match.opponentShots,
        shotsOnTarget: match.opponentShotsOnTarget,
        bigChances: match.opponentBigChances,
        corners: match.opponentCorners,
      });

      return {
        ...match,
        xgFor: xgFor.value,
        xgAgainst: xgAgainst.value,
        usedProxyXg: xgFor.usedProxy || xgAgainst.usedProxy,
      };
    });

    const matchViews = records.map((item) => ({
      id: item.id,
      date: item.matchDate,
      venue: item.venue,
      opponentTeamId: item.opponentTeamId,
      opponentName: item.opponentName,
      goalsFor: item.goalsFor,
      goalsAgainst: item.goalsAgainst,
      xgFor: item.xgFor,
      xgAgainst: item.xgAgainst,
      usedProxyXg: item.usedProxyXg,
      result: item.result,
    }));

    const featureFamilies = [...new Set(records.flatMap((item) => item.featureSets.map((feature) => feature.modelFamily)))];
    const featureSignals = records.flatMap((item) => item.featureSets.map((feature) => asRecord(feature.features)));

    const sampleSize = records.length;
    const statsCoverage = ratio(
      records.filter((item) => item.hasStats).length,
      sampleSize || requestedSize,
    );
    const featureCoverage = ratio(
      records.filter((item) => item.featureSets.length > 0).length,
      sampleSize || requestedSize,
    );
    const actualXgCoverage = ratio(
      records.filter((item) => !item.usedProxyXg).length,
      sampleSize || requestedSize,
    );
    const proxyXgUsageRate = sampleSize ? 1 - actualXgCoverage : 1;
    const mappingConfidence = providerMappings.length
      ? average(providerMappings.map((item) => clamp01(Number(item.confidence ?? 0.7))))
      : 0.7;
    const dataCoverage = clamp01(sampleSize / requestedSize);
    const dataQuality = clamp01(average([statsCoverage, featureCoverage, actualXgCoverage, mappingConfidence, dataCoverage]));

    const weightedForm = computeWeightedForm(records);
    const homeRows = records.filter((item) => item.venue === 'home');
    const awayRows = records.filter((item) => item.venue === 'away');
    const closeGameRows = records.filter((item) => Math.abs(item.goalsFor - item.goalsAgainst) <= 1);
    const currentLeagueId = latestMatch?.leagueId ?? input.leagueId ?? null;
    const currentSeasonId = latestMatch?.seasonId ?? input.seasonId ?? null;

    const missingDataNotes = [
      ...(sampleSize < requestedSize ? [`Istenen ${requestedSize} mac yerine ${sampleSize} mac kullanildi`] : []),
      ...(proxyXgUsageRate > 0.25 ? ['xG verisi eksik oldugu icin bazi maclarda proxy xG kullanildi'] : []),
      ...(statsCoverage < 0.7 ? ['Takim istatistik kapsami sinirli'] : []),
      ...(input.leagueId && currentLeagueId && input.leagueId !== currentLeagueId ? ['Lig baglami fallback ile genisletildi'] : []),
    ];

    const riskFlags = [
      ...(sampleSize < Math.min(3, requestedSize) ? ['very_low_sample'] : []),
      ...(sampleSize < requestedSize ? ['window_fallback'] : []),
      ...(proxyXgUsageRate > 0.25 ? ['proxy_xg_fallback'] : []),
      ...(mappingConfidence < 0.72 ? ['weak_mapping_confidence'] : []),
      ...(statsCoverage < 0.6 ? ['sparse_team_stats'] : []),
    ];

    return {
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName,
      leagueId: currentLeagueId,
      seasonId: currentSeasonId,
      rank: currentStanding,
      requestedWindow: input.requestedWindow,
      appliedWindow,
      sampleSize,
      matches: matchViews,
      goalsForPerMatch: average(records.map((item) => item.goalsFor)),
      goalsAgainstPerMatch: average(records.map((item) => item.goalsAgainst)),
      xgForPerMatch: average(records.map((item) => item.xgFor)),
      xgAgainstPerMatch: average(records.map((item) => item.xgAgainst)),
      weightedForm,
      winRate: ratio(records.filter((item) => item.result === 'win').length, sampleSize),
      drawRate: ratio(records.filter((item) => item.result === 'draw').length, sampleSize),
      lossRate: ratio(records.filter((item) => item.result === 'loss').length, sampleSize),
      pointsPerMatch: average(records.map((item) => pointsForResult(item.result))),
      shotsPerMatch: average(records.map((item) => item.shots)),
      shotsOnTargetPerMatch: average(records.map((item) => item.shotsOnTarget)),
      cornersPerMatch: average(records.map((item) => item.corners)),
      possessionPerMatch: average(records.map((item) => item.possession)),
      bigChancesPerMatch: average(records.map((item) => item.bigChances)),
      cleanSheetRate: ratio(records.filter((item) => item.goalsAgainst === 0).length, sampleSize),
      scoringRate: ratio(records.filter((item) => item.goalsFor > 0).length, sampleSize),
      closeGamePointsRate: ratio(sum(closeGameRows.map((item) => pointsForResult(item.result))), Math.max(1, closeGameRows.length * 3)),
      transitionActionsPerMatch: average(
        records.map((item) => item.bigChances + item.shotsOnTarget + pickNumber(item.teamPayload, ['counterAttacks', 'dangerousAttacks']) * 0.1),
      ),
      setPieceActionsPerMatch: average(
        records.map((item) => item.corners + pickNumber(item.teamPayload, ['freeKicks', 'setPieces']) * 0.1),
      ),
      homeWinRate: ratio(homeRows.filter((item) => item.result === 'win').length, homeRows.length),
      awayWinRate: ratio(awayRows.filter((item) => item.result === 'win').length, awayRows.length),
      homePointsPerMatch: average(homeRows.map((item) => pointsForResult(item.result))),
      awayPointsPerMatch: average(awayRows.map((item) => pointsForResult(item.result))),
      opponentRankStrength: average(
        records.map((item) => {
          const rank = standingByTeam.get(item.opponentTeamId) ?? 10;
          return clamp01((20 - Math.min(20, rank)) / 20);
        }),
      ),
      restDaysAverage: average(records.map((item, index) => (index === records.length - 1 ? 7 : daysBetween(records[index + 1].matchDate, item.matchDate)))),
      dataQuality,
      dataCoverage,
      featureCoverage,
      mappingConfidence,
      actualXgCoverage,
      proxyXgUsageRate,
      missingDataNotes,
      riskFlags,
      featureSetFamilies: featureFamilies,
      pipelineSignals: summarizeSignals(featureSignals),
    };
  }

  private async loadMatches(input: {
    teamId: string;
    asOfDate: Date;
    leagueId?: string;
    seasonId?: string;
    take: number;
  }): Promise<AggregationRow[]> {
    const rows = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: input.asOfDate },
        ...(input.leagueId ? { leagueId: input.leagueId } : {}),
        ...(input.seasonId ? { seasonId: input.seasonId } : {}),
      },
      orderBy: { matchDate: 'desc' },
      take: input.take,
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        teamStats: {
          select: {
            teamId: true,
            possession: true,
            shots: true,
            shotsOnTarget: true,
            corners: true,
            payload: true,
          },
        },
        featureSets: {
          select: {
            modelFamily: true,
            features: true,
          },
        },
      },
    });

    return rows.map((row) => {
      const venue: Venue = row.homeTeamId === input.teamId ? 'home' : 'away';
      const goalsFor = venue === 'home' ? Number(row.homeScore ?? 0) : Number(row.awayScore ?? 0);
      const goalsAgainst = venue === 'home' ? Number(row.awayScore ?? 0) : Number(row.homeScore ?? 0);
      const result: MatchResult = goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw';

      const teamStat = row.teamStats.find((item) => item.teamId === input.teamId);
      const opponentTeamId = venue === 'home' ? row.awayTeamId : row.homeTeamId;
      const opponentTeam = venue === 'home' ? row.awayTeam : row.homeTeam;
      const opponentStat = row.teamStats.find((item) => item.teamId === opponentTeamId);

      return {
        id: row.id,
        matchDate: row.matchDate,
        leagueId: row.leagueId,
        seasonId: row.seasonId,
        venue,
        opponentTeamId,
        opponentName: opponentTeam.name,
        goalsFor,
        goalsAgainst,
        hasStats: Boolean(teamStat),
        shots: Number(teamStat?.shots ?? 0),
        shotsOnTarget: Number(teamStat?.shotsOnTarget ?? 0),
        corners: Number(teamStat?.corners ?? 0),
        possession: Number(teamStat?.possession ?? 0),
        bigChances: pickNumber(teamStat?.payload, ['bigChances', 'big_chances']),
        teamPayload: asRecord(teamStat?.payload),
        opponentShots: Number(opponentStat?.shots ?? 0),
        opponentShotsOnTarget: Number(opponentStat?.shotsOnTarget ?? 0),
        opponentCorners: Number(opponentStat?.corners ?? 0),
        opponentBigChances: pickNumber(opponentStat?.payload, ['bigChances', 'big_chances']),
        opponentPayload: asRecord(opponentStat?.payload),
        result,
        featureSets: row.featureSets,
      };
    });
  }

  private async resolveCurrentStanding(
    leagueId: string | null,
    seasonId: string | null,
    teamId: string,
    asOfDate: Date,
  ): Promise<number | null> {
    if (!leagueId) {
      return null;
    }

    const snapshot = await this.prisma.standingsSnapshot.findFirst({
      where: {
        leagueId,
        teamId,
        ...(seasonId ? { seasonId } : {}),
        createdAt: { lt: asOfDate },
      },
      orderBy: [{ createdAt: 'desc' }, { rank: 'asc' }],
      select: { rank: true },
    });

    return snapshot?.rank ?? null;
  }
}

const normalizeWindow = (count: number, fallback: ComparisonWindow): ComparisonWindow => {
  if (count >= 10) return 'last10';
  if (count >= 5) return 'last5';
  if (count >= 3) return 'last3';
  return fallback;
};

const windowToSize = (window: ComparisonWindow) => {
  if (window === 'last3') return 3;
  if (window === 'last10') return 10;
  return 5;
};

const computeWeightedForm = (
  matches: Array<{
    result: 'win' | 'draw' | 'loss';
  }>,
) => {
  if (!matches.length) return 0;
  const weights = matches.map((_, index) => Math.max(0.6, 1.6 - index * 0.12));
  const totalWeight = sum(weights);
  const total = matches.reduce((acc, match, index) => acc + pointsForResult(match.result) * weights[index], 0);
  return round4(total / Math.max(1, totalWeight * 3));
};

const summarizeSignals = (signals: Array<Record<string, unknown>>) => {
  const keys = ['recentFormScore', 'homeAwayStrength', 'opponentStrengthDiff', 'avgGoalsFor', 'avgGoalsAgainst'];
  return keys.reduce<Record<string, number>>((acc, key) => {
    const values = signals
      .map((item) => Number(item[key]))
      .filter((value) => Number.isFinite(value));

    if (values.length) {
      acc[key] = round4(average(values));
    }
    return acc;
  }, {});
};

const asRecord = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const pickNumber = (value: unknown, keys: string[]) => {
  const record = asRecord(value);
  for (const key of keys) {
    const parsed = Number(record[key]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};
const ratio = (value: number, total: number) => (total > 0 ? round4(value / total) : 0);
const average = (values: number[]) => (values.length ? round4(sum(values) / values.length) : 0);
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);
const pointsForResult = (result: 'win' | 'draw' | 'loss') => (result === 'win' ? 3 : result === 'draw' ? 1 : 0);
const round4 = (value: number) => Number(value.toFixed(4));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const daysBetween = (left: Date, right: Date) => Math.max(1, Math.round((right.getTime() - left.getTime()) / (1000 * 60 * 60 * 24)));
