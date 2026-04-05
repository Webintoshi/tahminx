import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { LogsQueryDto } from './dto/logs-query.dto';

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async auditLogs(query: LogsQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const where = {
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' }, skip, take: query.pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async apiLogs(query: LogsQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.apiLog.findMany({
        include: { provider: true, user: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.apiLog.count(),
    ]);

    return { data: items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async ingestionLogs(query: LogsQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ingestionJobRun.findMany({
        include: { ingestionJob: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.ingestionJobRun.count(),
    ]);

    return { data: items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }
}
