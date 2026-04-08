import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';
import { LeagueListQueryDto } from 'src/shared/dto/league-list-query.dto';
import { LeaguesRepository } from './leagues.repository';

@Injectable()
export class LeaguesService {
  constructor(
    private readonly repository: LeaguesRepository,
    private readonly cacheService: CacheService,
  ) {}

  async list(query: LeagueListQueryDto) {
    const { items, total } = await this.repository.list(query);
    return {
      data: items,
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async detail(id: string) {
    return this.cacheService.getOrSet(CacheKeys.leagueDetail(id), CACHE_TTL_SECONDS.standings, async () => {
      const league = await this.repository.detail(id);
      if (!league) {
        throw new NotFoundException('League not found');
      }

      const currentSeason = (await this.repository.currentSeason(id)) || (await this.repository.latestSeason(id));

      const [standings, recentResults, upcomingMatches, stats] = await Promise.all([
        this.repository.standings(id, currentSeason?.id),
        this.repository.recentResults(id),
        this.repository.upcomingMatches(id),
        this.repository.statsSummary(id),
      ]);

      return {
        data: {
          league,
          currentSeason,
          standings,
          recentResults,
          upcomingMatches,
          statsSummary: {
            totalMatches: stats._count.id,
            avgHomeScore: stats._avg.homeScore,
            avgAwayScore: stats._avg.awayScore,
          },
        },
      };
    });
  }

  async standings(id: string) {
    return this.cacheService.getOrSet(CacheKeys.leagueStandings(id), CACHE_TTL_SECONDS.standings, async () => {
      const season = (await this.repository.currentSeason(id)) || (await this.repository.latestSeason(id));
      return {
        data: await this.repository.standings(id, season?.id),
      };
    });
  }
}
