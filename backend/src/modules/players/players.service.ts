import { Injectable } from '@nestjs/common';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { PlayersRepository } from './players.repository';

@Injectable()
export class PlayersService {
  constructor(private readonly repository: PlayersRepository) {}

  async list(query: PaginationQueryDto, teamId?: string) {
    const { items, total } = await this.repository.list(query, teamId);
    return { data: items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async detail(id: string) {
    return { data: await this.repository.detail(id) };
  }
}
