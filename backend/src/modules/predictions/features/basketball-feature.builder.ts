import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { FeatureBuilder, PredictionEngineInput } from '../engines/prediction.interfaces';

@Injectable()
export class BasketballFeatureBuilder implements FeatureBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(input: PredictionEngineInput): Promise<Record<string, number>> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: {
        matchDate: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    if (!match) {
      return this.zeroFeatures();
    }

    const [homeRecent, awayRecent, teamStats] = await Promise.all([
      this.loadRecentTeamMatches(match.homeTeamId, match.matchDate),
      this.loadRecentTeamMatches(match.awayTeamId, match.matchDate),
      this.prisma.teamStat.findMany({
        where: {
          match: {
            OR: [
              { homeTeamId: match.homeTeamId },
              { awayTeamId: match.homeTeamId },
              { homeTeamId: match.awayTeamId },
              { awayTeamId: match.awayTeamId },
            ],
            status: MatchStatus.COMPLETED,
            matchDate: { lt: match.matchDate },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ]);

    const homeForm = formRate(homeRecent, match.homeTeamId);
    const awayForm = formRate(awayRecent, match.awayTeamId);

    const offensiveRating = avgPointsFor(homeRecent, match.homeTeamId);
    const defensiveRating = avgPointsAgainst(awayRecent, match.awayTeamId);

    const paceValues = teamStats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.pace ?? stat.shots ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const reboundRates = teamStats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.reboundRate ?? (stat.payload as Record<string, unknown> | null)?.rebounds ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const turnoverRates = teamStats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.turnoverRate ?? (stat.payload as Record<string, unknown> | null)?.turnovers ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0);

    const restDays = Math.min(
      daysSinceLastMatch(homeRecent[0]?.matchDate, match.matchDate),
      daysSinceLastMatch(awayRecent[0]?.matchDate, match.matchDate),
    );

    return {
      recentFormScore: round2(homeForm - awayForm),
      offensiveRating: round2(offensiveRating),
      defensiveRating: round2(defensiveRating),
      pace: round2(avgFromList(paceValues, 98)),
      reboundRate: round2(avgFromList(reboundRates, 50)),
      turnoverRate: round2(avgFromList(turnoverRates, 12)),
      restDays,
      homeAdvantageScore: round2(homeAdvantage(homeRecent, awayRecent, match.homeTeamId, match.awayTeamId)),
    };
  }

  private async loadRecentTeamMatches(teamId: string, beforeDate: Date) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });
  }

  private zeroFeatures(): Record<string, number> {
    return {
      recentFormScore: 0,
      offensiveRating: 0,
      defensiveRating: 0,
      pace: 98,
      reboundRate: 50,
      turnoverRate: 12,
      restDays: 0,
      homeAdvantageScore: 0,
    };
  }
}

const formRate = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  let wins = 0;
  for (const match of matches.slice(0, 5)) {
    const isHome = match.homeTeamId === teamId;
    const scored = Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
    const conceded = Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
    if (scored > conceded) {
      wins += 1;
    }
  }

  return wins / Math.min(matches.length, 5);
};

const avgPointsFor = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  return (
    matches.reduce((sum, match) => {
      const isHome = match.homeTeamId === teamId;
      return sum + Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
    }, 0) / matches.length
  );
};

const avgPointsAgainst = (
  matches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  teamId: string,
): number => {
  if (!matches.length) {
    return 0;
  }

  return (
    matches.reduce((sum, match) => {
      const isHome = match.homeTeamId === teamId;
      return sum + Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
    }, 0) / matches.length
  );
};

const daysSinceLastMatch = (lastMatchDate: Date | undefined, nextMatchDate: Date): number => {
  if (!lastMatchDate) {
    return 3;
  }
  const diffMs = Math.max(0, nextMatchDate.getTime() - lastMatchDate.getTime());
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

const homeAdvantage = (
  homeMatches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  awayMatches: Array<{ homeTeamId: string; homeScore: number | null; awayScore: number | null }>,
  homeTeamId: string,
  awayTeamId: string,
): number => {
  const homeDiff = homeMatches.slice(0, 5).reduce((sum, match) => {
    const scored = Number(match.homeTeamId === homeTeamId ? match.homeScore ?? 0 : match.awayScore ?? 0);
    const conceded = Number(match.homeTeamId === homeTeamId ? match.awayScore ?? 0 : match.homeScore ?? 0);
    return sum + (scored - conceded);
  }, 0);

  const awayDiff = awayMatches.slice(0, 5).reduce((sum, match) => {
    const scored = Number(match.homeTeamId === awayTeamId ? match.homeScore ?? 0 : match.awayScore ?? 0);
    const conceded = Number(match.homeTeamId === awayTeamId ? match.awayScore ?? 0 : match.homeScore ?? 0);
    return sum + (scored - conceded);
  }, 0);

  return (homeDiff - awayDiff) / 10;
};

const avgFromList = (values: number[], fallback: number): number => {
  if (!values.length) {
    return fallback;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const round2 = (value: number): number => Number(value.toFixed(2));