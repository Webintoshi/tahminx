import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { LeagueListQueryDto } from 'src/shared/dto/league-list-query.dto';

@Injectable()
export class LeaguesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LeagueListQueryDto) {
    const where: Prisma.LeagueWhereInput = {
      deletedAt: null,
      ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.league.findMany({
        where,
        include: { sport: true },
        skip,
        take: query.pageSize,
        orderBy: { name: 'asc' },
      }),
      this.prisma.league.count({ where }),
    ]);

    return { items, total };
  }

  detail(id: string) {
    return this.prisma.league.findUnique({
      where: { id },
      include: {
        sport: true,
        seasons: { orderBy: { seasonYear: 'desc' }, take: 3 },
      },
    });
  }

  currentSeason(leagueId: string) {
    return this.prisma.season.findFirst({ where: { leagueId, isCurrent: true }, orderBy: { seasonYear: 'desc' } });
  }

  standings(leagueId: string, seasonId?: string) {
    return this.prisma.standingsSnapshot.findMany({
      where: { leagueId, ...(seasonId ? { seasonId } : {}) },
      include: { team: true },
      orderBy: { rank: 'asc' },
    });
  }

  recentResults(leagueId: string) {
    return this.prisma.match.findMany({
      where: { leagueId, status: 'COMPLETED' },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchDate: 'desc' },
      take: 10,
    });
  }

  upcomingMatches(leagueId: string) {
    return this.prisma.match.findMany({
      where: { leagueId, status: 'SCHEDULED' },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { matchDate: 'asc' },
      take: 10,
    });
  }

  statsSummary(leagueId: string) {
    return this.prisma.match.aggregate({
      where: { leagueId },
      _count: { id: true },
      _avg: { homeScore: true, awayScore: true },
    });
  }
}
