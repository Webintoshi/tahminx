import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('api/v1')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Public()
  @Get()
  async apiRoot() {
    return {
      data: {
        service: 'tahminx-backend',
        version: '1.0.0',
        endpoints: {
          health: '/api/v1/health',
          guideSummary: '/api/v1/guide/summary',
          docs: '/api/docs',
        },
      },
    };
  }

  @Public()
  @Get('analytics/dashboard')
  async dashboard() {
    return { data: await this.service.dashboard() };
  }

  @Public()
  @Get('guide/summary')
  async guideSummary() {
    return { data: await this.service.guideSummary() };
  }
}
