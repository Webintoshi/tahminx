import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { MetricsService } from '../metrics/metrics.service';

type AlertSeverity = 'warning' | 'critical';

interface AlertPayload {
  type: string;
  severity: AlertSeverity;
  message: string;
  context?: Record<string, unknown>;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly dedupe = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  async raise(payload: AlertPayload): Promise<void> {
    const cooldownMs = Number(process.env.ALERT_COOLDOWN_SECONDS || 300) * 1000;
    const dedupeKey = `${payload.type}:${payload.message}`;
    const now = Date.now();
    const expiresAt = this.dedupe.get(dedupeKey);

    if (expiresAt && expiresAt > now) {
      return;
    }
    this.dedupe.set(dedupeKey, now + cooldownMs);

    this.metricsService.observeAlert(payload.type, payload.severity);
    const line = `alert type=${payload.type} severity=${payload.severity} message="${payload.message}"`;
    if (payload.severity === 'critical') {
      this.logger.error(line);
    } else {
      this.logger.warn(line);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          action: `alert:${payload.type}`,
          targetType: 'system',
          targetId: payload.type,
          payload: {
            severity: payload.severity,
            message: payload.message,
            context: payload.context || {},
            timestamp: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(`alert_persist_failed type=${payload.type} reason=${(error as Error).message}`);
    }
  }

  async recentSummary(limit = 20) {
    const rows = await this.prisma.auditLog.findMany({
      where: { action: { startsWith: 'alert:' } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.action.replace('alert:', ''),
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
