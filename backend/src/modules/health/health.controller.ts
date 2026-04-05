import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipResponseWrap } from 'src/common/decorators/skip-response-wrap.decorator';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly service: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Public()
  @Get()
  async root() {
    return {
      data: {
        service: 'tahminx-backend',
        version: '1.0.0',
        endpoints: {
          apiRoot: '/api/v1',
          health: '/api/v1/health',
          ready: '/health/ready',
          live: '/health/live',
          guideSummary: '/api/v1/guide/summary',
          docs: '/api/docs',
        },
      },
    };
  }

  @Public()
  @Get('health')
  async healthRoot() {
    const readiness = await this.service.readiness();
    if (!readiness.ready) {
      throw new ServiceUnavailableException(readiness);
    }

    return { data: readiness };
  }

  @Public()
  @Get('health/live')
  async liveness() {
    return { data: await this.service.liveness() };
  }

  @Public()
  @Get('health/ready')
  async readiness() {
    const readiness = await this.service.readiness();
    if (!readiness.ready) {
      throw new ServiceUnavailableException(readiness);
    }

    return { data: readiness };
  }

  @Public()
  @Get('api/v1/health')
  async full() {
    const [app, db, redis, queue, providers, alerts] = await Promise.all([
      this.service.appHealth(),
      this.service.dbHealth(),
      this.service.redisHealth(),
      this.service.queueHealth(),
      this.service.providerHealth(),
      this.service.alerts(10),
    ]);
    return { data: { app, db, redis, queue, providers, alerts } };
  }

  @Public()
  @SkipResponseWrap()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metrics() {
    return this.metricsService.metrics();
  }
}