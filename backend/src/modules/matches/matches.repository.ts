import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { MatchListQueryDto } from 'src/shared/dto/match-list-query.dto';

@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MatchListQueryDto) {
    const where: Prisma.MatchWhereInput = {
      deletedAt: null,
      ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(query.teamId
        ? { OR: [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }] }
        : {}),
      ...(query.status ? { status: query.status.toUpperCase() as MatchStatus } : {}),
      ...(query.date
        ? {
            matchDate: {
              gte: new Date(`${query.date}T00:00:00.000Z`),
              lt: new Date(`${query.date}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(query.from || query.to
        ? {
            matchDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { homeTeam: { name: { contains: query.search, mode: 'insensitive' } } },
              { awayTeam: { name: { contains: query.search, mode: 'insensitive' } } },
              { league: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const orderBy = { [query.sortBy || 'matchDate']: query.sortOrder || 'asc' } as Prisma.MatchOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        include: {
          league: true,
          homeTeam: true,
          awayTeam: true,
          predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        skip,
        take: query.pageSize,
        orderBy,
      }),
      this.prisma.match.count({ where }),
    ]);

    return { items, total };
  }

  async detail(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        league: true,
        season: true,
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const [events, teamStats, homeSquad, awaySquad, prediction, h2h] = await Promise.all([
      this.prisma.matchEvent.findMany({ where: { matchId: id }, orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.teamStat.findMany({ where: { matchId: id }, include: { team: true } }),
      this.prisma.player.findMany({ where: { teamId: match.homeTeamId, deletedAt: null }, take: 30 }),
      this.prisma.player.findMany({ where: { teamId: match.awayTeamId, deletedAt: null }, take: 30 }),
      this.prisma.prediction.findFirst({
        where: { matchId: id, status: 'PUBLISHED' },
        include: { explanation: true, modelVersion: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.match.findMany({
        where: {
          OR: [
            { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId },
            { homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId },
          ],
          status: 'COMPLETED',
          id: { not: id },
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      overview: match,
      form: {
        home: await this.prisma.teamFormSnapshot.findFirst({ where: { teamId: match.homeTeamId }, orderBy: { createdAt: 'desc' } }),
        away: await this.prisma.teamFormSnapshot.findFirst({ where: { teamId: match.awayTeamId }, orderBy: { createdAt: 'desc' } }),
      },
      comparison: teamStats,
      h2h,
      squad: {
        home: homeSquad,
        away: awaySquad,
      },
      events,
      prediction,
      riskFlags: prediction?.riskFlags ?? [],
    };
  }

  today() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
    return this.prisma.match.findMany({
      where: { matchDate: { gte: start, lte: end } },
      include: { league: true, homeTeam: true, awayTeam: true },
      take: 300,
      orderBy: { matchDate: 'asc' },
    });
  }

  tomorrow() {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const end = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 23, 59, 59));
    return this.prisma.match.findMany({
      where: { matchDate: { gte: next, lte: end } },
      include: { league: true, homeTeam: true, awayTeam: true },
      take: 300,
      orderBy: { matchDate: 'asc' },
    });
  }

  live() {
    return this.prisma.match.findMany({
      where: { status: 'LIVE' },
      include: { league: true, homeTeam: true, awayTeam: true },
      take: 300,
      orderBy: { matchDate: 'asc' },
    });
  }

  completed() {
    return this.prisma.match.findMany({ where: { status: 'COMPLETED' }, include: { league: true, homeTeam: true, awayTeam: true }, take: 200, orderBy: { matchDate: 'desc' } });
  }

  events(matchId: string) {
    return this.prisma.matchEvent.findMany({ where: { matchId }, orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }] });
  }

  stats(matchId: string) {
    return this.prisma.teamStat.findMany({ where: { matchId }, include: { team: true } });
  }

  prediction(matchId: string) {
    return this.prisma.prediction.findFirst({
      where: { matchId, status: 'PUBLISHED' },
      include: { explanation: true, modelVersion: true, match: { include: { league: true, homeTeam: true, awayTeam: true, sport: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
