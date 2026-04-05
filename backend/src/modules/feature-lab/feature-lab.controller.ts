import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FeatureLabQueryDto } from './dto/feature-lab-query.dto';
import { FeatureLabResultsQueryDto } from './dto/feature-lab-results-query.dto';
import { RunFeatureExperimentDto } from './dto/run-feature-experiment.dto';
import { FeatureLabService } from './feature-lab.service';

@ApiTags('admin-feature-lab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/features/lab')
export class FeatureLabController {
  constructor(private readonly service: FeatureLabService) {}

  @Get()
  async list(@Query() query: FeatureLabQueryDto) {
    return this.service.list(query);
  }

  @Post('experiment')
  async runExperiment(@Req() req: Request & { user?: { id?: string } }, @Body() dto: RunFeatureExperimentDto) {
    return this.service.runExperiment(dto, req.user?.id);
  }

  @Get('results')
  async results(@Query() query: FeatureLabResultsQueryDto) {
    return this.service.results(query);
  }
}
