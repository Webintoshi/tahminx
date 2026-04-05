import { Injectable } from '@nestjs/common';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { TeamListQueryDto } from 'src/shared/dto/team-list-query.dto';
import { TeamsRepository } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(private readonly repository: TeamsRepository) {}

  async list(query: TeamListQueryDto) {
    const { items, total } = await this.repository.list(query);
    return {
      data: items,
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async detail(id: string) {
    const payload = await this.repository.detail(id);
    return { data: payload };
  }

  async teamMatches(id: string) {
    return { data: await this.repository.teamMatches(id) };
  }

  async teamForm(id: string) {
    return { data: await this.repository.form(id) };
  }

  async teamSquad(id: string) {
    return { data: await this.repository.squad(id) };
  }
}
