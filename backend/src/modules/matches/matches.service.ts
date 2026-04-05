import { Injectable } from '@nestjs/common';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { CACHE_TTL_SECONDS } from 'src/shared/constants/cache.constants';
import { MatchListQueryDto } from 'src/shared/dto/match-list-query.dto';
import { MatchesRepository } from './matches.repository';

@Injectable()
export class MatchesService {
  constructor(
    private readonly repository: MatchesRepository,
    private readonly cacheService: CacheService,
  ) {}

  async list(query: MatchListQueryDto) {
    const { items, total } = await this.repository.list(query);
    return { data: items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async today() { return { data: await this.repository.today() }; }
  async tomorrow() { return { data: await this.repository.tomorrow() }; }
  async live() { return { data: await this.repository.live() }; }
  async completed() { return { data: await this.repository.completed() }; }

  async detail(id: string) {
    return this.cacheService.getOrSet(CacheKeys.matchDetail(id), CACHE_TTL_SECONDS.matches, async () => ({
      data: await this.repository.detail(id),
    }));
  }

  async events(id: string) { return { data: await this.repository.events(id) }; }
  async stats(id: string) { return { data: await this.repository.stats(id) }; }

  async prediction(id: string) {
    const item = await this.repository.prediction(id);
    if (!item) {
      return { data: null };
    }

    return {
      data: {
        matchId: item.match.id,
        sport: String(item.match.sport.code || '').toLowerCase(),
        league: {
          id: item.match.league.id,
          name: item.match.league.name,
        },
        homeTeam: {
          id: item.match.homeTeam.id,
          name: item.match.homeTeam.name,
          logo: item.match.homeTeam.logoUrl,
        },
        awayTeam: {
          id: item.match.awayTeam.id,
          name: item.match.awayTeam.name,
          logo: item.match.awayTeam.logoUrl,
        },
        matchDate: item.match.matchDate.toISOString(),
        status: String(item.match.status || '').toLowerCase(),
        probabilities: item.probabilities,
        expectedScore: item.expectedScore,
        confidenceScore: item.confidenceScore,
        summary: item.summary,
        riskFlags: item.riskFlags || [],
        updatedAt: item.updatedAt.toISOString(),
        isRecommended: item.isRecommended ?? true,
        isLowConfidence: item.isLowConfidence ?? false,
        avoidReason: item.avoidReason ?? null,
      },
    };
  }
}
