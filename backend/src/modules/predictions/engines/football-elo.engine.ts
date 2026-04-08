import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

const ARCHIVE_RATING_TYPE = 'elo';

@Injectable()
export class FootballEloEngine implements PredictionEngine {
  key = 'football-elo';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { leagueId: true, matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return defaultOutput();
    }

    const [homeSnapshotRating, awaySnapshotRating] = await Promise.all([
      this.loadSnapshotRating(match.homeTeamId, match.matchDate),
      this.loadSnapshotRating(match.awayTeamId, match.matchDate),
    ]);

    const completedMatches = await this.prisma.match.findMany({
      where: {
        leagueId: match.leagueId,
        status: MatchStatus.COMPLETED,
        matchDate: { lt: match.matchDate },
      },
      orderBy: { matchDate: 'asc' },
      take: 400,
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    });

    const ratings =
      homeSnapshotRating !== null && awaySnapshotRating !== null ? null : this.buildFallbackRatings(completedMatches);

    const homeRating = (homeSnapshotRating ?? ratings?.get(match.homeTeamId) ?? 1500) + 55;
    const awayRating = awaySnapshotRating ?? ratings?.get(match.awayTeamId) ?? 1500;
    const diff = homeRating - awayRating;

    const baseHome = clamp01(1 / (1 + Math.exp(-diff / 180)));
    const draw = clamp01(0.22 - Math.min(0.08, Math.abs(diff) / 2200));
    const homeWin = clamp01(baseHome * (1 - draw));
    const awayWin = clamp01(1 - draw - homeWin);

    const homeScoring = await this.avgGoals(match.homeTeamId, true, match.matchDate);
    const awayScoring = await this.avgGoals(match.awayTeamId, false, match.matchDate);

    return {
      probabilities: normalizeProbabilities({
        homeWin,
        draw,
        awayWin,
      }),
      expectedScore: {
        home: round2((homeScoring.for + awayScoring.against) / 2),
        away: round2((awayScoring.for + homeScoring.against) / 2),
      },
    };
  }

  private async avgGoals(teamId: string, homePerspective: boolean, beforeDate: Date) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 10,
      select: { homeTeamId: true, homeScore: true, awayScore: true },
    });

    if (!matches.length) {
      return { for: homePerspective ? 1.45 : 1.2, against: homePerspective ? 1.1 : 1.35 };
    }

    let gf = 0;
    let ga = 0;
    for (const match of matches) {
      const isHome = match.homeTeamId === teamId;
      gf += Number(isHome ? match.homeScore ?? 0 : match.awayScore ?? 0);
      ga += Number(isHome ? match.awayScore ?? 0 : match.homeScore ?? 0);
    }

    return {
      for: gf / matches.length,
      against: ga / matches.length,
    };
  }

  private async loadSnapshotRating(teamId: string, beforeDate: Date): Promise<number | null> {
    const snapshot = await this.prisma.teamRatingSnapshot.findFirst({
      where: {
        teamId,
        ratingType: ARCHIVE_RATING_TYPE,
        snapshotDate: { lte: beforeDate },
      },
      orderBy: { snapshotDate: 'desc' },
      select: { ratingValue: true },
    });

    return snapshot ? Number(snapshot.ratingValue) : null;
  }

  private buildFallbackRatings(
    completedMatches: Array<{
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number | null;
      awayScore: number | null;
    }>,
  ) {
    const ratings = new Map<string, number>();
    for (const completed of completedMatches) {
      const home = ratings.get(completed.homeTeamId) ?? 1500;
      const away = ratings.get(completed.awayTeamId) ?? 1500;
      const homeExpected = 1 / (1 + Math.pow(10, (away - (home + 55)) / 400));
      const awayExpected = 1 - homeExpected;

      const homeGoals = Number(completed.homeScore ?? 0);
      const awayGoals = Number(completed.awayScore ?? 0);

      const homeActual = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0;
      const awayActual = 1 - homeActual;

      const goalDiff = Math.max(1, Math.abs(homeGoals - awayGoals));
      const k = 20 + Math.min(20, goalDiff * 5);

      ratings.set(completed.homeTeamId, home + k * (homeActual - homeExpected));
      ratings.set(completed.awayTeamId, away + k * (awayActual - awayExpected));
    }

    return ratings;
  }
}

const normalizeProbabilities = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const total = values.homeWin + values.draw + values.awayWin;
  if (!total) {
    return { homeWin: 0.34, draw: 0.32, awayWin: 0.34 };
  }

  return {
    homeWin: round4(values.homeWin / total),
    draw: round4(values.draw / total),
    awayWin: round4(values.awayWin / total),
  };
};

const clamp01 = (value: number): number => Math.max(0.01, Math.min(0.98, value));
const round2 = (value: number): number => Number(value.toFixed(2));
const round4 = (value: number): number => Number(value.toFixed(4));

const defaultOutput = (): PredictionEngineOutput => ({
  probabilities: { homeWin: 0.45, draw: 0.27, awayWin: 0.28 },
  expectedScore: { home: 1.4, away: 1.1 },
});
