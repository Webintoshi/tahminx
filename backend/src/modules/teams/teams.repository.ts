import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { TeamListQueryDto } from 'src/shared/dto/team-list-query.dto';

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TeamListQueryDto) {
    const where: Prisma.TeamWhereInput = {
      deletedAt: null,
      ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        include: { sport: true },
        orderBy: { name: 'asc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);

    return { items, total };
  }

  async detail(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id }, include: { sport: true } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const [recentMatches, formTrend, squad, upcomingMatches, homeStats, awayStats] = await Promise.all([
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: id }, { awayTeamId: id }],
        },
        include: { league: true, homeTeam: true, awayTeam: true },
        orderBy: { matchDate: 'desc' },
        take: 10,
      }),
      this.prisma.teamFormSnapshot.findFirst({ where: { teamId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.player.findMany({ where: { teamId: id, deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.match.findMany({
        where: {
          OR: [{ homeTeamId: id }, { awayTeamId: id }],
          status: 'SCHEDULED',
        },
        include: { league: true, homeTeam: true, awayTeam: true },
        orderBy: { matchDate: 'asc' },
        take: 5,
      }),
      this.prisma.match.aggregate({ where: { homeTeamId: id, status: 'COMPLETED' }, _avg: { homeScore: true, awayScore: true } }),
      this.prisma.match.aggregate({ where: { awayTeamId: id, status: 'COMPLETED' }, _avg: { awayScore: true, homeScore: true } }),
    ]);

    return {
      team,
      recentMatches,
      formTrend,
      squad,
      upcomingMatches,
      homeAwayMetrics: {
        homeAvgScored: homeStats._avg.homeScore,
        homeAvgConceded: homeStats._avg.awayScore,
        awayAvgScored: awayStats._avg.awayScore,
        awayAvgConceded: awayStats._avg.homeScore,
      },
    };
  }

  teamMatches(id: string) {
    return this.prisma.match.findMany({
      where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
      include: { league: true, homeTeam: true, awayTeam: true },
      orderBy: { matchDate: 'desc' },
      take: 200,
    });
  }

  form(id: string) {
    return this.prisma.teamFormSnapshot.findFirst({ where: { teamId: id }, orderBy: { createdAt: 'desc' } });
  }

  squad(id: string) {
    return this.prisma.player.findMany({ where: { teamId: id, deletedAt: null }, orderBy: { name: 'asc' } });
  }
}
