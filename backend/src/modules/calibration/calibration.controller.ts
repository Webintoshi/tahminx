import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CalibrationResultsQueryDto } from './dto/calibration-results-query.dto';
import { RunCalibrationDto } from './dto/run-calibration.dto';
import { PredictionCalibrationService } from './prediction-calibration.service';

@ApiTags('admin-calibration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/calibration')
export class CalibrationController {
  constructor(private readonly service: PredictionCalibrationService) {}

  @Get('results')
  @ApiOperation({ summary: 'List calibration results' })
  async results(@Query() query: CalibrationResultsQueryDto) {
    return this.service.results(query);
  }

  @Post('run')
  @ApiOperation({ summary: 'Run model calibration from backtest history' })
  async run(@Req() req: Request & { user?: { id?: string } }, @Body() dto: RunCalibrationDto) {
    return { data: await this.service.run(dto, req.user?.id) };
  }
}
