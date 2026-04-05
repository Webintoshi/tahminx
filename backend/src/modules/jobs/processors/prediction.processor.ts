import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AlertingService } from 'src/common/alerts/alerting.service';
import { MetricsService } from 'src/common/metrics/metrics.service';
import { JOB_NAMES, QUEUE_NAMES } from 'src/shared/constants/jobs.constants';
import { PredictionsService } from 'src/modules/predictions/predictions.service';
import { JobsService } from '../jobs.service';

interface PredictionJobPayload {
  matchId?: string;
  matchIds?: string[];
  source?: string;
}

@Injectable()
@Processor(QUEUE_NAMES.PREDICTION, {
  concurrency: Math.max(1, Number(process.env.QUEUE_PREDICTION_CONCURRENCY || 6)),
  stalledInterval: Math.max(5000, Number(process.env.QUEUE_STALLED_INTERVAL_MS || 30000)),
})
export class PredictionProcessor extends WorkerHost {
  private readonly logger = new Logger(PredictionProcessor.name);

  constructor(
    private readonly predictionsService: PredictionsService,
    private readonly jobsService: JobsService,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {
    super();
  }

  async process(job: Job<PredictionJobPayload>): Promise<unknown> {
    const startedAt = Date.now();
    this.logger.log(`Prediction job started: ${job.name}`);

    try {
      if (job.name === JOB_NAMES.generateFeatures) {
        const featureResult = await this.runFeatureGeneration(job);
        const successfulMatchIds = featureResult
          .filter((item) => item.status === 'success')
          .map((item) => item.matchId);

        if (successfulMatchIds.length) {
          await this.jobsService.enqueuePredictionBatch(successfulMatchIds, `feature-job:${String(job.id)}`);
        }

        const result = {
          ok: true,
          generatedFeatures: successfulMatchIds.length,
          failedFeatures: featureResult.length - successfulMatchIds.length,
          enqueuedPredictions: successfulMatchIds.length,
        };
        this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
        return result;
      }

      if (job.data?.matchId) {
        const result = await this.predictionsService.generateForMatch(job.data.matchId);
        this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
        return result;
      }

      if (job.data?.matchIds?.length) {
        const result = await this.predictionsService.generateForMatches(job.data.matchIds);
        this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
        return result;
      }

      const result = await this.predictionsService.generatePendingPredictions();
      this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'success', Date.now() - startedAt);
      return result;
    } catch (error) {
      this.metricsService.observeQueueJob(QUEUE_NAMES.PREDICTION, job.name, 'failed', Date.now() - startedAt);
      this.logger.error(
        `Prediction job failed name=${job.name} id=${String(job.id)} reason=${(error as Error).message}`,
      );
      await this.alertingService.raise({
        type: 'prediction_pipeline_failure',
        severity: 'critical',
        message: `Prediction job failed name=${job.name}`,
        context: {
          jobId: String(job.id || ''),
          attemptsMade: job.attemptsMade,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  private async runFeatureGeneration(job: Job<PredictionJobPayload>) {
    if (job.data.matchId) {
      const snapshot = await this.predictionsService.generateFeaturesForMatch(job.data.matchId);
      return [
        {
          matchId: snapshot.matchId,
          status: 'success' as const,
          modelFamily: snapshot.modelFamily,
        },
      ];
    }

    if (job.data.matchIds?.length) {
      return this.predictionsService.generateFeaturesForMatches(job.data.matchIds);
    }

    return this.predictionsService.generatePendingFeatures();
  }
}
