import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';

@Injectable()
export class PlayersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto, teamId?: string) {
    const skip = (query.page - 1) * query.pageSize;
    const where = {
      deletedAt: null,
      ...(teamId ? { teamId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.player.findMany({ where, include: { team: true }, skip, take: query.pageSize, orderBy: { name: 'asc' } }),
      this.prisma.player.count({ where }),
    ]);

    return { items, total };
  }

  async detail(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const stats = await this.prisma.playerStat.findMany({ where: { playerId: id }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { ...player, stats };
  }
}
