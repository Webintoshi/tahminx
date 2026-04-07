import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { AlertingService } from 'src/common/alerts/alerting.service';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { SupabaseBackupService } from 'src/modules/backup/supabase-backup.service';
import { QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

@Injectable()
@Processor(QUEUE_NAMES.BACKUP, {
  concurrency: 1,
  stalledInterval: Math.max(5000, Number(process.env.QUEUE_STALLED_INTERVAL_MS || 30000)),
})
export class BackupProcessor extends WorkerHost {
  constructor(
    private readonly backupService: SupabaseBackupService,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {
    super();
  }

  async process(job: Job<{ source?: string }>): Promise<unknown> {
    const startedAt = Date.now();

    try {
      const result = await this.backupService.runFullSync({ source: job.data?.source || job.name });
      this.metricsService.observeQueueJob(QUEUE_NAMES.BACKUP, job.name, 'success', Date.now() - startedAt);
      return result;
    } catch (error) {
      this.metricsService.observeQueueJob(QUEUE_NAMES.BACKUP, job.name, 'failed', Date.now() - startedAt);
      await this.alertingService.raise({
        type: 'supabase_backup_sync_failure',
        severity: 'critical',
        message: 'Supabase backup sync job failed',
        context: {
          jobId: String(job.id || ''),
          jobName: job.name,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }
}
