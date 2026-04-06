import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { PredictionListQueryDto } from 'src/shared/dto/prediction-list-query.dto';

@Injectable()
export class PredictionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PredictionListQueryDto, highConfidence = false) {
    const sortDirection = query.sortOrder || 'desc';
    const sortField = query.sortBy || 'confidenceScore';
    const orderBy: Prisma.PredictionOrderByWithRelationInput =
      sortField === 'confidenceScore'
        ? { confidenceScore: sortDirection }
        : sortField === 'updatedAt' || sortField === 'createdAt'
          ? { [sortField]: sortDirection }
          : { match: { matchDate: sortDirection } };

    const matchWhere: Prisma.MatchWhereInput = {
      ...(query.date
        ? {
            matchDate: {
              gte: new Date(`${query.date}T00:00:00.000Z`),
              lte: new Date(`${query.date}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(query.from || query.to
        ? {
            matchDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.sport ? { sport: { code: query.sport.toUpperCase() as never } } : {}),
      ...(query.leagueId ? { leagueId: query.leagueId } : {}),
      ...(query.teamId
        ? { OR: [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }] }
        : {}),
      ...(query.status ? { status: query.status.toUpperCase() as never } : {}),
    };

    const where: Prisma.PredictionWhereInput = {
      status: 'PUBLISHED',
      ...(query.minConfidence ? { confidenceScore: { gte: query.minConfidence } } : {}),
      ...(highConfidence ? { confidenceScore: { gte: Math.max(query.minConfidence || 0, 75) } } : {}),
      ...(typeof query.isLowConfidence === 'boolean' ? { isLowConfidence: query.isLowConfidence } : {}),
      ...(typeof query.isRecommended === 'boolean' ? { isRecommended: query.isRecommended } : {}),
      match: matchWhere,
    };

    const skip = (query.page - 1) * query.pageSize;

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
          explanation: true,
        },
        orderBy,
        skip,
        take: query.pageSize,
      }),
      this.prisma.prediction.count({ where }),
    ]);

    return { items, total };
  }

  async getByMatchId(matchId: string) {
    const prediction = await this.prisma.prediction.findFirst({
      where: { matchId, status: 'PUBLISHED' },
      include: {
        match: {
          include: {
            sport: true,
            league: true,
            homeTeam: true,
            awayTeam: true,
          },
        },
        explanation: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!prediction) {
      throw new NotFoundException('Prediction not found');
    }

    return prediction;
  }

  async upsertPrediction(
    matchId: string,
    modelVersionId: string,
    payload: {
      rawProbabilities: Record<string, number>;
      calibratedProbabilities: Record<string, number>;
      probabilities: Record<string, number>;
      expectedScore: Record<string, number>;
      confidenceScore: number;
      rawConfidenceScore: number;
      calibratedConfidenceScore: number;
      summary: string;
      riskFlags: string[];
      isRecommended: boolean;
      isLowConfidence: boolean;
      avoidReason: string | null;
      modelStrategyId: string | null;
      usedStrategy: Record<string, unknown>;
      explanation: Record<string, unknown>;
    },
  ) {
    const prediction = await this.prisma.prediction.upsert({
      where: {
        matchId_modelVersionId: {
          matchId,
          modelVersionId,
        },
      },
      create: {
        matchId,
        modelVersionId,
        status: 'PUBLISHED',
        rawProbabilities: payload.rawProbabilities as Prisma.InputJsonValue,
        calibratedProbabilities: payload.calibratedProbabilities as Prisma.InputJsonValue,
        probabilities: payload.probabilities as Prisma.InputJsonValue,
        expectedScore: payload.expectedScore as Prisma.InputJsonValue,
        confidenceScore: payload.confidenceScore,
        rawConfidenceScore: payload.rawConfidenceScore,
        calibratedConfidenceScore: payload.calibratedConfidenceScore,
        summary: payload.summary,
        riskFlags: payload.riskFlags as Prisma.InputJsonValue,
        isRecommended: payload.isRecommended,
        isLowConfidence: payload.isLowConfidence,
        avoidReason: payload.avoidReason,
        modelStrategyId: payload.modelStrategyId,
        usedStrategy: payload.usedStrategy as Prisma.InputJsonValue,
      },
      update: {
        rawProbabilities: payload.rawProbabilities as Prisma.InputJsonValue,
        calibratedProbabilities: payload.calibratedProbabilities as Prisma.InputJsonValue,
        probabilities: payload.probabilities as Prisma.InputJsonValue,
        expectedScore: payload.expectedScore as Prisma.InputJsonValue,
        confidenceScore: payload.confidenceScore,
        rawConfidenceScore: payload.rawConfidenceScore,
        calibratedConfidenceScore: payload.calibratedConfidenceScore,
        summary: payload.summary,
        riskFlags: payload.riskFlags as Prisma.InputJsonValue,
        isRecommended: payload.isRecommended,
        isLowConfidence: payload.isLowConfidence,
        avoidReason: payload.avoidReason,
        modelStrategyId: payload.modelStrategyId,
        usedStrategy: payload.usedStrategy as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    await this.prisma.predictionExplanation.upsert({
      where: { predictionId: prediction.id },
      create: {
        predictionId: prediction.id,
        explanation: payload.explanation as Prisma.InputJsonValue,
      },
      update: {
        explanation: payload.explanation as Prisma.InputJsonValue,
      },
    });

    return prediction;
  }

  async upsertFeatureSet(matchId: string, modelFamily: string, features: Record<string, number>, qualityScore?: number) {
    return this.prisma.featureSet.upsert({
      where: {
        matchId_modelFamily: {
          matchId,
          modelFamily,
        },
      },
      create: {
        matchId,
        modelFamily,
        features: features as Prisma.InputJsonValue,
        qualityScore,
      },
      update: {
        features: features as Prisma.InputJsonValue,
        qualityScore,
      },
    });
  }
}
