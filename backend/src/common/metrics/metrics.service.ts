import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requestCount: Counter<string>;
  private readonly requestDurationMs: Histogram<string>;
  private readonly queueJobTotal: Counter<string>;
  private readonly queueJobDurationMs: Histogram<string>;
  private readonly providerRequestTotal: Counter<string>;
  private readonly providerLatencyMs: Histogram<string>;
  private readonly ingestionRunsTotal: Counter<string>;
  private readonly cacheOperationTotal: Counter<string>;
  private readonly queueDepthGauge: Gauge<string>;
  private readonly alertTotal: Counter<string>;
  private readonly providerCircuitState: Gauge<string>;
  private readonly requestErrorTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.requestCount = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.requestDurationMs = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2000],
      registers: [this.registry],
    });

    this.queueJobTotal = new Counter({
      name: 'queue_jobs_total',
      help: 'Total queue job executions',
      labelNames: ['queue', 'job', 'status'],
      registers: [this.registry],
    });

    this.queueJobDurationMs = new Histogram({
      name: 'queue_job_duration_ms',
      help: 'Queue job execution duration in milliseconds',
      labelNames: ['queue', 'job', 'status'],
      buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000, 15000],
      registers: [this.registry],
    });

    this.providerRequestTotal = new Counter({
      name: 'provider_requests_total',
      help: 'Total provider requests and health checks',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.providerLatencyMs = new Histogram({
      name: 'provider_request_duration_ms',
      help: 'Provider request latency in milliseconds',
      labelNames: ['provider', 'status'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });

    this.ingestionRunsTotal = new Counter({
      name: 'ingestion_runs_total',
      help: 'Ingestion run counter by job and status',
      labelNames: ['job', 'status'],
      registers: [this.registry],
    });

    this.cacheOperationTotal = new Counter({
      name: 'cache_operations_total',
      help: 'Cache operations by domain, operation and status',
      labelNames: ['domain', 'operation', 'status'],
      registers: [this.registry],
    });

    this.queueDepthGauge = new Gauge({
      name: 'queue_depth',
      help: 'Current queue depth by queue and state',
      labelNames: ['queue', 'state'],
      registers: [this.registry],
    });

    this.alertTotal = new Counter({
      name: 'alerts_total',
      help: 'Raised alerts by type and severity',
      labelNames: ['type', 'severity'],
      registers: [this.registry],
    });

    this.providerCircuitState = new Gauge({
      name: 'provider_circuit_state',
      help: 'Provider circuit breaker state (0 closed, 1 open, 0.5 half_open)',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.requestErrorTotal = new Counter({
      name: 'http_request_errors_total',
      help: 'Total HTTP error responses',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });
  }

  observeHttp(method: string, path: string, status: string, durationMs: number): void {
    this.requestCount.inc({ method, path, status });
    this.requestDurationMs.observe({ method, path, status }, durationMs);
    const statusCode = Number(status);
    if (Number.isFinite(statusCode) && statusCode >= 400) {
      this.requestErrorTotal.inc({ method, path, status });
    }
  }

  observeQueueJob(queue: string, job: string, status: 'success' | 'failed', durationMs: number): void {
    this.queueJobTotal.inc({ queue, job, status });
    this.queueJobDurationMs.observe({ queue, job, status }, durationMs);
  }

  observeProviderCall(provider: string, status: 'success' | 'failed', durationMs: number): void {
    this.providerRequestTotal.inc({ provider, status });
    this.providerLatencyMs.observe({ provider, status }, durationMs);
  }

  recordIngestionRun(job: string, status: 'success' | 'failed'): void {
    this.ingestionRunsTotal.inc({ job, status });
  }

  observeCache(domain: string, operation: 'get' | 'set' | 'del' | 'scan' | 'incr', status: 'hit' | 'miss' | 'ok' | 'error'): void {
    this.cacheOperationTotal.inc({ domain, operation, status });
  }

  setQueueDepth(queue: string, state: 'active' | 'waiting' | 'failed' | 'delayed' | 'completed', value: number): void {
    this.queueDepthGauge.set({ queue, state }, value);
  }

  observeAlert(type: string, severity: 'warning' | 'critical'): void {
    this.alertTotal.inc({ type, severity });
  }

  setProviderCircuitState(provider: string, state: 'closed' | 'open' | 'half_open'): void {
    const numeric = state === 'open' ? 1 : state === 'half_open' ? 0.5 : 0;
    this.providerCircuitState.set({ provider }, numeric);
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
