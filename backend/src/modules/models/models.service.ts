import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { DriftSummaryQueryDto } from 'src/modules/model-analysis/dto/drift-summary-query.dto';
import { FeatureImportanceQueryDto } from 'src/modules/model-analysis/dto/feature-importance-query.dto';
import { ModelComparisonQueryDto } from 'src/modules/model-analysis/dto/model-comparison-query.dto';
import { PerformanceTimeseriesQueryDto } from 'src/modules/model-analysis/dto/performance-timeseries-query.dto';
import { ModelAnalysisService } from 'src/modules/model-analysis/model-analysis.service';
import { AutoSelectStrategiesDto } from 'src/modules/model-strategy/dto/auto-select-strategies.dto';
import { StrategyListQueryDto } from 'src/modules/model-strategy/dto/strategy-list-query.dto';
import { UpdateEnsembleConfigDto } from 'src/modules/model-strategy/dto/update-ensemble-config.dto';
import { UpdateModelStrategyDto } from 'src/modules/model-strategy/dto/update-model-strategy.dto';
import { ModelStrategyService } from 'src/modules/model-strategy/model-strategy.service';
import { CreateModelVersionDto } from './dto/create-model-version.dto';
import { UpdateModelVersionDto } from './dto/update-model-version.dto';

@Injectable()
export class ModelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelAnalysisService: ModelAnalysisService,
    private readonly modelStrategyService: ModelStrategyService,
  ) {}

  list() {
    return this.prisma.modelVersion.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateModelVersionDto) {
    return this.prisma.modelVersion.create({
      data: {
        key: dto.key,
        name: dto.name,
        version: dto.version,
        status: dto.status,
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, dto: UpdateModelVersionDto) {
    const exists = await this.prisma.modelVersion.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Model not found');

    return this.prisma.modelVersion.update({
      where: { id },
      data: {
        ...(dto.key ? { key: dto.key } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.version ? { version: dto.version } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.metadata ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  }

  comparison(query: ModelComparisonQueryDto) {
    return this.modelAnalysisService.modelComparison(query);
  }

  featureImportance(query: FeatureImportanceQueryDto) {
    return this.modelAnalysisService.featureImportance(query);
  }

  performanceTimeseries(query: PerformanceTimeseriesQueryDto) {
    return this.modelAnalysisService.performanceTimeseries(query);
  }

  driftSummary(query: DriftSummaryQueryDto) {
    return this.modelAnalysisService.driftSummary(query);
  }

  strategies(query: StrategyListQueryDto) {
    return this.modelStrategyService.list(query);
  }

  autoSelectStrategies(dto: AutoSelectStrategiesDto, actorUserId?: string) {
    return this.modelStrategyService.autoSelect(dto, actorUserId);
  }

  updateStrategy(id: string, dto: UpdateModelStrategyDto) {
    return this.modelStrategyService.updateStrategy(id, dto);
  }

  ensembleConfigs() {
    return this.modelStrategyService.listEnsembleConfigs();
  }

  updateEnsembleConfig(id: string, dto: UpdateEnsembleConfigDto) {
    return this.modelStrategyService.updateEnsembleConfig(id, dto);
  }
}
