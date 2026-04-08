import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { FeatureBuilder, PredictionEngineInput } from '../engines/prediction.interfaces';

const ARCHIVE_PROVIDER_CODE = 'club_football_archive';

@Injectable()
export class FootballFeatureBuilder implements FeatureBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(input: PredictionEngineInput): Promise<Record<string, number>> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: {
        id: true,
        leagueId: true,
        seasonId: true,
        matchDate: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    if (!match) {
      return this.zeroFeatures();
    }

    const [homeRecent, awayRecent, homeHomeMatches, awayAwayMatches, homeStanding, awayStanding, archiveSignals] =
      await Promise.all([
        this.loadRecentTeamMatches(match.homeTeamId, match.matchDate),
        this.loadRecentTeamMatches(match.awayTeamId, match.matchDate),
        this.prisma.match.findMany({
          where: {
            homeTeamId: match.homeTeamId,
            status: MatchStatus.COMPLETED,
            matchDate: { lt: match.matchDate },
          },
          orderBy: { matchDate: 'desc' },
          take: 8,
        }),
        this.prisma.match.findMany({
          where: {
            awayTeamId: match.awayTeamId,
            status: MatchStatus.COMPLETED,
            matchDate: { lt: match.matchDate },
          },
          orderBy: { matchDate: 'desc' },
          take: 8,
        }),
        this.resolveStanding(match.leagueId, match.seasonId, match.homeTeamId, match.matchDate),
        this.resolveStanding(match.leagueId, match.seasonId, match.awayTeamId, match.matchDate),
        this.loadArchiveSignals(match.id),
      ]);

    const homeFormPoints = archiveSignals?.form5Home ?? formPoints(homeRecent, match.homeTeamId);
    const awayFormPoints = archiveSignals?.form5Away ?? formPoints(awayRecent, match.awayTeamId);

    const homeGoalsFor = avgGoalsFor(homeRecent, match.homeTeamId);
    const homeGoalsAgainst = avgGoalsAgainst(homeRecent, match.homeTeamId);
    const awayGoalsFor = avgGoalsFor(awayRecent, match.awayTeamId);
    const awayGoalsAgainst = avgGoalsAgainst(awayRecent, match.awayTeamId);

    const homeHomeWinRate = winRate(homeHomeMatches, true);
    const awayAwayWinRate = winRate(awayAwayMatches, false);
    const archiveHomeElo = archiveSignals?.homeElo ?? null;
    const archiveAwayElo = archiveSignals?.awayElo ?? null;
    const archiveEloStrength =
      archiveHomeElo !== null && archiveAwayElo !== null
        ? normalizeEloStrength(archiveHomeElo, archiveAwayElo)
        : null;

    const restDays = Math.min(
      daysSinceLastMatch(homeRecent[0]?.matchDate, match.matchDate),
      daysSinceLastMatch(awayRecent[0]?.matchDate, match.matchDate),
    );

    const missingPlayersCount = await this.estimateMissingPlayers(match.homeTeamId, match.awayTeamId, match.matchDate);

