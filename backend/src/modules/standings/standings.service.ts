import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async byLeague(leagueId: string, seasonId?: string) {
    return this.prisma.standingsSnapshot.findMany({
      where: { leagueId, ...(seasonId ? { seasonId } : {}) },
      include: { team: true },
      orderBy: { rank: 'asc' },
    });
  }

  async formTable(leagueId: string, seasonId?: string) {
    const standings = await this.byLeague(leagueId, seasonId);
    return standings.map((row) => ({ team: row.team.name, rank: row.rank, points: row.points, form: row.form }));
  }

  async summary(leagueId: string, seasonId?: string) {
    const standings = await this.byLeague(leagueId, seasonId);
    return {
      teams: standings.length,
      leader: standings[0] || null,
      relegationZone: standings.slice(-3),
    };
  }
}
