import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FailedPredictionQueryDto } from 'src/modules/model-analysis/dto/failed-prediction-query.dto';
import { ManualRemapDto } from './dto/manual-remap.dto';
import { ManualRerunPredictionDto } from './dto/manual-rerun-prediction.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('summary')
  async summary() {
    return { data: await this.service.summary() };
  }

  @Get('mappings/review')
  async mappingReview(@Query('limit') limit?: string) {
    return { data: await this.service.mappingReviewList(limit ? Number(limit) : 100) };
  }

  @Get('mappings/review-queue')
  async mappingReviewQueue(@Query('limit') limit?: string) {
    return { data: await this.service.mappingReviewQueue(limit ? Number(limit) : 100) };
  }

  @Get('mappings/failed')
  async failedMappings(@Query('limit') limit?: string) {
    return { data: await this.service.failedMappings(limit ? Number(limit) : 100) };
  }

  @Post('mappings/remap')
  async manualRemap(@Req() req: Request & { user?: { id?: string } }, @Body() dto: ManualRemapDto) {
    return { data: await this.service.manualRemap(dto, req.user?.id) };
  }

  @Get('predictions/status')
  async predictionStatus() {
    return { data: await this.service.predictionGenerationStatus() };
  }

  @Get('predictions/runs/latest')
  async latestPredictionRuns(@Query('limit') limit?: string) {
    return { data: await this.service.latestPredictionRuns(limit ? Number(limit) : 30) };
  }

  @Get('predictions/jobs/failed')
  async failedPredictionJobs(@Query('limit') limit?: string) {
    return { data: await this.service.failedPredictionJobs(limit ? Number(limit) : 50) };
  }

  @Get('predictions/risk-summary')
  async predictionRiskSummary() {
    return { data: await this.service.predictionRiskSummary() };
  }

  @Get('predictions/low-confidence')
  async lowConfidencePredictions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.service.lowConfidencePredictions(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @Get('predictions/failed')
  async failedPredictions(@Query() query: FailedPredictionQueryDto) {
    return this.service.failedPredictions(query);
  }

  @Get('predictions/failed/:id')
  async failedPredictionDetail(@Param('id') id: string) {
    return { data: await this.service.failedPredictionDetail(id) };
  }

  @Post('predictions/rerun')
  async manualPredictionRerun(
    @Req() req: Request & { user?: { id?: string } },
    @Body() dto: ManualRerunPredictionDto,
  ) {
    return { data: await this.service.manualRerunPrediction(dto.matchId, req.user?.id) };
  }

  @Get('sync/summary')
  async syncSummary() {
    return { data: await this.service.latestSyncSummary() };
  }

  @Get('sync/summary-by-provider')
  async syncSummaryByProvider() {
    return { data: await this.service.syncSummaryByProvider() };
  }

  @Post('archive/bootstrap')
  async triggerArchiveBootstrap(
    @Req() req: Request & { user?: { id?: string } },
    @Body()
    body: {
      divisions?: string[];
      limit?: number;
      dryRun?: boolean;
      teamsOnly?: boolean;
      skipElo?: boolean;
      matchesUrl?: string;
      eloUrl?: string;
    },
  ) {
    return {
      data: await this.service.triggerArchiveBootstrap(req.user?.id, body || {}),
    };
  }
}
