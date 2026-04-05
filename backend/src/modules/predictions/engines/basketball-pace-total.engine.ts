import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class BasketballPaceTotalEngine implements PredictionEngine {
  key = 'basketball-pace-total';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return {
        probabilities: { homeWin: 0.52, draw: 0, awayWin: 0.48 },
        expectedScore: { home: 107, away: 103 },
      };
    }

    const [home, away] = await Promise.all([
      this.teamTempoProfile(match.homeTeamId, match.matchDate),
      this.teamTempoProfile(match.awayTeamId, match.matchDate),
    ]);

    const expectedTotal = (home.pace + away.pace) * ((home.efficiency + away.efficiency) / 200);
    const expectedHome = expectedTotal * 0.51;
    const expectedAway = expectedTotal * 0.49;

    const homeWin = clamp(0.5 + (home.efficiency - away.efficiency) / 100, 0.06, 0.94);

    return {
      probabilities: {
        homeWin: Number(homeWin.toFixed(4)),
        draw: 0,
        awayWin: Number((1 - homeWin).toFixed(4)),
      },
      expectedScore: {
        home: Number(expectedHome.toFixed(2)),
        away: Number(expectedAway.toFixed(2)),
      },
    };
  }

  private async teamTempoProfile(teamId: string, beforeDate: Date): Promise<{ pace: number; efficiency: number }> {
    const [matches, stats] = await Promise.all([
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          status: MatchStatus.COMPLETED,
          matchDate: { lt: beforeDate },
        },
        orderBy: { matchDate: 'desc' },
        take: 10,
        select: {
          homeTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      }),
      this.prisma.teamStat.findMany({
        where: {
          teamId,
          match: {
            status: MatchStatus.COMPLETED,
            matchDate: { lt: beforeDate },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!matches.length) {
      return { pace: 98, efficiency: 108 };
    }

    let totalPoints = 0;
    for (const row of matches) {
      const isHome = row.homeTeamId === teamId;
      totalPoints += Number(isHome ? row.homeScore ?? 0 : row.awayScore ?? 0);
    }

    const paceValues = stats
      .map((stat) => Number((stat.payload as Record<string, unknown> | null)?.pace ?? stat.shots ?? 0))
      .filter((value) => value > 0 && Number.isFinite(value));

    const possessions = paceValues.length
      ? paceValues.reduce((sum, value) => sum + value, 0) / paceValues.length
      : 98;

    const efficiency = (totalPoints / matches.length / Math.max(1, possessions)) * 100;

    return {
      pace: Number(possessions.toFixed(2)),
      efficiency: Number(efficiency.toFixed(2)),
    };
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));