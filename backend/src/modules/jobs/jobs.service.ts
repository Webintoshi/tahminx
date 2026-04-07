import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AlertingService } from 'src/common/alerts/alerting.service';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { PrismaService } from 'src/database/prisma.service';
import { resolveAppRole } from 'src/config/runtime-role';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private monitorHandle: NodeJS.Timeout | null = null;
  private readonly runtimeRole = resolveAppRole(process.env.APP_ROLE);
  private readonly schedulerEnabled: boolean;
  private readonly monitorEnabled: boolean;
  private readonly stuckJobMs: number;

  constructor(
    @InjectQueue(QUEUE_NAMES.INGESTION) private readonly ingestionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PREDICTION) private readonly predictionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.HEALTH) private readonly healthQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BACKUP) private readonly backupQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DEAD_LETTER) private readonly deadLetterQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {
    this.schedulerEnabled = Boolean(this.configService.get<boolean>('queue.schedulerEnabled'));
    this.monitorEnabled = Boolean(this.configService.get<boolean>('queue.monitorEnabled'));
    this.stuckJobMs = Math.max(120000, Number(this.configService.get<number>('queue.stuckJobMs') || 300000));
  }

  async onModuleInit(): Promise<void> {
    if (this.schedulerEnabled) {
      await this.ensureRepeatableJobs();
      await this.enqueueStartupHydration();
      this.logger.log(`Queue scheduler enabled for role=${this.runtimeRole}`);
    } else {
      this.logger.log(`Queue scheduler skipped for role=${this.runtimeRole}`);
    }

    if (this.monitorEnabled) {
      this.startQueueMonitor();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.monitorHandle) {
      clearInterval(this.monitorHandle);
      this.monitorHandle = null;
    }
  }

  async ensureRepeatableJobs(): Promise<void> {
    await this.ingestionQueue.add(
      JOB_NAMES.syncLeagues,
      { source: 'scheduler' },
      {
        repeat: { pattern: '0 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncLeagues),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeams,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncTeams),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncPlayers,
      { source: 'scheduler' },
      {
        repeat: { pattern: '40 3 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncPlayers),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncStandings,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 4 * * *' },
        removeOnComplete: 100,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncStandings),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncFixtures,
      { source: 'scheduler' },
      {
        repeat: { pattern: '5 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 400,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncFixtures),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncResults,
      { source: 'scheduler' },
      {
        repeat: { pattern: '20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 400,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncResults),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeamStats,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/30 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncTeamStats),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncPlayerStats,
      { source: 'scheduler' },
      {
        repeat: { pattern: '0 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncPlayerStats),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncMatchEvents,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/10 * * * *' },
        removeOnComplete: 200,
        removeOnFail: 400,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncMatchEvents, 'base'),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncMatchEvents,
      { source: 'scheduler-matchday' },
      {
        repeat: { pattern: '*/2 * * * 0,1,5,6' },
        removeOnComplete: 200,
        removeOnFail: 400,
        jobId: this.safeJobId('repeatable', JOB_NAMES.syncMatchEvents, 'matchday'),
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.recalculateForms,
      { source: 'scheduler' },
      {
        repeat: { pattern: '30 4 * * *' },
        removeOnComplete: 100,
        removeOnFail: 200,
        jobId: this.safeJobId('repeatable', JOB_NAMES.recalculateForms),
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generateFeatures,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.generateFeatures),
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/20 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.generatePredictions),
      },
    );

    await this.healthQueue.add(
      JOB_NAMES.providerHealthCheck,
      { source: 'scheduler' },
      {
        repeat: { pattern: '*/5 * * * *' },
        removeOnComplete: 150,
        removeOnFail: 300,
        jobId: this.safeJobId('repeatable', JOB_NAMES.providerHealthCheck),
      },
    );

    if (this.configService.get<boolean>('backup.enabled')) {
      await this.backupQueue.add(
        JOB_NAMES.syncSupabaseBackup,
        { source: 'scheduler' },
        {
          repeat: { pattern: String(this.configService.get<string>('backup.syncCron') || '35 * * * *') },
          removeOnComplete: 50,
          removeOnFail: 200,
          jobId: this.safeJobId('repeatable', JOB_NAMES.syncSupabaseBackup),
        },
      );
    }
  }

  private async enqueueStartupHydration(): Promise<void> {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const hourKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, '');

    await this.ingestionQueue.add(
      JOB_NAMES.syncLeagues,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.syncLeagues, dayKey),
        priority: 5,
        removeOnComplete: 25,
        removeOnFail: 100,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncTeams,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.syncTeams, dayKey),
        delay: 15_000,
        priority: 5,
        removeOnComplete: 25,
        removeOnFail: 100,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncStandings,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.syncStandings, dayKey),
        delay: 30_000,
        priority: 4,
        removeOnComplete: 25,
        removeOnFail: 100,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncFixtures,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.syncFixtures, hourKey),
        delay: 45_000,
        priority: 3,
        removeOnComplete: 50,
        removeOnFail: 150,
      },
    );

    await this.ingestionQueue.add(
      JOB_NAMES.syncResults,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.syncResults, hourKey),
        delay: 60_000,
        priority: 3,
        removeOnComplete: 50,
        removeOnFail: 150,
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generateFeatures,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.generateFeatures, hourKey),
        delay: 90_000,
        priority: 3,
        removeOnComplete: 50,
        removeOnFail: 150,
      },
    );

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.generatePredictions, hourKey),
        delay: 120_000,
        priority: 2,
        removeOnComplete: 50,
        removeOnFail: 150,
      },
    );

    await this.healthQueue.add(
      JOB_NAMES.providerHealthCheck,
      { source: 'startup-hydration' },
      {
        jobId: this.safeJobId('startup', JOB_NAMES.providerHealthCheck, hourKey),
        priority: 4,
        removeOnComplete: 25,
        removeOnFail: 100,
      },
    );

    if (this.configService.get<boolean>('backup.enabled') && this.configService.get<boolean>('backup.startupSync')) {
      await this.backupQueue.add(
        JOB_NAMES.syncSupabaseBackup,
        { source: 'startup-hydration' },
        {
          jobId: this.safeJobId('startup', JOB_NAMES.syncSupabaseBackup, hourKey),
          delay: 150_000,
          priority: 2,
          removeOnComplete: 25,
          removeOnFail: 100,
        },
      );
    }
  }

  async enqueueIngestionJob(ingestionJobId: string, jobName: string, payload: Record<string, unknown>): Promise<void> {
    const idempotentJobId = this.safeJobId(jobName, ingestionJobId);

    await this.ingestionQueue.add(jobName, payload, {
      jobId: idempotentJobId,
      attempts: 5,
      priority: 4,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 300,
    });
  }

  async enqueueFeatureBatch(matchIds: string[], source = 'ingestion-sync'): Promise<void> {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    if (!dedupedIds.length) {
      return;
    }

    const batchKey = dedupedIds.slice(0, 10).join(',');

    await this.predictionQueue.add(
      JOB_NAMES.generateFeatures,
      { matchIds: dedupedIds, source },
      {
        jobId: this.safeJobId(JOB_NAMES.generateFeatures, 'batch', batchKey, Date.now()),
        attempts: 3,
        priority: 3,
        backoff: {
          type: 'exponential',
          delay: 1200,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async enqueuePredictionJob(matchId: string): Promise<void> {
    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { matchId },
      {
        jobId: this.safeJobId(JOB_NAMES.generatePredictions, matchId),
        attempts: 4,
        priority: 1,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async enqueuePredictionBatch(matchIds: string[], source = 'feature-sync'): Promise<void> {
    const dedupedIds = [...new Set(matchIds.filter(Boolean))];
    if (!dedupedIds.length) {
      return;
    }

    const batchKey = dedupedIds.slice(0, 10).join(',');

    await this.predictionQueue.add(
      JOB_NAMES.generatePredictions,
      { matchIds: dedupedIds, source },
      {
        jobId: this.safeJobId(JOB_NAMES.generatePredictions, 'batch', batchKey, Date.now()),
        attempts: 3,
        priority: 2,
        backoff: {
          type: 'exponential',
          delay: 1500,
        },
        removeOnComplete: 100,
        removeOnFail: 300,
      },
    );
  }

  async getLatestPredictionRuns(limit = 30) {
    const jobs = await this.predictionQueue.getJobs(['completed', 'failed', 'active', 'waiting', 'delayed'], 0, Math.max(0, limit - 1), true);

    return jobs
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit)
      .map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status:
          job.finishedOn && job.failedReason
            ? 'failed'
            : job.finishedOn
              ? 'completed'
              : job.processedOn
                ? 'active'
                : 'waiting',
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason || null,
        timestamp: new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      }));
  }

  async getFailedPredictionJobs(limit = 50) {
    const jobs = await this.predictionQueue.getJobs(['failed'], 0, Math.max(0, limit - 1), true);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason || null,
      timestamp: new Date(job.timestamp).toISOString(),
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    }));
  }

  async markDeadLetter(ingestionJobId: string, errorMessage: string): Promise<void> {
    await this.deadLetterQueue.add(
      'ingestionDeadLetter',
      {
        ingestionJobId,
        errorMessage,
        createdAt: new Date().toISOString(),
      },
      {
        jobId: this.safeJobId('dead-letter', ingestionJobId, Date.now()),
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    );

    await this.prisma.ingestionJob.update({
      where: { id: ingestionJobId },
      data: {
        status: 'DEAD_LETTER',
        errorMessage,
        finishedAt: new Date(),
      },
    });

    this.logger.error(`Dead letter job=${ingestionJobId} error=${errorMessage}`);
  }

  private startQueueMonitor(): void {
    const intervalMs = Math.max(5000, Number(process.env.QUEUE_STALLED_INTERVAL_MS || 30000));

    const run = async () => {
      await Promise.all([
        this.observeQueueDepth(this.ingestionQueue, QUEUE_NAMES.INGESTION),
        this.observeQueueDepth(this.predictionQueue, QUEUE_NAMES.PREDICTION),
        this.observeQueueDepth(this.healthQueue, QUEUE_NAMES.HEALTH),
        this.observeQueueDepth(this.backupQueue, QUEUE_NAMES.BACKUP),
        this.observeQueueDepth(this.deadLetterQueue, QUEUE_NAMES.DEAD_LETTER),
        this.detectStuckJobs(this.ingestionQueue, QUEUE_NAMES.INGESTION),
        this.detectStuckJobs(this.predictionQueue, QUEUE_NAMES.PREDICTION),
        this.detectStuckJobs(this.backupQueue, QUEUE_NAMES.BACKUP),
      ]);
    };

    this.monitorHandle = setInterval(() => {
      void run().catch((error) => {
        this.logger.warn(`queue_monitor_failed reason=${(error as Error).message}`);
      });
    }, intervalMs);

    void run();
  }

  private async observeQueueDepth(queue: Queue, queueName: string): Promise<void> {
    const counts = await queue.getJobCounts('active', 'waiting', 'failed', 'delayed', 'completed');
    this.metricsService.setQueueDepth(queueName, 'active', counts.active || 0);
    this.metricsService.setQueueDepth(queueName, 'waiting', counts.waiting || 0);
    this.metricsService.setQueueDepth(queueName, 'failed', counts.failed || 0);
    this.metricsService.setQueueDepth(queueName, 'delayed', counts.delayed || 0);
    this.metricsService.setQueueDepth(queueName, 'completed', counts.completed || 0);
  }

  private async detectStuckJobs(queue: Queue, queueName: string): Promise<void> {
    const activeJobs = await queue.getJobs(['active'], 0, 50, false);
    const now = Date.now();

    for (const job of activeJobs) {
      const ageMs = now - Number(job.processedOn || job.timestamp || now);
      if (ageMs < this.stuckJobMs) {
        continue;
      }

      const message = `Stuck job detected queue=${queueName} name=${job.name} id=${String(job.id)} ageMs=${ageMs}`;
      this.logger.warn(message);
      await this.alertingService.raise({
        type: 'queue_stuck_job',
        severity: 'warning',
        message,
        context: {
          queue: queueName,
          jobId: String(job.id || ''),
          jobName: job.name,
          ageMs,
        },
      });
    }
  }

  private safeJobId(...parts: Array<string | number>): string {
    return parts
      .map((part) => String(part).replace(/[^a-zA-Z0-9_-]/g, '-'))
      .filter(Boolean)
      .join('-');
  }
}
