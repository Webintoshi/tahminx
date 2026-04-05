import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  teamStats(teamId: string) {
    return this.prisma.teamStat.findMany({
      where: { teamId },
      include: { match: { include: { league: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  playerStats(playerId: string) {
    return this.prisma.playerStat.findMany({
      where: { playerId },
      include: { match: { include: { league: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async matchSummary(matchId: string) {
    const [teamStats, playerStats] = await Promise.all([
      this.prisma.teamStat.findMany({ where: { matchId }, include: { team: true } }),
      this.prisma.playerStat.findMany({ where: { matchId }, include: { player: true } }),
    ]);

    return {
      teamStats,
      playerStats,
    };
  }
}
