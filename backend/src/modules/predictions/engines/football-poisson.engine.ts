import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class FootballPoissonEngine implements PredictionEngine {
  key = 'football-poisson';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return {
        probabilities: { homeWin: 0.45, draw: 0.27, awayWin: 0.28 },
        expectedScore: { home: 1.5, away: 1.2 },
      };
    }

    const [homeStats, awayStats] = await Promise.all([
      this.teamGoalProfile(match.homeTeamId, match.matchDate),
      this.teamGoalProfile(match.awayTeamId, match.matchDate),
    ]);

    const lambdaHome = clampMin((homeStats.for + awayStats.against) / 2, 0.2);
    const lambdaAway = clampMin((awayStats.for + homeStats.against) / 2, 0.2);

    const maxGoals = 6;
    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;

    for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
      for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
        const probability = poisson(lambdaHome, homeGoals) * poisson(lambdaAway, awayGoals);
        if (homeGoals > awayGoals) {
          homeWin += probability;
        } else if (homeGoals === awayGoals) {
          draw += probability;
        } else {
          awayWin += probability;
        }
      }
    }

    const normalized = normalize({ homeWin, draw, awayWin });

    return {
      probabilities: normalized,
      expectedScore: {
        home: Number(lambdaHome.toFixed(2)),
        away: Number(lambdaAway.toFixed(2)),
      },
    };
  }

  async previewMatchup(input: {
    homeTeamId: string;
    awayTeamId: string;
    beforeDate?: Date;
  }): Promise<PredictionEngineOutput> {
    const beforeDate = input.beforeDate ?? new Date();
    const [homeStats, awayStats] = await Promise.all([
      this.teamGoalProfile(input.homeTeamId, beforeDate),
      this.teamGoalProfile(input.awayTeamId, beforeDate),
    ]);

    const lambdaHome = clampMin((homeStats.for + awayStats.against) / 2, 0.2);
    const lambdaAway = clampMin((awayStats.for + homeStats.against) / 2, 0.2);

    const maxGoals = 6;
    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;

    for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
      for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
        const probability = poisson(lambdaHome, homeGoals) * poisson(lambdaAway, awayGoals);
        if (homeGoals > awayGoals) {
          homeWin += probability;
        } else if (homeGoals === awayGoals) {
          draw += probability;
        } else {
          awayWin += probability;
        }
      }
    }

    return {
      probabilities: normalize({ homeWin, draw, awayWin }),
      expectedScore: {
        home: Number(lambdaHome.toFixed(2)),
        away: Number(lambdaAway.toFixed(2)),
      },
    };
  }

  private async teamGoalProfile(teamId: string, beforeDate: Date): Promise<{ for: number; against: number }> {
    const rows = await this.prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        status: MatchStatus.COMPLETED,
        matchDate: { lt: beforeDate },
      },
      orderBy: { matchDate: 'desc' },
      take: 12,
      select: {
        homeTeamId: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!rows.length) {
      return { for: 1.4, against: 1.2 };
    }

    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const row of rows) {
      const isHome = row.homeTeamId === teamId;
      goalsFor += Number(isHome ? row.homeScore ?? 0 : row.awayScore ?? 0);
      goalsAgainst += Number(isHome ? row.awayScore ?? 0 : row.homeScore ?? 0);
    }

    return {
      for: goalsFor / rows.length,
      against: goalsAgainst / rows.length,
    };
  }
}

const poisson = (lambda: number, k: number): number => {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
};

const factorial = (n: number): number => {
  if (n <= 1) return 1;
  let out = 1;
  for (let i = 2; i <= n; i += 1) {
    out *= i;
  }
  return out;
};

const normalize = (values: { homeWin: number; draw: number; awayWin: number }) => {
  const total = values.homeWin + values.draw + values.awayWin;
  if (total === 0) {
    return { homeWin: 0.45, draw: 0.27, awayWin: 0.28 };
  }

  return {
    homeWin: Number((values.homeWin / total).toFixed(4)),
    draw: Number((values.draw / total).toFixed(4)),
    awayWin: Number((values.awayWin / total).toFixed(4)),
  };
};

const clampMin = (value: number, min: number): number => (value < min ? min : value);
