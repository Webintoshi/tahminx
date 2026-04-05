import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  listByLeague(leagueId: string) {
    return this.prisma.season.findMany({ where: { leagueId }, orderBy: { seasonYear: 'desc' } });
  }
}
