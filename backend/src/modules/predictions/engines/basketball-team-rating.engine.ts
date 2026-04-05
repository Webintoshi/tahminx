import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionEngine, PredictionEngineInput, PredictionEngineOutput } from './prediction.interfaces';

@Injectable()
export class BasketballTeamRatingEngine implements PredictionEngine {
  key = 'basketball-team-rating';

  constructor(private readonly prisma: PrismaService) {}

  async run(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const match = await this.prisma.match.findUnique({
      where: { id: input.matchId },
      select: { matchDate: true, homeTeamId: true, awayTeamId: true },
    });

    if (!match) {
      return {
        probabilities: { homeWin: 0.53, draw: 0, awayWin: 0.47 },
        expectedScore: { home: 108, away: 104 },
      };
    }

    const [homeProfile, awayProfile] = await Promise.all([
      this.teamProfile(match.homeTeamId, match.matchDate),
      this.teamProfile(match.awayTeamId, match.matchDate),
    ]);

    const ratingGap = homeProfile.net - awayProfile.net + 2.5;
    const homeWin = clamp(1 / (1 + Math.exp(-ratingGap / 6)), 0.05, 0.95);

    return {
      probabilities: {
        homeWin: Number(homeWin.toFixed(4)),
        draw: 0,
        awayWin: Number((1 - homeWin).toFixed(4)),
      },
      expectedScore: {
        home: Number(((homeProfile.scored + awayProfile.conceded) / 2).toFixed(2)),
        away: Number(((awayProfile.scored + homeProfile.conceded) / 2).toFixed(2)),
      },
    };
  }

  private async teamProfile(teamId: string, beforeDate: Date): Promise<{ scored: number; conceded: number; net: number }> {
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
      return { scored: 108, conceded: 106, net: 2 };
    }

    let scored = 0;
    let conceded = 0;

    for (const row of rows) {
      const isHome = row.homeTeamId === teamId;
      scored += Number(isHome ? row.homeScore ?? 0 : row.awayScore ?? 0);
      conceded += Number(isHome ? row.awayScore ?? 0 : row.homeScore ?? 0);
    }

    const avgScored = scored / rows.length;
    const avgConceded = conceded / rows.length;

    return {
      scored: avgScored,
      conceded: avgConceded,
      net: avgScored - avgConceded,
    };
  }
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));