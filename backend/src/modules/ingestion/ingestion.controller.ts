import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleEnum } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { AdminJobListQueryDto } from 'src/shared/dto/admin-job-list-query.dto';
import { RunIngestionDto } from './dto/run-ingestion.dto';
import { IngestionService } from './ingestion.service';

@ApiTags('ingestion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(RoleEnum.ADMIN)
@Controller('api/v1/admin/ingestion')
export class IngestionController {
  constructor(private readonly service: IngestionService) {}

  @Post('run')
  run(@Body() dto: RunIngestionDto) {
    return this.service.run(dto);
  }

  @Get('jobs')
  list(@Query() query: AdminJobListQueryDto) {
    return this.service.list(query);
  }

  @Get('jobs/failed')
  failed(@Query('limit') limit?: string) {
    return this.service.failedJobs(limit ? Number(limit) : 50);
  }

  @Get('jobs/:id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post('jobs/:id/retry')
  retry(@Param('id') id: string) {
    return this.service.retry(id);
  }

  @Get('summary')
  summary() {
    return this.service.summary();
  }
}