import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { TeamListQueryDto } from 'src/shared/dto/team-list-query.dto';

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildLeagueHistorySummary(
    groups: Array<{
      leagueId: string;
      seasonId: string | null;
      _count: { _all: number };
      _min: { matchDate: Date | null };
      _max: { matchDate: Date | null };
    }>,
    leagues: Array<{ id: string; name: string; country: string | null }>,
    seasons: Array<{ id: string; name: string }>
  ) {
    const leagueMap = new Map(leagues.map((league) => [league.id, league]));
    const seasonMap = new Map(seasons.map((season) => [season.id, season]));
    const summaryMap = new Map<
      string,
      {
        leagueId: string;
        leagueName: string;
        country: string | null;
        matchCount: number;
        firstMatchAt: Date | null;
        lastMatchAt: Date | null;
        seasonNames: Set<string>;
        latestSeasonLabel: string | null;
      }
    >();

    for (const group of groups) {
      const league = leagueMap.get(group.leagueId);
      if (!league) continue;

      const seasonName = group.seasonId ? seasonMap.get(group.seasonId)?.name ?? null : null;
      const existing =
        summaryMap.get(group.leagueId) ??
        {
          leagueId: league.id,
          leagueName: league.name,
          country: league.country,
          matchCount: 0,
          firstMatchAt: null,
          lastMatchAt: null,
          seasonNames: new Set<string>(),
          latestSeasonLabel: null,
        };

      existing.matchCount += group._count._all;

      if (group._min.matchDate && (!existing.firstMatchAt || group._min.matchDate < existing.firstMatchAt)) {
        existing.firstMatchAt = group._min.matchDate;
      }

      if (group._max.matchDate && (!existing.lastMatchAt || group._max.matchDate > existing.lastMatchAt)) {
        existing.lastMatchAt = group._max.matchDate;
        existing.latestSeasonLabel = seasonName;
      }

      if (seasonName) {
        existing.seasonNames.add(seasonName);
      }

      summaryMap.set(group.leagueId, existing);
    }

    return Array.from(summaryMap.values())
      .map((item) => ({
        leagueId: item.leagueId,
        leagueName: item.leagueName,
        country: item.country,
        seasonLabel: item.latestSeasonLabel,
        matchCount: item.matchCount,
        seasonCount: item.seasonNames.size,
        firstMatchAt: item.firstMatchAt?.toISOString() ?? null,
        lastMatchAt: item.lastMatchAt?.toISOString() ?? null,
      }))
      .sort((left, right) => {
        const leftTime = left.lastMatchAt ? new Date(left.lastMatchAt).getTime() : 0;
        const rightTime = right.lastMatchAt ? new Date(right.lastMatchAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }

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

    const teamMatchWhere: Prisma.MatchWhereInput = {
      OR: [{ homeTeamId: id }, { awayTeamId: id }],
    };

    const [
      recentMatches,
      formTrend,
      squad,
      upcomingMatches,
      homeStats,
      awayStats,
      latestMatch,
      currentSeasonMatch,
      matchSummary,
      completedMatchesCount,
      scheduledMatchesCount,
      leagueSeasonGroups,
    ] = await Promise.all([
      this.prisma.match.findMany({
        where: teamMatchWhere,
        include: { league: true, homeTeam: true, awayTeam: true },
        orderBy: { matchDate: 'desc' },
        take: 10,
      }),
      this.prisma.teamFormSnapshot.findFirst({ where: { teamId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.player.findMany({ where: { teamId: id, deletedAt: null }, orderBy: { name: 'asc' } }),
      this.prisma.match.findMany({
        where: {
          ...teamMatchWhere,
          status: 'SCHEDULED',
        },
        include: { league: true, homeTeam: true, awayTeam: true },
        orderBy: { matchDate: 'asc' },
        take: 5,
      }),
      this.prisma.match.aggregate({ where: { homeTeamId: id, status: 'COMPLETED' }, _avg: { homeScore: true, awayScore: true } }),
      this.prisma.match.aggregate({ where: { awayTeamId: id, status: 'COMPLETED' }, _avg: { awayScore: true, homeScore: true } }),
      this.prisma.match.findFirst({
        where: teamMatchWhere,
        include: { league: true, season: true },
        orderBy: { matchDate: 'desc' },
      }),
      this.prisma.match.findFirst({
        where: {
          ...teamMatchWhere,
          season: { isCurrent: true },
        },
        include: { league: true, season: true },
        orderBy: { matchDate: 'desc' },
      }),
      this.prisma.match.aggregate({
        where: teamMatchWhere,
        _count: { _all: true },
        _min: { matchDate: true },
        _max: { matchDate: true },
      }),
      this.prisma.match.count({ where: { ...teamMatchWhere, status: 'COMPLETED' } }),
      this.prisma.match.count({ where: { ...teamMatchWhere, status: { not: 'COMPLETED' } } }),
      this.prisma.match.groupBy({
        by: ['leagueId', 'seasonId'],
        where: teamMatchWhere,
        _count: { _all: true },
        _min: { matchDate: true },
        _max: { matchDate: true },
      }),
    ]);

    const leagueIds = [...new Set(leagueSeasonGroups.map((item) => item.leagueId))];
    const seasonIds = [...new Set(leagueSeasonGroups.flatMap((item) => (item.seasonId ? [item.seasonId] : [])))];

    const [leagues, seasons] = await Promise.all([
      this.prisma.league.findMany({
        where: { id: { in: leagueIds } },
        select: { id: true, name: true, country: true },
      }),
      this.prisma.season.findMany({
        where: { id: { in: seasonIds } },
        select: { id: true, name: true },
      }),
    ]);

    const leagueHistory = this.buildLeagueHistorySummary(leagueSeasonGroups, leagues, seasons);
    const currentLeague = currentSeasonMatch
      ? {
          leagueId: currentSeasonMatch.league.id,
          leagueName: currentSeasonMatch.league.name,
          country: currentSeasonMatch.league.country,
          seasonLabel: currentSeasonMatch.season?.name ?? null,
          matchCount: leagueHistory.find((item) => item.leagueId === currentSeasonMatch.league.id)?.matchCount ?? 0,
          seasonCount: leagueHistory.find((item) => item.leagueId === currentSeasonMatch.league.id)?.seasonCount ?? 0,
          firstMatchAt: leagueHistory.find((item) => item.leagueId === currentSeasonMatch.league.id)?.firstMatchAt ?? null,
          lastMatchAt: leagueHistory.find((item) => item.leagueId === currentSeasonMatch.league.id)?.lastMatchAt ?? null,
          isCurrent: true,
        }
      : null;
    const latestLeague = latestMatch
      ? {
          leagueId: latestMatch.league.id,
          leagueName: latestMatch.league.name,
          country: latestMatch.league.country,
          seasonLabel: latestMatch.season?.name ?? null,
          matchCount: leagueHistory.find((item) => item.leagueId === latestMatch.league.id)?.matchCount ?? 0,
          seasonCount: leagueHistory.find((item) => item.leagueId === latestMatch.league.id)?.seasonCount ?? 0,
          firstMatchAt: leagueHistory.find((item) => item.leagueId === latestMatch.league.id)?.firstMatchAt ?? null,
          lastMatchAt: leagueHistory.find((item) => item.leagueId === latestMatch.league.id)?.lastMatchAt ?? null,
          isCurrent: currentLeague?.leagueId === latestMatch.league.id,
        }
      : null;

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
      currentLeague,
      latestLeague,
      leagueHistory,
      matchHistorySummary: {
        totalMatches: matchSummary._count._all,
        completedMatches: completedMatchesCount,
        scheduledMatches: scheduledMatchesCount,
        firstMatchAt: matchSummary._min.matchDate?.toISOString() ?? null,
        lastMatchAt: matchSummary._max.matchDate?.toISOString() ?? null,
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
