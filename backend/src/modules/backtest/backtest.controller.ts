import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BacktestResultsQueryDto } from './dto/backtest-results-query.dto';
import { RunBacktestDto } from './dto/run-backtest.dto';
import { BacktestService } from './backtest.service';

@ApiTags('admin-backtest')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/backtest')
export class BacktestController {
  constructor(private readonly service: BacktestService) {}

  @Get('results')
  @ApiOperation({ summary: 'List backtest results' })
  async results(@Query() query: BacktestResultsQueryDto) {
    return this.service.results(query);
  }

  @Post('run')
  @ApiOperation({ summary: 'Run a new backtest for historical matches' })
  async run(@Req() req: Request & { user?: { id?: string } }, @Body() dto: RunBacktestDto) {
    return { data: await this.service.run(dto, req.user?.id) };
  }
}
