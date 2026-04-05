import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { DriftSummaryQueryDto } from 'src/modules/model-analysis/dto/drift-summary-query.dto';
import { FeatureImportanceQueryDto } from 'src/modules/model-analysis/dto/feature-importance-query.dto';
import { ModelComparisonQueryDto } from 'src/modules/model-analysis/dto/model-comparison-query.dto';
import { PerformanceTimeseriesQueryDto } from 'src/modules/model-analysis/dto/performance-timeseries-query.dto';
import { AutoSelectStrategiesDto } from 'src/modules/model-strategy/dto/auto-select-strategies.dto';
import { StrategyListQueryDto } from 'src/modules/model-strategy/dto/strategy-list-query.dto';
import { UpdateEnsembleConfigDto } from 'src/modules/model-strategy/dto/update-ensemble-config.dto';
import { UpdateModelStrategyDto } from 'src/modules/model-strategy/dto/update-model-strategy.dto';
import { CreateModelVersionDto } from './dto/create-model-version.dto';
import { UpdateModelVersionDto } from './dto/update-model-version.dto';
import { ModelsService } from './models.service';

@ApiTags('models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/models')
export class ModelsController {
  constructor(private readonly service: ModelsService) {}

  @Get()
  async list() {
    return { data: await this.service.list() };
  }

  @Post()
  async create(@Body() dto: CreateModelVersionDto) {
    return { data: await this.service.create(dto) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateModelVersionDto) {
    return { data: await this.service.update(id, dto) };
  }

  @Get('comparison')
  async comparison(@Query() query: ModelComparisonQueryDto) {
    return this.service.comparison(query);
  }

  @Get('feature-importance')
  async featureImportance(@Query() query: FeatureImportanceQueryDto) {
    return this.service.featureImportance(query);
  }

  @Get('performance-timeseries')
  async performanceTimeseries(@Query() query: PerformanceTimeseriesQueryDto) {
    return this.service.performanceTimeseries(query);
  }

  @Get('drift-summary')
  async driftSummary(@Query() query: DriftSummaryQueryDto) {
    return this.service.driftSummary(query);
  }

  @Get('strategies')
  async strategies(@Query() query: StrategyListQueryDto) {
    return this.service.strategies(query);
  }

  @Post('strategies/auto-select')
  async autoSelectStrategies(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: AutoSelectStrategiesDto,
  ) {
    return this.service.autoSelectStrategies(dto, req.user?.id);
  }

  @Patch('strategies/:id')
  async updateStrategy(@Param('id') id: string, @Body() dto: UpdateModelStrategyDto) {
    return this.service.updateStrategy(id, dto);
  }

  @Get('ensemble-configs')
  async ensembleConfigs() {
    return this.service.ensembleConfigs();
  }

  @Patch('ensemble-configs/:id')
  async updateEnsembleConfig(@Param('id') id: string, @Body() dto: UpdateEnsembleConfigDto) {
    return this.service.updateEnsembleConfig(id, dto);
  }
}
