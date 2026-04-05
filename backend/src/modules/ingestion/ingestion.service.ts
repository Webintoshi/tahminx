import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/database/prisma.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { AdminJobListQueryDto } from 'src/shared/dto/admin-job-list-query.dto';
import { RunIngestionDto } from './dto/run-ingestion.dto';

@Injectable()
export class IngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async run(dto: RunIngestionDto) {
    const provider = dto.providerCode
      ? await this.prisma.provider.findUnique({ where: { code: dto.providerCode } })
      : null;

    if (dto.providerCode && !provider) {
      throw new NotFoundException('Provider not found');
    }

    const jobRecord = await this.prisma.ingestionJob.create({
      data: {
        providerId: provider?.id,
        name: dto.jobType,
        queueName: 'ingestion',
        status: 'PENDING',
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        scheduledAt: new Date(),
      },
    });

    await this.jobsService.enqueueIngestionJob(jobRecord.id, dto.jobType, {
      ingestionJobId: jobRecord.id,
      providerCode: dto.providerCode,
      payload: dto.payload || {},
    });

    return { data: jobRecord };
  }

  async list(query: AdminJobListQueryDto) {
    const where = {
      ...(query.queueName ? { queueName: query.queueName } : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.providerCode
        ? {
            provider: {
              code: query.providerCode,
            },
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where,
        include: { provider: true, runs: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.ingestionJob.count({ where }),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async failedJobs(limit = 50) {
    const rows = await this.prisma.ingestionJob.findMany({
      where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
      include: { provider: true, runs: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });

    return { data: rows };
  }

  async detail(id: string) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: { id },
      include: { provider: true, runs: { orderBy: { createdAt: 'desc' } } },
    });
    if (!job) {
      throw new NotFoundException('Ingestion job not found');
    }
    return { data: job };
  }

  async retry(id: string) {
    const job = await this.prisma.ingestionJob.findUnique({ where: { id }, include: { provider: true } });
    if (!job) {
      throw new NotFoundException('Ingestion job not found');
    }

    await this.jobsService.enqueueIngestionJob(job.id, job.name, {
      ingestionJobId: job.id,
      providerCode: job.provider?.code,
      payload: (job.payload || {}) as Record<string, unknown>,
      retry: true,
    });

    await this.prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', scheduledAt: new Date(), errorMessage: null },
    });

    return { data: { retried: true, jobId: job.id } };
  }

  async summary() {
    const [latestSuccessful, latestRuns, failedCount] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where: { status: 'SUCCESS' },
        include: { provider: true },
        orderBy: { finishedAt: 'desc' },
        take: 20,
      }),
      this.prisma.ingestionJobRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { ingestionJob: { include: { provider: true } } },
      }),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    const byJobName = latestSuccessful.reduce<Record<string, { lastSuccessAt: string; provider: string | null }>>((acc, row) => {
      if (!acc[row.name]) {
        acc[row.name] = {
          lastSuccessAt: row.finishedAt?.toISOString() || row.updatedAt.toISOString(),
          provider: row.provider?.code || null,
        };
      }
      return acc;
    }, {});

    return {
      data: {
        failedJobs: failedCount,
        latestByJobName: byJobName,
        recentRuns: latestRuns,
      },
    };
  }
}