    return {
      recentFormScore: round2((homeFormPoints - awayFormPoints) / 15),
      homeAwayStrength: round2(archiveEloStrength ?? (homeHomeWinRate - awayAwayWinRate)),
      avgGoalsFor: round2((homeGoalsFor + awayGoalsFor) / 2),
      avgGoalsAgainst: round2((homeGoalsAgainst + awayGoalsAgainst) / 2),
      tableRank: Number(homeStanding?.rank ?? 0),
      opponentStrengthDiff: Number((awayStanding?.rank ?? 0) - (homeStanding?.rank ?? 0)),
      restDays: Number(restDays),
      missingPlayersCount: Number(missingPlayersCount),
    };
  }

  private async resolveStanding(leagueId: string, seasonId: string | null, teamId: string, asOfDate: Date) {
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

    if (snapshot) {
      return snapshot;
    }

    return this.computeStandingRankFromMatches(leagueId, seasonId, teamId, asOfDate);
  }

  private async loadRecentTeamMatches(teamId: string, beforeDate: Date) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 8,
    });
  }

  private async estimateMissingPlayers(homeTeamId: string, awayTeamId: string, beforeDate: Date): Promise<number> {
    const [homePlayers, awayPlayers, recentMatchIds] = await Promise.all([
      this.prisma.player.findMany({ where: { teamId: homeTeamId, deletedAt: null }, select: { id: true } }),
      this.prisma.player.findMany({ where: { teamId: awayTeamId, deletedAt: null }, select: { id: true } }),
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId }, { awayTeamId }],
          status: MatchStatus.COMPLETED,
          matchDate: { lt: beforeDate },
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
        select: { id: true },
      }),
    ]);

    if (!recentMatchIds.length) {
      return 0;
    }

    const stats = await this.prisma.playerStat.findMany({
      where: {
        matchId: { in: recentMatchIds.map((item) => item.id) },
        playerId: { in: [...homePlayers, ...awayPlayers].map((item) => item.id) },
      },
      select: { playerId: true },
    });

    const totalPlayers = [...homePlayers, ...awayPlayers].length;
    if (!totalPlayers || !stats.length) {
      return 0;
    }

    const activePlayers = new Set(stats.map((item) => item.playerId));
    return Math.max(0, totalPlayers - activePlayers.size);
  }

  private async loadArchiveSignals(matchId: string): Promise<{
    homeElo: number | null;
    awayElo: number | null;
    form5Home: number | null;
    form5Away: number | null;
  } | null> {
    const mapping = await this.prisma.providerMatchMapping.findFirst({
      where: {
        matchId,
        provider: { code: ARCHIVE_PROVIDER_CODE },
      },
      select: { rawPayload: true },
    });

    const rawPayload = mapping?.rawPayload;
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      return null;
    }

    const row = rawPayload as Record<string, unknown>;
    return {
      homeElo: parseNumber(row.HomeElo),
      awayElo: parseNumber(row.AwayElo),
      form5Home: parseNumber(row.Form5Home),
      form5Away: parseNumber(row.Form5Away),
    };
  }

  private async computeStandingRankFromMatches(
    leagueId: string,
    seasonId: string | null,
    teamId: string,
    asOfDate: Date,
  ): Promise<{ rank: number } | null> {
    const matches = await this.prisma.match.findMany({
      where: {
        leagueId,
        ...(seasonId ? { seasonId } : {}),
        status: MatchStatus.COMPLETED,
        matchDate: { lt: asOfDate },
      },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!matches.length) {
      return null;
    }

    const table = new Map<string, { points: number; goalDiff: number; goalsFor: number }>();
    for (const match of matches) {
      const homeScore = Number(match.homeScore ?? 0);
      const awayScore = Number(match.awayScore ?? 0);

      const home = table.get(match.homeTeamId) || { points: 0, goalDiff: 0, goalsFor: 0 };
      const away = table.get(match.awayTeamId) || { points: 0, goalDiff: 0, goalsFor: 0 };

      home.goalsFor += homeScore;
      away.goalsFor += awayScore;
      home.goalDiff += homeScore - awayScore;
      away.goalDiff += awayScore - homeScore;

      if (homeScore > awayScore) {
        home.points += 3;
      } else if (awayScore > homeScore) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }

      table.set(match.homeTeamId, home);
      table.set(match.awayTeamId, away);
    }

    const sorted = [...table.entries()].sort((a, b) => {
      const pointsDiff = b[1].points - a[1].points;
      if (pointsDiff !== 0) {
        return pointsDiff;
      }

      const goalDiff = b[1].goalDiff - a[1].goalDiff;
      if (goalDiff !== 0) {
        return goalDiff;
      }

      return b[1].goalsFor - a[1].goalsFor;
    });

    const rankIndex = sorted.findIndex(([id]) => id === teamId);
    if (rankIndex === -1) {
      return null;
    }

    return { rank: rankIndex + 1 };
  }

  private zeroFeatures(): Record<string, number> {
    return {
      recentFormScore: 0,
      homeAwayStrength: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0,
      tableRank: 0,
      opponentStrengthDiff: 0,
      restDays: 0,
      missingPlayersCount: 0,
    };
  }
}

const formPoints = (
  matches: Array<{
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
  }>,
  teamId: string,
): number => {
  let total = 0;

  for (const match of matches.slice(0, 5)) {
    const isHome = match.homeTeamId === teamId;
    const goalsFor = isHome ? Number(match.homeScore ?? 0) : Number(match.awayScore ?? 0);
    const goalsAgainst = isHome ? Number(match.awayScore ?? 0) : Number(match.homeScore ?? 0);

    if (goalsFor > goalsAgainst) {
      total += 3;
    } else if (goalsFor === goalsAgainst) {
      total += 1;
    }
  }

  return total;
};

const avgGoalsFor = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  const total = matches.reduce((sum, match) => {
    const isHome = match.homeTeamId === teamId;
    return sum + Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
  }, 0);

  return total / matches.length;
};

const avgGoalsAgainst = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  const total = matches.reduce((sum, match) => {
    const isHome = match.homeTeamId === teamId;
    return sum + Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
  }, 0);

  return total / matches.length;
};

const winRate = (
  matches: Array<{ homeScore: number | null; awayScore: number | null }>,
  homePerspective: boolean,
): number => {
  if (!matches.length) {
    return 0;
  }

  const wins = matches.filter((match) =>
    homePerspective
      ? Number(match.homeScore ?? 0) > Number(match.awayScore ?? 0)
      : Number(match.awayScore ?? 0) > Number(match.homeScore ?? 0),
  ).length;

  return wins / matches.length;
};

const daysSinceLastMatch = (lastMatchDate: Date | undefined, nextMatchDate: Date): number => {
  if (!lastMatchDate) {
    return 7;
  }
  const diffMs = Math.max(0, nextMatchDate.getTime() - lastMatchDate.getTime());
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

const round2 = (value: number): number => Number(value.toFixed(2));

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeEloStrength = (homeElo: number, awayElo: number): number => {
  const diff = homeElo + 55 - awayElo;
  return Math.max(-1, Math.min(1, diff / 400));
};
