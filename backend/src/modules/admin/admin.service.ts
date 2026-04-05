import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { FailedPredictionQueryDto } from 'src/modules/model-analysis/dto/failed-prediction-query.dto';
import { ModelAnalysisService } from 'src/modules/model-analysis/model-analysis.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { ManualRemapDto, MappingType } from './dto/manual-remap.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly providersService: ProvidersService,
    private readonly modelAnalysisService: ModelAnalysisService,
  ) {}

  async summary() {
    const [users, leagues, teams, matches, predictions, failedJobs] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.league.count({ where: { deletedAt: null } }),
      this.prisma.team.count({ where: { deletedAt: null } }),
      this.prisma.match.count(),
      this.prisma.prediction.count(),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    return {
      users,
      leagues,
      teams,
      matches,
      predictions,
      failedJobs,
    };
  }

  async mappingReviewList(limit = 100) {
    const normalizedLimit = Math.min(200, Math.max(1, limit));

    const [teamMappings, leagueMappings, matchMappings] = await Promise.all([
      this.prisma.providerTeamMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, team: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerLeagueMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, league: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerMatchMapping.findMany({
        where: { reviewNeeded: true },
        include: { provider: true, match: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
    ]);

    return {
      teamMappings,
      leagueMappings,
      matchMappings,
      total: teamMappings.length + leagueMappings.length + matchMappings.length,
    };
  }

  async mappingReviewQueue(limit = 100) {
    const normalizedLimit = Math.min(500, Math.max(1, limit));
    const reviewList = await this.mappingReviewList(normalizedLimit);

    const queue = [
      ...reviewList.teamMappings.map((item) => ({
        type: 'team',
        providerCode: item.provider.code,
        externalId: item.externalId,
        externalName: item.externalName,
        confidence: item.confidence ?? 0,
        reviewReason: item.reviewReason,
        updatedAt: item.updatedAt.toISOString(),
      })),
      ...reviewList.leagueMappings.map((item) => ({
        type: 'league',
        providerCode: item.provider.code,
        externalId: item.externalId,
        externalName: item.externalName,
        confidence: item.confidence ?? 0,
        reviewReason: item.reviewReason,
        updatedAt: item.updatedAt.toISOString(),
      })),
      ...reviewList.matchMappings.map((item) => ({
        type: 'match',
        providerCode: item.provider.code,
        externalId: item.externalId,
        externalName: item.externalRef,
        confidence: item.confidence ?? 0,
        reviewReason: item.reviewReason,
        updatedAt: item.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => {
        const confidenceDiff = (a.confidence ?? 0) - (b.confidence ?? 0);
        if (confidenceDiff !== 0) {
          return confidenceDiff;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, normalizedLimit);

    return {
      total: queue.length,
      items: queue,
    };
  }

  async failedMappings(limit = 100) {
    const normalizedLimit = Math.min(300, Math.max(1, limit));
    const where = {
      reviewNeeded: true,
      OR: [{ confidence: { lt: 0.5 } }, { confidence: null }, { reviewReason: { not: null } }],
    };

    const [teamMappings, leagueMappings, matchMappings] = await Promise.all([
      this.prisma.providerTeamMapping.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerLeagueMapping.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
      this.prisma.providerMatchMapping.findMany({
        where,
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: normalizedLimit,
      }),
    ]);

    return {
      total: teamMappings.length + leagueMappings.length + matchMappings.length,
      teamMappings,
      leagueMappings,
      matchMappings,
    };
  }

  async manualRemap(dto: ManualRemapDto, actorUserId?: string) {
    const provider = await this.prisma.provider.findUnique({ where: { code: dto.providerCode } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (dto.mappingType === MappingType.TEAM) {
      const team = await this.prisma.team.findUnique({ where: { id: dto.canonicalId } });
      if (!team) {
        throw new NotFoundException('Canonical team not found');
      }

      const mapping = await this.prisma.providerTeamMapping.upsert({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: dto.externalId,
          },
        },
        create: {
          providerId: provider.id,
          externalId: dto.externalId,
          teamId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
        update: {
          teamId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
      });

      await this.createAuditLog(actorUserId, 'manual-remap-team', mapping.id, dto as unknown as Prisma.InputJsonValue);
      return mapping;
    }

    if (dto.mappingType === MappingType.LEAGUE) {
      const league = await this.prisma.league.findUnique({ where: { id: dto.canonicalId } });
      if (!league) {
        throw new NotFoundException('Canonical league not found');
      }

      const mapping = await this.prisma.providerLeagueMapping.upsert({
        where: {
          providerId_externalId: {
            providerId: provider.id,
            externalId: dto.externalId,
          },
        },
        create: {
          providerId: provider.id,
          externalId: dto.externalId,
          leagueId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
        update: {
          leagueId: dto.canonicalId,
          confidence: 1,
          reviewNeeded: false,
          reviewReason: null,
        },
      });

      await this.createAuditLog(actorUserId, 'manual-remap-league', mapping.id, dto as unknown as Prisma.InputJsonValue);
      return mapping;
    }

    const match = await this.prisma.match.findUnique({ where: { id: dto.canonicalId } });
    if (!match) {
      throw new NotFoundException('Canonical match not found');
    }

    const mapping = await this.prisma.providerMatchMapping.upsert({
      where: {
        providerId_externalId: {
          providerId: provider.id,
          externalId: dto.externalId,
        },
      },
      create: {
        providerId: provider.id,
        externalId: dto.externalId,
        matchId: dto.canonicalId,
        confidence: 1,
        reviewNeeded: false,
        reviewReason: null,
      },
      update: {
        matchId: dto.canonicalId,
        confidence: 1,
        reviewNeeded: false,
        reviewReason: null,
      },
    });

    await this.createAuditLog(actorUserId, 'manual-remap-match', mapping.id, dto as unknown as Prisma.InputJsonValue);
    return mapping;
  }

  async predictionGenerationStatus() {
    const [latestPrediction, totalPredictions, last24hPredictions, latestFeatureSet, activeModels] = await Promise.all([
      this.prisma.prediction.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.prediction.count(),
      this.prisma.prediction.count({ where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      this.prisma.featureSet.findFirst({ orderBy: { updatedAt: 'desc' } }),
      this.prisma.modelVersion.findMany({ where: { status: { in: ['active', 'ACTIVE'] }, deletedAt: null } }),
    ]);

    return {
      totalPredictions,
      generatedLast24Hours: last24hPredictions,
      latestPredictionAt: latestPrediction?.updatedAt?.toISOString() || null,
      latestFeatureSetAt: latestFeatureSet?.updatedAt?.toISOString() || null,
      activeModels,
    };
  }

  async latestPredictionRuns(limit = 30) {
    const normalizedLimit = Math.min(200, Math.max(1, limit));
    return this.jobsService.getLatestPredictionRuns(normalizedLimit);
  }

  async failedPredictionJobs(limit = 50) {
    const normalizedLimit = Math.min(200, Math.max(1, limit));
    return this.jobsService.getFailedPredictionJobs(normalizedLimit);
  }

  async predictionRiskSummary() {
    const [totalPredictions, lowConfidenceCount, recommendedCount, rows] = await Promise.all([
      this.prisma.prediction.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.prediction.count({ where: { status: 'PUBLISHED', isLowConfidence: true } }),
      this.prisma.prediction.count({ where: { status: 'PUBLISHED', isRecommended: true } }),
      this.prisma.prediction.findMany({
        where: { status: 'PUBLISHED' },
        select: { riskFlags: true },
        orderBy: { updatedAt: 'desc' },
        take: 2000,
      }),
    ]);

    const riskDistribution = rows.reduce<Record<string, number>>((acc, row) => {
      const flags = Array.isArray(row.riskFlags) ? (row.riskFlags as string[]) : [];
      for (const flag of flags) {
        acc[flag] = (acc[flag] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalPredictions,
      lowConfidenceCount,
      recommendedCount,
      riskDistribution,
      updatedAt: new Date().toISOString(),
    };
  }

  async lowConfidencePredictions(page = 1, pageSize = 20) {
    const normalizedPage = Math.max(1, page);
    const normalizedPageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (normalizedPage - 1) * normalizedPageSize;

    const where: Prisma.PredictionWhereInput = {
      status: 'PUBLISHED',
      OR: [{ isLowConfidence: true }, { confidenceScore: { lt: 60 } }],
    };

    const [items, total] = await Promise.all([
      this.prisma.prediction.findMany({
        where,
        include: {
          match: {
            include: {
              sport: true,
              league: true,
              homeTeam: true,
              awayTeam: true,
            },
          },
        },
        orderBy: [{ confidenceScore: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: normalizedPageSize,
      }),
      this.prisma.prediction.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        matchId: item.matchId,
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
        isRecommended: item.isRecommended,
        isLowConfidence: item.isLowConfidence,
        avoidReason: item.avoidReason,
      })),
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
      },
    };
  }

  async manualRerunPrediction(matchId: string, actorUserId?: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    await this.jobsService.enqueuePredictionJob(matchId);
    await this.createAuditLog(actorUserId, 'manual-rerun-prediction', matchId, { matchId } as Prisma.InputJsonValue);

    return {
      queued: true,
      matchId,
      queuedAt: new Date().toISOString(),
    };
  }

  failedPredictions(query: FailedPredictionQueryDto) {
    return this.modelAnalysisService.failedPredictions(query);
  }

  failedPredictionDetail(id: string) {
    return this.modelAnalysisService.failedPredictionDetail(id);
  }

  async syncSummaryByProvider() {
    const jobs = await this.prisma.ingestionJob.findMany({
      include: { provider: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    const summary = new Map<
      string,
      {
        providerCode: string;
        total: number;
        success: number;
        failed: number;
        pending: number;
        running: number;
        latestSyncAt: string | null;
      }
    >();

    for (const job of jobs) {
      const providerCode = job.provider?.code || 'system';
      if (!summary.has(providerCode)) {
        summary.set(providerCode, {
          providerCode,
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
          running: 0,
          latestSyncAt: null,
        });
      }

      const entry = summary.get(providerCode)!;
      entry.total += 1;

      if (job.status === 'SUCCESS') {
        entry.success += 1;
      } else if (job.status === 'FAILED' || job.status === 'DEAD_LETTER') {
        entry.failed += 1;
      } else if (job.status === 'RUNNING') {
        entry.running += 1;
      } else {
        entry.pending += 1;
      }

      const timestamp = (job.finishedAt || job.updatedAt).toISOString();
      if (!entry.latestSyncAt || new Date(timestamp).getTime() > new Date(entry.latestSyncAt).getTime()) {
        entry.latestSyncAt = timestamp;
      }
    }

    return [...summary.values()].sort((a, b) => a.providerCode.localeCompare(b.providerCode));
  }

  async providerRateLimitStatus() {
    return this.providersService.rateLimitStatus();
  }

  async latestSyncSummary() {
    const [latestJobs, latestRuns, failedJobs] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        include: { provider: true },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.ingestionJobRun.findMany({
        include: { ingestionJob: { include: { provider: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 25,
      }),
      this.prisma.ingestionJob.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
    ]);

    const latestByType = latestJobs.reduce<Record<string, { status: string; updatedAt: string; providerCode: string | null }>>(
      (acc, job) => {
        if (!acc[job.name]) {
          acc[job.name] = {
            status: job.status,
            updatedAt: job.updatedAt.toISOString(),
            providerCode: job.provider?.code || null,
          };
        }
        return acc;
      },
      {},
    );

    return {
      failedJobs,
      latestByType,
      recentJobs: latestJobs,
      recentRuns: latestRuns,
    };
  }

  private async createAuditLog(
    actorUserId: string | undefined,
    action: string,
    targetId: string,
    payload: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId || null,
        action,
        targetType: 'admin-operation',
        targetId,
        payload,
      },
    });
  }
}
