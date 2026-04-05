import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { AlertingService } from 'src/common/alerts/alerting.service';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { ProvidersService } from 'src/modules/providers/providers.service';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

@Injectable()
@Processor(QUEUE_NAMES.HEALTH, {
  concurrency: Math.max(1, Number(process.env.QUEUE_HEALTH_CONCURRENCY || 2)),
  stalledInterval: Math.max(5000, Number(process.env.QUEUE_STALLED_INTERVAL_MS || 30000)),
})
export class HealthProcessor extends WorkerHost {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    const startedAt = Date.now();
    try {
      const result = await this.providersService.health(true);
      const failedProviders = (result.adapters || []).filter((item: any) => !item.healthy);
      if (failedProviders.length) {
        await this.alertingService.raise({
          type: 'provider_down',
          severity: failedProviders.length > 1 ? 'critical' : 'warning',
          message: `Provider health degraded: ${failedProviders.map((item: any) => item.provider).join(', ')}`,
          context: {
            failedProviders,
          },
        });
      }
      this.metricsService.observeQueueJob(QUEUE_NAMES.HEALTH, job.name, 'success', Date.now() - startedAt);
      return result;
    } catch (error) {
      this.metricsService.observeQueueJob(QUEUE_NAMES.HEALTH, job.name, 'failed', Date.now() - startedAt);
      await this.alertingService.raise({
        type: 'provider_health_check_failure',
        severity: 'critical',
        message: 'Provider health check job failed',
        context: {
          jobId: String(job.id || ''),
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }
}
