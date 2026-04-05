import { Injectable, NestMiddleware } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { AlertingService } from '../alerts/alerting.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class ApiLoggingMiddleware implements NestMiddleware {
  private readonly recentStatuses: Array<{ timestamp: number; error: boolean }> = [];

  constructor(
    private readonly metricsService: MetricsService,
    private readonly prisma: PrismaService,
    private readonly alertingService: AlertingService,
  ) {}

  use(req: Request & { user?: { id?: string }; correlationId?: string }, res: Response, next: NextFunction): void {
    const started = Date.now();
    res.on('finish', async () => {
      const durationMs = Date.now() - started;
      const path = req.originalUrl.split('?')[0];
      const correlationId = String(req.correlationId || req.headers['x-correlation-id'] || '');

      this.metricsService.observeHttp(req.method, path, String(res.statusCode), durationMs);
      this.recordErrorRate(res.statusCode >= 500);

      try {
        await this.prisma.apiLog.create({
          data: {
            userId: req.user?.id,
            path,
            method: req.method,
            statusCode: res.statusCode,
            durationMs,
            correlationId,
            requestBody: req.body ? (redactSensitive(req.body) as Prisma.InputJsonValue) : undefined,
          },
        });
      } catch {
        // swallow logging errors
      }
    });

    next();
  }

  private recordErrorRate(isError: boolean): void {
    const windowSeconds = Number(process.env.ALERT_ERROR_RATE_WINDOW_SECONDS || 120);
    const threshold = Number(process.env.ALERT_ERROR_RATE_THRESHOLD || 0.2);
    const now = Date.now();
    const minTs = now - windowSeconds * 1000;

    this.recentStatuses.push({ timestamp: now, error: isError });
    while (this.recentStatuses.length && this.recentStatuses[0].timestamp < minTs) {
      this.recentStatuses.shift();
    }

    if (this.recentStatuses.length < 40) {
      return;
    }

    const errors = this.recentStatuses.filter((row) => row.error).length;
    const rate = errors / this.recentStatuses.length;
    if (rate >= threshold) {
      void this.alertingService.raise({
        type: 'high_error_rate',
        severity: rate >= Math.max(0.35, threshold * 1.5) ? 'critical' : 'warning',
        message: `High HTTP error rate detected: ${(rate * 100).toFixed(2)}% over ${windowSeconds}s`,
        context: {
          sampleSize: this.recentStatuses.length,
          errors,
          threshold,
          windowSeconds,
        },
      });
    }
  }
}

const redactSensitive = (payload: unknown): unknown => {
  if (Array.isArray(payload)) {
    return payload.map((item) => redactSensitive(item));
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return Object.entries(payload as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const lower = key.toLowerCase();
    if (lower.includes('password') || lower.includes('secret') || lower.includes('token')) {
      acc[key] = '[REDACTED]';
    } else {
      acc[key] = redactSensitive(value);
    }
    return acc;
  }, {});
};
